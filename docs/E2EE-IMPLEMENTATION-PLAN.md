# E2EE Implementation Plan (TDD)

> **Historical document.** E2EE has been fully implemented using NaCl (XSalsa20-Poly1305 + X25519) instead of the AES-256-GCM approach described here. See `docs/SECURITY.md` for the current implementation details.

**Approach:** Test-Driven Development - write tests first, then implement until tests pass.
**Scope:** ~~Basic E2EE (MVP) - X25519 key exchange + AES-256-GCM encryption.~~ Implemented with NaCl.

---

## Phase 1: Shared Crypto Types (All Repos)

### Task 1.1: Define E2EE TypeScript interfaces

**Files:**
- `forkoff/services/crypto/types.ts` (NEW)
- `forkoff-cli/src/crypto/types.ts` (NEW)
- `forkoff-api/src/crypto/dto/crypto.dto.ts` (NEW)

**Types needed:**
```typescript
// Shared across mobile + CLI
interface E2EEKeyPair {
  publicKey: string;       // Base64-encoded
  privateKey: string;      // Base64-encoded (NEVER sent to server)
}

interface EncryptedPayload {
  ciphertext: string;      // Base64
  nonce: string;           // Base64, 12 bytes
  authTag: string;         // Base64, 16 bytes
}

interface EncryptedMessage {
  senderDeviceId: string;
  recipientDeviceId: string;
  sessionId: string;
  payload: EncryptedPayload;
  messageCounter: number;
  timestamp: string;
}

interface SessionKeys {
  encryptionKey: Uint8Array;  // 32 bytes for AES-256
  sessionId: string;
}

interface KeyExchangeInit {
  senderDeviceId: string;
  ephemeralPublicKey: string; // Base64
}

interface KeyExchangeAck {
  recipientDeviceId: string;
  ephemeralPublicKey: string; // Base64
}
```

**Test:** TypeScript compilation only (type-level test).

---

## Phase 2: Mobile App Crypto Service

### Task 2.1: Key Generation Service (TDD)

**Test file:** `forkoff/__tests__/services/crypto/keyGeneration.test.ts`

**Tests to write FIRST:**
```
- generates X25519 key pair with 32-byte public key
- generates X25519 key pair with 32-byte private key
- generated keys are Base64-encoded strings
- public and private keys are different
- generates unique key pairs on each call
- key pair generation is deterministic when given seed (for testing)
```

**Implementation file:** `forkoff/services/crypto/keyGeneration.ts`

**Dependencies:** `expo-crypto` (already installed) + `tweetnacl` or `@noble/curves`

### Task 2.2: Key Storage Service (TDD)

**Test file:** `forkoff/__tests__/services/crypto/keyStorage.test.ts`

**Tests to write FIRST:**
```
- stores private key in secure store
- retrieves private key from secure store
- returns null when no key exists
- stores public key in secure store
- deletes keys from secure store
- stores session keys with device ID as key
- retrieves session keys by device ID
- handles secure store errors gracefully
```

**Implementation file:** `forkoff/services/crypto/keyStorage.ts`

**Dependencies:** `expo-secure-store` (already installed)

### Task 2.3: Encryption/Decryption Service (TDD)

**Test file:** `forkoff/__tests__/services/crypto/encryption.test.ts`

**Tests to write FIRST:**
```
- encrypts plaintext to EncryptedPayload
- decrypts EncryptedPayload back to original plaintext
- encrypt-decrypt round trip preserves message content
- encrypt-decrypt round trip preserves unicode/emoji
- encrypt-decrypt round trip preserves large messages (10KB)
- encrypted ciphertext is different from plaintext
- same plaintext produces different ciphertext (random nonce)
- decryption with wrong key fails
- decryption with tampered ciphertext fails
- decryption with tampered nonce fails
- decryption with tampered authTag fails
- nonce is 12 bytes
- authTag is 16 bytes
```

**Implementation file:** `forkoff/services/crypto/encryption.ts`

### Task 2.4: Key Exchange Service (TDD)

**Test file:** `forkoff/__tests__/services/crypto/keyExchange.test.ts`

**Tests to write FIRST:**
```
- computes shared secret from X25519 key exchange
- shared secret is same on both sides (Alice and Bob)
- derives session encryption key from shared secret
- derived key is 32 bytes (AES-256)
- different key pairs produce different shared secrets
```

