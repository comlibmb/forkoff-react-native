/**
 * TDD Tests for Key Exchange Service
 * Tests X25519 Diffie-Hellman key exchange for E2EE session establishment.
 */
import { computeSharedKey } from '@/services/crypto/keyExchange';
import { generateKeyPair } from '@/services/crypto/keyGeneration';
import { encrypt, decrypt } from '@/services/crypto/encryption';
import nacl from 'tweetnacl';
import { decodeBase64 } from 'tweetnacl-util';

describe('Key Exchange', () => {
  it('should compute a shared key from two key pairs', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    const sharedKeyAlice = computeSharedKey(alice.privateKey, bob.publicKey);
    expect(sharedKeyAlice).toBeDefined();
    expect(sharedKeyAlice).toBeInstanceOf(Uint8Array);
  });

  it('should produce 32-byte shared key', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    const sharedKey = computeSharedKey(alice.privateKey, bob.publicKey);
    expect(sharedKey.length).toBe(32);
  });

  it('should produce same shared key on both sides (Alice and Bob)', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    const sharedKeyAlice = computeSharedKey(alice.privateKey, bob.publicKey);
    const sharedKeyBob = computeSharedKey(bob.privateKey, alice.publicKey);

    // Both sides should derive the same shared secret
    expect(Buffer.from(sharedKeyAlice).toString('hex'))
      .toBe(Buffer.from(sharedKeyBob).toString('hex'));
  });

  it('should produce different shared keys with different key pairs', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const charlie = generateKeyPair();

    const sharedAliceBob = computeSharedKey(alice.privateKey, bob.publicKey);
    const sharedAliceCharlie = computeSharedKey(alice.privateKey, charlie.publicKey);

    expect(Buffer.from(sharedAliceBob).toString('hex'))
      .not.toBe(Buffer.from(sharedAliceCharlie).toString('hex'));
  });

  it('should work with encrypt/decrypt round trip', () => {
    // Simulate full flow: key exchange then encryption
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    // Both derive same shared key
    const sharedKeyAlice = computeSharedKey(alice.privateKey, bob.publicKey);
    const sharedKeyBob = computeSharedKey(bob.privateKey, alice.publicKey);

    // Alice encrypts with her derived key
    const message = 'Hello from Alice!';
    const encrypted = encrypt(message, sharedKeyAlice);

    // Bob decrypts with his derived key (should be same)
    const decrypted = decrypt(encrypted, sharedKeyBob);
    expect(decrypted).toBe(message);
  });
});
