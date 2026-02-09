/**
 * TDD Tests for Key Generation Service
 * Tests X25519 key pair generation for E2EE.
 */
import { generateKeyPair } from '@/services/crypto/keyGeneration';
import { E2EEKeyPair } from '@/services/crypto/types';

describe('Key Generation', () => {
  it('should generate a valid E2EEKeyPair', () => {
    const keyPair = generateKeyPair();
    expect(keyPair).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
  });

  it('should generate Base64-encoded public key', () => {
    const keyPair = generateKeyPair();
    // Base64 regex: only valid Base64 chars
    expect(keyPair.publicKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should generate Base64-encoded private key', () => {
    const keyPair = generateKeyPair();
    expect(keyPair.privateKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should generate 32-byte public key (44 chars in Base64)', () => {
    const keyPair = generateKeyPair();
    const decoded = Buffer.from(keyPair.publicKey, 'base64');
    expect(decoded.length).toBe(32);
  });

  it('should generate 32-byte private key (44 chars in Base64)', () => {
    const keyPair = generateKeyPair();
    const decoded = Buffer.from(keyPair.privateKey, 'base64');
    expect(decoded.length).toBe(32);
  });

  it('should generate different public and private keys', () => {
    const keyPair = generateKeyPair();
    expect(keyPair.publicKey).not.toBe(keyPair.privateKey);
  });

  it('should generate unique key pairs on each call', () => {
    const keyPair1 = generateKeyPair();
    const keyPair2 = generateKeyPair();
    expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
    expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
  });

  it('should return an object conforming to E2EEKeyPair interface', () => {
    const keyPair: E2EEKeyPair = generateKeyPair();
    expect(typeof keyPair.publicKey).toBe('string');
    expect(typeof keyPair.privateKey).toBe('string');
  });
});