**Implementation file:** `forkoff/services/crypto/keyExchange.ts`

### Task 2.5: E2EE Manager (Integration Service) (TDD)

**Test file:** `forkoff/__tests__/services/crypto/e2eeManager.test.ts`

**Tests to write FIRST:**
```
- initializes with stored keys if they exist
- generates new keys if none stored
- uploads public key to backend on initialization
- initiates key exchange with target device
- handles incoming key exchange init
- handles incoming key exchange ack
- encrypts outgoing messages
- decrypts incoming messages
- rejects messages with invalid counter (replay protection)
- increments message counter on send
- tracks active sessions by device ID
- cleans up session keys on disconnect
```

**Implementation file:** `forkoff/services/crypto/e2eeManager.ts`

---

## Phase 3: CLI Crypto Service

### Task 3.1: Key Generation (TDD)

**Test file:** `forkoff-cli/src/__tests__/crypto/keyGeneration.test.ts`

**Tests:** Same as Task 2.1 but using Node.js `crypto` module

**Implementation file:** `forkoff-cli/src/crypto/keyGeneration.ts`

### Task 3.2: Key Storage (TDD)

**Test file:** `forkoff-cli/src/__tests__/crypto/keyStorage.test.ts`

**Tests to write FIRST:**
```
- stores private key in OS keychain
- retrieves private key from OS keychain
- returns null when no key exists
- stores session keys in memory
- deletes keys from keychain
- falls back to encrypted file if keychain unavailable
```

**Implementation file:** `forkoff-cli/src/crypto/keyStorage.ts`

**Dependencies:** `keytar` (OS keychain access)

### Task 3.3: Encryption/Decryption (TDD)

**Test file:** `forkoff-cli/src/__tests__/crypto/encryption.test.ts`

**Tests:** Same as Task 2.3 but using Node.js `crypto` module

**Implementation file:** `forkoff-cli/src/crypto/encryption.ts`

### Task 3.4: Key Exchange (TDD)

**Test file:** `forkoff-cli/src/__tests__/crypto/keyExchange.test.ts`

**Tests:** Same as Task 2.4

**Implementation file:** `forkoff-cli/src/crypto/keyExchange.ts`

### Task 3.5: E2EE Manager (TDD)

**Test file:** `forkoff-cli/src/__tests__/crypto/e2eeManager.test.ts`

**Tests:** Same as Task 2.5 but adapted for CLI context

**Implementation file:** `forkoff-cli/src/crypto/e2eeManager.ts`

---

## Phase 4: Backend Changes

### Task 4.1: Device Public Key Storage (TDD)

**Test file:** `forkoff-api/src/crypto/__tests__/crypto.service.spec.ts`

**Tests to write FIRST:**
```
- stores public key for device
- retrieves public key for device
- updates public key (key rotation)
- returns null for device without key
- validates key format (Base64, correct length)
- rejects invalid key format
```

**Implementation files:**
- `forkoff-api/src/crypto/crypto.module.ts`
- `forkoff-api/src/crypto/crypto.service.ts`
- `forkoff-api/src/crypto/crypto.controller.ts`

**Prisma schema change:**
```prisma
model Device {
  // Add these fields:
  publicKeyX25519   String?   // X25519 public key for E2EE
  e2eeKeyVersion    Int       @default(0)  // 0 = no E2EE, 1+ = active
}
```

### Task 4.2: Encrypted Message Forwarding (TDD)

**Test file:** `forkoff-api/src/websocket/__tests__/encrypted-messaging.spec.ts`

**Tests to write FIRST:**
```
- forwards encrypted_message to correct recipient socket
- does not decrypt or modify the payload
- rejects messages without senderDeviceId
- rejects messages without recipientDeviceId
- handles offline recipient (stores for later)
- delivers stored messages when recipient comes online
- emits encrypted_key_exchange_init to recipient
- emits encrypted_key_exchange_ack to sender
```

**Implementation:** Modify `websocket.gateway.ts` to add 3 new event handlers:
- `encrypted_key_exchange_init` - Forward key exchange initiation
- `encrypted_key_exchange_ack` - Forward key exchange acknowledgment
- `encrypted_message` - Forward encrypted message blob

### Task 4.3: Public Key API Endpoints (TDD)

**Test file:** `forkoff-api/src/crypto/__tests__/crypto.controller.spec.ts`

