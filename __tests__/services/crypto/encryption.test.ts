/**
 * TDD Tests for Encryption/Decryption Service
 * Tests NaCl secretbox (XSalsa20-Poly1305) encryption.
 */
import { encrypt, decrypt } from '@/services/crypto/encryption';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

describe('Encryption', () => {
  // Generate a shared key for testing
  const sharedKey = nacl.randomBytes(nacl.secretbox.keyLength);

  describe('encrypt', () => {
    it('should return an EncryptedPayload with ciphertext and nonce', () => {
      const result = encrypt('Hello, World!', sharedKey);
      expect(result.ciphertext).toBeDefined();
      expect(result.nonce).toBeDefined();
    });

    it('should produce Base64-encoded ciphertext', () => {
      const result = encrypt('test', sharedKey);
      expect(result.ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should produce Base64-encoded nonce', () => {
      const result = encrypt('test', sharedKey);
      expect(result.nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should produce 24-byte nonce', () => {
      const result = encrypt('test', sharedKey);
      const nonceBytes = Buffer.from(result.nonce, 'base64');
      expect(nonceBytes.length).toBe(24);
    });

    it('should produce ciphertext different from plaintext', () => {
      const plaintext = 'This is a secret message';
      const result = encrypt(plaintext, sharedKey);
      const ciphertextStr = Buffer.from(result.ciphertext, 'base64').toString('utf8');
      expect(ciphertextStr).not.toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random nonce)', () => {
      const plaintext = 'Same message';
      const result1 = encrypt(plaintext, sharedKey);
      const result2 = encrypt(plaintext, sharedKey);
      expect(result1.ciphertext).not.toBe(result2.ciphertext);
      expect(result1.nonce).not.toBe(result2.nonce);
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext back to original plaintext', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext, sharedKey);
      const decrypted = decrypt(encrypted, sharedKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode/emoji correctly', () => {
      const plaintext = 'Hello 🌍 Héllo wörld 你好';
      const encrypted = encrypt(plaintext, sharedKey);
      const decrypted = decrypt(encrypted, sharedKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext, sharedKey);
      const decrypted = decrypt(encrypted, sharedKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle large messages (10KB)', () => {
      const plaintext = 'A'.repeat(10240);
      const encrypted = encrypt(plaintext, sharedKey);
      const decrypted = decrypt(encrypted, sharedKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON payloads', () => {
      const payload = JSON.stringify({
        message: 'Hello from mobile',
        deviceId: 'abc-123',
        timestamp: Date.now(),
      });
      const encrypted = encrypt(payload, sharedKey);
      const decrypted = decrypt(encrypted, sharedKey);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(payload));
    });
  });

  describe('security', () => {
    it('should fail decryption with wrong key', () => {
      const encrypted = encrypt('secret', sharedKey);
      const wrongKey = nacl.randomBytes(nacl.secretbox.keyLength);
      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should fail decryption with tampered ciphertext', () => {
      const encrypted = encrypt('secret', sharedKey);
      // Flip a byte in the ciphertext
      const bytes = Buffer.from(encrypted.ciphertext, 'base64');
      bytes[0] ^= 0xff;
      const tampered = { ...encrypted, ciphertext: bytes.toString('base64') };
      expect(() => decrypt(tampered, sharedKey)).toThrow();
    });

    it('should fail decryption with tampered nonce', () => {
      const encrypted = encrypt('secret', sharedKey);
      const nonceBytes = Buffer.from(encrypted.nonce, 'base64');
      nonceBytes[0] ^= 0xff;
      const tampered = { ...encrypted, nonce: nonceBytes.toString('base64') };
      expect(() => decrypt(tampered, sharedKey)).toThrow();
    });
  });
});
