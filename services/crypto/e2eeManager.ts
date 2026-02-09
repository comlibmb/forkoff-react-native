/**
 * E2EE Manager
 * Orchestrates key generation, storage, exchange, and message encryption/decryption.
 */
import { generateKeyPair } from './keyGeneration';
import { keyStorage } from './keyStorage';
import { encrypt, decrypt } from './encryption';
import { computeSharedKey } from './keyExchange';
import {
  E2EEKeyPair,
  EncryptedMessage,
  KeyExchangeInit,
  KeyExchangeAck,
} from './types';

interface ActiveSession {
  sharedKey: Uint8Array;
  outgoingCounter: number;
  lastReceivedCounter: number;
}

export class E2EEManager {
  private identityKeyPair: E2EEKeyPair | null = null;
  private sessions: Map<string, ActiveSession> = new Map();
  // Temporary storage for ephemeral keys during key exchange
  private pendingExchanges: Map<string, E2EEKeyPair> = new Map();

  /** Initialize the manager: load or generate identity keys */
  async initialize(): Promise<void> {
    const stored = await keyStorage.getIdentityKeyPair();
    if (stored) {
      this.identityKeyPair = stored;
    } else {
      this.identityKeyPair = generateKeyPair();
      await keyStorage.storeIdentityKeyPair(this.identityKeyPair);
    }
  }

  /** Get the public key (for uploading to server) */
  getPublicKey(): string | null {
    return this.identityKeyPair?.publicKey ?? null;
  }

  /**
   * Create a key exchange initiation to send to a remote device.
   * Generates an ephemeral key pair and stores it for later completion.
   */
  createKeyExchangeInit(targetDeviceId: string): KeyExchangeInit {
    const ephemeral = generateKeyPair();
    this.pendingExchanges.set(targetDeviceId, ephemeral);

    return {
      senderDeviceId: targetDeviceId, // Will be overridden by caller with actual sender ID
      ephemeralPublicKey: ephemeral.publicKey,
    };
  }

  /**
   * Handle an incoming key exchange init from a remote device.
   * Computes the shared key and returns an ack with our ephemeral public key.
   */
  handleKeyExchangeInit(init: KeyExchangeInit): KeyExchangeAck {
    const ephemeral = generateKeyPair();
    const sharedKey = computeSharedKey(ephemeral.privateKey, init.ephemeralPublicKey);

    this.sessions.set(init.senderDeviceId, {
      sharedKey,
      outgoingCounter: 0,
      lastReceivedCounter: -1,
    });

    return {
      recipientDeviceId: init.senderDeviceId,
      ephemeralPublicKey: ephemeral.publicKey,
    };
  }

  /**
   * Handle an incoming key exchange ack from a remote device.
   * Completes the key exchange by computing the shared key.
   */
  handleKeyExchangeAck(ack: KeyExchangeAck): void {
    const pending = this.pendingExchanges.get(ack.recipientDeviceId);
    if (!pending) {
      throw new Error(`E2EE: No pending key exchange for device ${ack.recipientDeviceId}`);
    }

    const sharedKey = computeSharedKey(pending.privateKey, ack.ephemeralPublicKey);

    this.sessions.set(ack.recipientDeviceId, {
      sharedKey,
      outgoingCounter: 0,
      lastReceivedCounter: -1,
    });

    this.pendingExchanges.delete(ack.recipientDeviceId);
  }

  /** Check if an encrypted session is established with a device */
  isSessionEstablished(deviceId: string): boolean {
    return this.sessions.has(deviceId);
  }

  /** Encrypt a message for a specific device */
  encryptMessage(
    plaintext: string,
    recipientDeviceId: string,
    sessionId: string,
  ): EncryptedMessage {
    const session = this.sessions.get(recipientDeviceId);
    if (!session) {
      throw new Error(`E2EE: No session established with device ${recipientDeviceId}`);
    }

    const payload = encrypt(plaintext, session.sharedKey);
    session.outgoingCounter++;

    return {
      senderDeviceId: '', // Caller should set this
      recipientDeviceId,
      sessionId,
      payload,
      messageCounter: session.outgoingCounter,
      timestamp: new Date().toISOString(),
    };
  }

  /** Decrypt an incoming encrypted message */
  decryptMessage(message: EncryptedMessage, senderDeviceId: string): string {
    const session = this.sessions.get(senderDeviceId);
    if (!session) {
      throw new Error(`E2EE: No session established with device ${senderDeviceId}`);
    }

    // Replay protection
    if (message.messageCounter <= session.lastReceivedCounter) {
      throw new Error('E2EE: Replay attack detected - message counter too low');
    }

    const plaintext = decrypt(message.payload, session.sharedKey);
    session.lastReceivedCounter = message.messageCounter;
    return plaintext;
  }

  /** Clear session for a specific device */
  clearSession(deviceId: string): void {
    this.sessions.delete(deviceId);
    this.pendingExchanges.delete(deviceId);
  }

  /** Clear all active sessions */
  clearAllSessions(): void {
    this.sessions.clear();
    this.pendingExchanges.clear();
  }
}