**Tests to write FIRST:**
```
- PUT /devices/:id/public-key stores the key
- PUT /devices/:id/public-key requires authentication
- PUT /devices/:id/public-key validates key format
- GET /devices/:id/public-key returns the key
- GET /devices/:id/public-key returns 404 if no key
- GET /devices/:id/public-key requires authentication
- only device owner can update their own key
```

**Implementation:** Add endpoints to devices controller or new crypto controller

---

## Phase 5: WebSocket Integration

### Task 5.1: Mobile WebSocket E2EE Events (TDD)

**Test file:** `forkoff/__tests__/services/crypto/websocketIntegration.test.ts`

**Tests to write FIRST:**
```
- emits encrypted_key_exchange_init on session start
- handles incoming encrypted_key_exchange_init
- emits encrypted_key_exchange_ack after key derivation
- handles incoming encrypted_key_exchange_ack
- encrypts user_message before sending
- decrypts incoming claude_message
- falls back to plaintext if E2EE not established
- shows E2EE indicator when session is encrypted
```

**Implementation:** Modify `websocket.service.ts` to:
1. Add `encrypted_key_exchange_init`, `encrypted_key_exchange_ack`, `encrypted_message` events
2. Intercept `user_message` to encrypt before sending
3. Intercept incoming `encrypted_message` to decrypt before dispatching

### Task 5.2: CLI WebSocket E2EE Events (TDD)

**Test file:** `forkoff-cli/src/__tests__/crypto/websocketIntegration.test.ts`

**Tests:** Mirror of Task 5.1 from CLI perspective

**Implementation:** Modify CLI WebSocket client

### Task 5.3: E2EE Settings Store (TDD)

**Test file:** `forkoff/__tests__/stores/e2ee.store.test.ts`

**Tests to write FIRST:**
```
- default state has e2eeEnabled = false
- toggleE2EE updates state
- tracks encrypted sessions by device ID
- isSessionEncrypted returns correct status
- clearEncryptedSessions resets state
```

**Implementation file:** `forkoff/stores/e2ee.store.ts`

---

## Phase 6: Cross-Repo Integration Tests

### Task 6.1: End-to-End Encryption Flow Test

**Test:** Simulate full flow:
1. Mobile generates keys → uploads public key
2. CLI generates keys → uploads public key
3. Mobile initiates key exchange
4. CLI completes key exchange
5. Mobile encrypts message → sends
6. CLI receives → decrypts → verifies content matches

This is a manual integration test (documented steps).

---

## Execution Order

1. **Types** (Task 1.1) - Foundation
2. **Mobile crypto** (Tasks 2.1-2.4) - Core crypto functions with tests
3. **Mobile E2EE Manager** (Task 2.5) - Orchestration
4. **Mobile E2EE Store** (Task 5.3) - State management
5. **Mobile WebSocket** (Task 5.1) - Integration
6. **Backend schema + service** (Tasks 4.1-4.3) - Server support
7. **CLI crypto** (Tasks 3.1-3.5) - CLI implementation
8. **CLI WebSocket** (Task 5.2) - CLI integration
9. **Integration test** (Task 6.1) - Verify full flow

---

## Library Decisions

### Mobile (React Native):
- **`tweetnacl`** (recommended) - Pure JS, works in React Native, has X25519 + Ed25519
  - `tweetnacl` for key exchange (X25519 via `nacl.box`)
  - `tweetnacl` also provides `nacl.secretbox` for symmetric encryption (XSalsa20-Poly1305)
  - OR use `expo-crypto` for AES-256-GCM if available
- **`expo-secure-store`** (already installed) - Key storage

### CLI (Node.js):
- **Built-in `crypto`** module - X25519, AES-256-GCM, all natively supported
- **`keytar`** (optional) - OS keychain for key storage

### Backend (NestJS):
- No new crypto libraries needed - only stores/forwards encrypted blobs

---

## Success Criteria

- [ ] All crypto unit tests pass (mobile + CLI)
- [ ] All backend tests pass
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] Key generation produces valid X25519 key pairs
- [ ] Encrypt-decrypt round trip works across mobile ↔ CLI
- [ ] Backend forwards encrypted messages without decrypting
- [ ] Replay protection works (message counter)
- [ ] Tampered messages are rejected
- [ ] E2EE is opt-in (backward compatible with plaintext)
