/**
 * E2EE Manager
 * Orchestrates key generation, storage, exchange, and message encryption/decryption.
 *
 * Security features:
 * - X25519 ECDH key exchange for shared secret derivation
 * - Ed25519 identity signatures on ephemeral keys (MITM protection)
 * - TOFU (Trust On First Use) for peer identity verification
 * - XSalsa20-Poly1305 authenticated encryption
 * - Per-peer monotonic message counters (replay protection)
 */
import './polyfill'; // Must be first — sets PRNG before any nacl usage
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, decodeUTF8 } from 'tweetnacl-util';
import { generateKeyPair } from './keyGeneration';
import { keyStorage } from './keyStorage';
import { encrypt, decrypt } from './encryption';
import { computeSharedKey } from './keyExchange';
import {
  E2EEKeyPair,
  SigningKeyPair,
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
  private deviceId: string;
  private identityKeyPair: E2EEKeyPair | null = null;
  private signingKeyPair: SigningKeyPair | null = null;
  private sessions: Map<string, ActiveSession> = new Map();
  // Temporary storage for ephemeral keys during key exchange
  private static readonly MAX_PENDING_EXCHANGES = 20;
  private static readonly PENDING_EXCHANGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private pendingExchanges: Map<string, { keyPair: E2EEKeyPair; createdAt: number }> = new Map();
  // In-memory cache of trusted peer identity keys (TOFU)
  private trustedPeerKeys: Map<string, string> = new Map();

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  /** Initialize the manager: load or generate identity keys (DH + signing) */
  async initialize(): Promise<void> {
    // Load or generate X25519 DH key pair
    const stored = await keyStorage.getIdentityKeyPair();
    if (stored && this.isDHKeyValid(stored)) {
      this.identityKeyPair = stored;
    } else {
      if (stored) {
        console.warn('[E2EE] Stored DH keypair failed validation, regenerating');
        await keyStorage.deleteIdentityKeyPair();
      }
      this.identityKeyPair = generateKeyPair();
      await keyStorage.storeIdentityKeyPair(this.identityKeyPair);
    }

    // Load or generate Ed25519 signing key pair
    const storedSigning = await keyStorage.getSigningKeyPair();
    if (storedSigning && this.isSigningKeyValid(storedSigning)) {
      this.signingKeyPair = storedSigning;
    } else {
      if (storedSigning) {
        console.warn('[E2EE] Stored signing keypair failed validation, regenerating');
        await keyStorage.deleteSigningKeyPair();
      }
      const signKP = nacl.sign.keyPair();
      this.signingKeyPair = {
        publicKey: encodeBase64(signKP.publicKey),
        secretKey: encodeBase64(signKP.secretKey),
      };
      await keyStorage.storeSigningKeyPair(this.signingKeyPair);
    }
  }

  /** Validate a DH keypair by checking the public key derives from the private key */
  private isDHKeyValid(kp: E2EEKeyPair): boolean {
    try {
      const secretKey = decodeBase64(kp.privateKey);
      const derived = nacl.box.keyPair.fromSecretKey(secretKey);
      return encodeBase64(derived.publicKey) === kp.publicKey;
    } catch {
      return false;
    }
  }

  /** Validate a signing keypair by doing a sign/verify round-trip */
  private isSigningKeyValid(kp: SigningKeyPair): boolean {
    try {
      const testMessage = decodeUTF8('e2ee-key-validation-test');
      const secretKey = decodeBase64(kp.secretKey);
      const publicKey = decodeBase64(kp.publicKey);
      const signature = nacl.sign.detached(testMessage, secretKey);
      return nacl.sign.detached.verify(testMessage, signature, publicKey);
    } catch {
      return false;
    }
  }

  /** Get the public key (for uploading to server) */
  getPublicKey(): string | null {
    return this.identityKeyPair?.publicKey ?? null;
  }

  /** Get the signing public key */
  getSigningPublicKey(): string | null {
    return this.signingKeyPair?.publicKey ?? null;
  }

  /** Get the device ID this manager was initialized with */
  getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * Sign a key exchange payload with our Ed25519 identity key.
   */
  private signPayload(prefix: string, ephemeralPublicKey: string, recipientDeviceId?: string): string | undefined {
    if (!this.signingKeyPair) {
      return undefined;
    }
    const parts = [prefix, this.deviceId, ephemeralPublicKey];
    if (recipientDeviceId) parts.push(recipientDeviceId);
    const message = decodeUTF8(parts.join(':'));
    const secretKey = decodeBase64(this.signingKeyPair.secretKey);
    const signature = nacl.sign.detached(message, secretKey);

    return encodeBase64(signature);
  }

  /**
   * Verify a peer's signature on a key exchange payload (TOFU).
   * Throws on identity key mismatch or invalid signature.
   */
  private async verifyPeerSignature(
    peerId: string,
    identityPublicKey: string | undefined,
    signature: string | undefined,
    ephemeralPublicKey: string,
    prefix: string,
    recipientDeviceId?: string,
  ): Promise<void> {
    if (!identityPublicKey || !signature) {
      throw new Error(
        `E2EE: Peer ${peerId} sent UNSIGNED key exchange. ` +
        `Identity verification is required. Update the peer to the latest version.`
      );
    }

    // TOFU: check if we already trust a different key for this peer
    const trusted = await keyStorage.getTrustedPeerKey(peerId);
    if (trusted && trusted !== identityPublicKey) {
      throw new Error(
        `E2EE: IDENTITY KEY MISMATCH for device ${peerId}! ` +
        `Expected ${trusted.substring(0, 8)}... but got ${identityPublicKey.substring(0, 8)}... ` +
        `This could indicate a man-in-the-middle attack. Key exchange rejected.`
      );
    }

    // Verify the Ed25519 signature
    const parts = [prefix, peerId, ephemeralPublicKey];
    if (recipientDeviceId) parts.push(recipientDeviceId);
    const message = decodeUTF8(parts.join(':'));
    const sigBytes = decodeBase64(signature);
    const pubKeyBytes = decodeBase64(identityPublicKey);

    const valid = nacl.sign.detached.verify(message, sigBytes, pubKeyBytes);
    if (!valid) {
      throw new Error(
        `E2EE: INVALID SIGNATURE from device ${peerId}! ` +
        `The ephemeral key was not properly signed. Key exchange rejected.`
      );
    }

    // TOFU: trust this key if it's new
    if (!trusted) {
      await keyStorage.storeTrustedPeerKey(peerId, identityPublicKey);
    }
  }

  /**
   * Create a key exchange initiation to send to a remote device.
   * Signs the ephemeral key with our Ed25519 identity key.
   */
  /** Evict expired or excess pending key exchanges */
  private cleanupPendingExchanges(): void {
    const now = Date.now();
    for (const [deviceId, entry] of this.pendingExchanges) {
      if (now - entry.createdAt > E2EEManager.PENDING_EXCHANGE_TTL_MS) {
        this.pendingExchanges.delete(deviceId);
      }
    }
    while (this.pendingExchanges.size >= E2EEManager.MAX_PENDING_EXCHANGES) {
      const oldestKey = this.pendingExchanges.keys().next().value;
      if (oldestKey) this.pendingExchanges.delete(oldestKey);
      else break;
    }
  }

  createKeyExchangeInit(targetDeviceId: string): KeyExchangeInit {
    this.cleanupPendingExchanges();
    const ephemeral = generateKeyPair();
    this.pendingExchanges.set(targetDeviceId, { keyPair: ephemeral, createdAt: Date.now() });

    const signature = this.signPayload('KEY_EXCHANGE_INIT', ephemeral.publicKey);

    return {
      senderDeviceId: this.deviceId,
      ephemeralPublicKey: ephemeral.publicKey,
      identityPublicKey: this.signingKeyPair?.publicKey,
      signature,
    };
  }

  /**
   * Handle an incoming key exchange init from a remote device.
   * Verifies identity signature (TOFU), computes shared key, returns signed ack.
   * Now async due to TOFU key storage lookup.
   */
  async handleKeyExchangeInit(init: KeyExchangeInit): Promise<KeyExchangeAck> {
    // Verify peer's signature (TOFU)
    await this.verifyPeerSignature(
      init.senderDeviceId,
      init.identityPublicKey,
      init.signature,
      init.ephemeralPublicKey,
      'KEY_EXCHANGE_INIT',
    );

    const ephemeral = generateKeyPair();
    const sharedKey = computeSharedKey(ephemeral.privateKey, init.ephemeralPublicKey);

    this.sessions.set(init.senderDeviceId, {
      sharedKey,
      outgoingCounter: 0,
      lastReceivedCounter: -1,
    });

    // Sign our ack
    const signature = this.signPayload('KEY_EXCHANGE_ACK', ephemeral.publicKey, init.senderDeviceId);

    const ack = {
      senderDeviceId: this.deviceId,
      recipientDeviceId: init.senderDeviceId,
      ephemeralPublicKey: ephemeral.publicKey,
      identityPublicKey: this.signingKeyPair?.publicKey,
      signature,
    };
    return ack;
  }

  /**
   * Handle an incoming key exchange ack from a remote device.
   * Verifies identity signature (TOFU) and completes the key exchange.
   * Now async due to TOFU key storage lookup.
   */
  async handleKeyExchangeAck(ack: KeyExchangeAck): Promise<void> {
    const peerId = ack.senderDeviceId;
    const pendingEntry = this.pendingExchanges.get(peerId);
    if (!pendingEntry) {
      throw new Error(`E2EE: No pending key exchange for device ${peerId}`);
    }
    const pending = pendingEntry.keyPair;

    // Verify peer's signature (TOFU)
    await this.verifyPeerSignature(
      peerId,
      ack.identityPublicKey,
      ack.signature,
      ack.ephemeralPublicKey,
      'KEY_EXCHANGE_ACK',
      ack.recipientDeviceId,
    );

    const sharedKey = computeSharedKey(pending.privateKey, ack.ephemeralPublicKey);

    this.sessions.set(peerId, {
      sharedKey,
      outgoingCounter: 0,
      lastReceivedCounter: -1,
    });

    this.pendingExchanges.delete(peerId);
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
      senderDeviceId: this.deviceId,
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

    // SECURITY: Validate counter is a positive finite integer within safe bounds
    if (
      typeof message.messageCounter !== 'number' ||
      !Number.isFinite(message.messageCounter) ||
      !Number.isInteger(message.messageCounter) ||
      message.messageCounter < 1 ||
      message.messageCounter > Number.MAX_SAFE_INTEGER - 1
    ) {
      throw new Error('E2EE: Invalid message counter value');
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
