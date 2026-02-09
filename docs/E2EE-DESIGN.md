# End-to-End Encryption Design for ForkOff

**Status:** Design Phase - Not Implemented
**Created:** 2026-02-08
**Estimated Implementation:** 2-3 months

---

## Overview

**Goal:** Encrypt all conversation data between mobile app and CLI so the backend server cannot read message contents, only route encrypted payloads.

---

## 1. Cryptographic Architecture

### Algorithms
- **Symmetric encryption:** AES-256-GCM (fast, authenticated encryption)
- **Key exchange:** X25519 (Elliptic Curve Diffie-Hellman)
- **Digital signatures:** Ed25519 (verify message authenticity)
- **Key derivation:** HKDF-SHA256 (derive session keys)

### Why these choices?
- **AES-256-GCM:** Industry standard, hardware-accelerated on mobile, includes authentication
- **X25519:** Fast, secure, small key size (32 bytes), widely supported
- **Ed25519:** Pairs with X25519, fast signature verification
- **HKDF:** Generate multiple keys from one shared secret

---

## 2. Key Hierarchy

```
Device Identity Key Pair (long-term)
├─> Device Public Key (stored on server, shared with peers)
└─> Device Private Key (stored locally, never leaves device)

Session Key Agreement (per CLI session)
├─> Ephemeral Key Pair (generated per session)
├─> Shared Secret (via X25519 key exchange)
└─> Session Keys (derived from shared secret)
    ├─> Encryption Key (AES-256)
    ├─> MAC Key (message authentication)
    └─> Ratchet Root (for forward secrecy)
```

---

## 3. Key Management

### 3.1 Device Registration

**Mobile App:**
```typescript
// On first launch or after uninstall
1. Generate device identity key pair (Ed25519 + X25519)
2. Store private key in secure enclave (iOS Keychain, Android Keystore)
3. Upload public key to backend
4. Backend stores: { deviceId, publicKey, userId, createdAt }
```

**CLI:**
```typescript
// On pairing with mobile
1. Generate device identity key pair
2. Store private key in OS keychain
   - macOS: Keychain Access
   - Windows: Credential Manager
   - Linux: Secret Service API / encrypted file
3. Upload public key to backend during pairing
```

### 3.2 Key Storage

**Backend database:**
```prisma
model Device {
  id              String
  userId          String
  publicKey       String   // Ed25519 public key (hex or base64)
  publicKeyX25519 String   // X25519 public key for key exchange
  keyVersion      Int      @default(1)  // For key rotation
  // ... existing fields
}
```

**Local storage (never sent to server):**
- Mobile: iOS Keychain / Android Keystore (hardware-backed if available)
- CLI: OS-specific secure storage

---

## 4. Session Establishment Flow

### Step-by-step: Mobile → CLI session

```
┌─────────────┐                 ┌─────────────┐                 ┌─────────────┐
│  Mobile App │                 │   Backend   │                 │     CLI     │
└─────────────┘                 └─────────────┘                 └─────────────┘
       │                               │                               │
       │ 1. User taps device card      │                               │
       ├──────────────────────────────>│                               │
       │    GET /devices/:id/pubkey    │                               │
       │                               │                               │
       │<──────────────────────────────┤                               │
       │    { publicKeyX25519 }        │                               │
       │                               │                               │
       │ 2. Generate ephemeral keypair │                               │
       │ 3. Perform X25519(my_eph_priv, cli_pub)                      │
       │ 4. Derive session keys (HKDF) │                               │
       │                               │                               │
       ├──────────────────────────────>│──────────────────────────────>│
       │   WS: session_init_encrypted  │   Forward encrypted payload   │
       │   {                           │                               │
       │     ephemeralPublicKey,       │                               │
       │     encryptedSessionData,     │     4. Perform X25519         │
       │     signature                 │     5. Derive same session keys│
       │   }                           │     6. Decrypt session data   │
       │                               │                               │
       │<──────────────────────────────┤<──────────────────────────────┤
       │   WS: session_ack_encrypted   │                               │
       │                               │                               │
       │ ✅ Secure channel established │                               │
```

### Encrypted payload structure

```typescript
interface EncryptedMessage {
  senderDeviceId: string;        // Plaintext (for routing)
  recipientDeviceId: string;     // Plaintext (for routing)
  sessionId: string;             // Plaintext (for routing)

  ephemeralPublicKey?: string;   // Only in first message (session init)

  ciphertext: string;            // Base64 encoded
  nonce: string;                 // 12 bytes for AES-GCM, base64
  authTag: string;               // 16 bytes authentication tag, base64

  signature: string;             // Ed25519 signature of (ciphertext + nonce)
  messageCounter: number;        // Prevent replay attacks
}
```

---

## 5. Message Encryption Flow

### 5.1 Sending a message (Mobile → CLI)

```typescript
// Mobile app
function sendEncryptedMessage(plaintext: string, sessionId: string) {
  // 1. Get session encryption key
  const sessionKey = getSessionKey(sessionId);

  // 2. Generate random nonce (never reuse!)
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt with AES-256-GCM
  const { ciphertext, authTag } = aesGcmEncrypt({
    key: sessionKey.encryptionKey,
    plaintext: plaintext,
    nonce: nonce,
    additionalData: `${sessionId}:${messageCounter}`
  });

  // 4. Sign the encrypted message
  const signature = ed25519Sign({
    privateKey: deviceIdentityPrivateKey,
    message: ciphertext + nonce + authTag
  });

  // 5. Send via WebSocket
  socket.emit('encrypted_message', {
    senderDeviceId: myDeviceId,
    recipientDeviceId: targetDeviceId,
    sessionId: sessionId,
    ciphertext: base64(ciphertext),
    nonce: base64(nonce),
    authTag: base64(authTag),
    signature: base64(signature),
    messageCounter: messageCounter++
  });
}
```

### 5.2 Receiving a message (CLI)

```typescript
// CLI
function handleEncryptedMessage(msg: EncryptedMessage) {
  // 1. Verify signature
  const isValid = ed25519Verify({
    publicKey: senderPublicKey,
    signature: msg.signature,
    message: msg.ciphertext + msg.nonce + msg.authTag
  });

  if (!isValid) throw new Error('Invalid signature');

  // 2. Check message counter (prevent replay)
  if (msg.messageCounter <= lastMessageCounter) {
    throw new Error('Replay attack detected');
  }

  // 3. Decrypt with AES-256-GCM
  const plaintext = aesGcmDecrypt({
    key: sessionKey.encryptionKey,
    ciphertext: base64Decode(msg.ciphertext),
    nonce: base64Decode(msg.nonce),
    authTag: base64Decode(msg.authTag),
    additionalData: `${msg.sessionId}:${msg.messageCounter}`
  });

  // 4. Update counter
  lastMessageCounter = msg.messageCounter;

  return plaintext;
}
```

---

## 6. Backend Changes

### What backend CAN see:
- ✅ Sender device ID
- ✅ Recipient device ID
- ✅ Session ID
- ✅ Message timestamp
- ✅ Message size (ciphertext length)
- ✅ Message frequency/patterns

### What backend CANNOT see:
- ❌ Message content
- ❌ User prompts
- ❌ AI responses
- ❌ File contents
- ❌ Code changes

### Required backend changes:

```typescript
// New WebSocket events
socket.on('encrypted_message', async (payload: EncryptedMessage) => {
  // 1. Basic validation (routing fields present)
  if (!payload.recipientDeviceId || !payload.ciphertext) {
    return socket.emit('error', { message: 'Invalid payload' });
  }

  // 2. Find recipient socket
  const recipientSocket = findSocketByDeviceId(payload.recipientDeviceId);

  // 3. Forward encrypted blob (no decryption attempt)
  recipientSocket?.emit('encrypted_message', payload);

  // 4. Store encrypted message in database (optional)
  await prisma.encryptedMessage.create({
    data: {
      sessionId: payload.sessionId,
      senderDeviceId: payload.senderDeviceId,
      recipientDeviceId: payload.recipientDeviceId,
      encryptedBlob: JSON.stringify(payload), // Store as-is
      timestamp: new Date(),
      size: payload.ciphertext.length
    }
  });
});
```

### Database schema additions:

```prisma
model Device {
  // ... existing fields
  publicKey       String   // Ed25519 public signing key
  publicKeyX25519 String   // X25519 public encryption key
  keyVersion      Int      @default(1)  // For key rotation
}

model EncryptedMessage {
  id                String   @id @default(uuid())
  sessionId         String
  senderDeviceId    String
  recipientDeviceId String
  encryptedBlob     String   // JSON string of EncryptedMessage
  size              Int      // Ciphertext size in bytes
  timestamp         DateTime @default(now())

  @@index([sessionId])
  @@index([senderDeviceId])
  @@index([recipientDeviceId])
  @@map("encrypted_messages")
}
```

---

## 7. Forward Secrecy (Double Ratchet)

To achieve forward secrecy (past messages safe even if current key compromised), implement **Signal Protocol's Double Ratchet**:

### Simplified approach:

```typescript
// After every N messages (e.g., 100), ratchet forward
function ratchetSessionKey(currentKey: SessionKey) {
  // Derive new key from current key + random
  const newKey = hkdf({
    ikm: currentKey.ratchetRoot,
    salt: crypto.getRandomValues(new Uint8Array(32)),
    info: 'ratchet-forward',
    length: 32
  });

  // Delete old key (forward secrecy)
  securelyEraseKey(currentKey);

  return newKey;
}
```

**Benefit:** Even if attacker gets current session key, they can't decrypt previous messages.

---

## 8. Multi-Device Support

### Challenge: User has multiple CLIs paired

**Solution 1: Per-device encryption (simpler)**
- Each mobile → CLI connection has unique session keys
- User sends same message encrypted separately for each device
- Pro: Simple, devices can't decrypt each other's messages
- Con: Bandwidth overhead for multiple recipients

**Solution 2: Shared session key (complex)**
- All devices in a "group" share session key
- New device joining requires secure key distribution
- Pro: Efficient, one encrypted message for all
- Con: Complex key management, weaker isolation

**Recommendation:** Start with Solution 1

---

## 9. Migration Strategy

### Phase 1: Opt-in E2EE (backward compatible)
```typescript
// Backend supports both encrypted and plaintext
socket.on('message', handlePlaintextMessage);       // Legacy
socket.on('encrypted_message', handleEncrypted);    // New

// Mobile app settings
Settings > Privacy > Enable End-to-End Encryption (Beta)
```

### Phase 2: Graceful migration
```typescript
// Detect if peer supports E2EE
if (deviceSupportsE2EE(targetDeviceId)) {
  sendEncrypted(message);
} else {
  sendPlaintext(message);
  showWarning("This device doesn't support E2EE");
}
```

### Phase 3: Enforce E2EE
- After 6 months, deprecate plaintext
- Force upgrade or lose access

---

## 10. Edge Cases & Recovery

### Lost device private key
**Problem:** User reinstalls app, loses key in secure enclave
**Solution:**
```
1. Generate new device key pair
2. Re-pair with CLI (new key exchange)
3. Cannot decrypt old messages (true E2EE trade-off)
4. Option: Server-side encrypted backup with user password
```

### CLI offline during session init
**Problem:** Mobile sends ephemeral public key, CLI never receives
**Solution:**
```
1. Backend stores pending session_init messages (encrypted)
2. When CLI comes online, deliver backlog
3. Timeout after 24 hours
```

### Message order/duplicate detection
**Problem:** WebSocket delivers messages out of order
**Solution:**
```typescript
interface EncryptedMessage {
  messageCounter: number;  // Sequential counter
}

// Receiver buffers out-of-order messages
if (msg.messageCounter > expected) {
  buffer.push(msg);
} else if (msg.messageCounter === expected) {
  processMessage(msg);
  expected++;
  processBuffered();
}
```

---

## 11. Performance Impact

### Encryption overhead
- **AES-256-GCM:** ~10-50 microseconds per message (hardware-accelerated)
- **X25519 key exchange:** ~100-500 microseconds (once per session)
- **Ed25519 signing:** ~50-200 microseconds per message

### Battery impact
- Mobile: Negligible (<1% additional battery usage)
- Uses hardware crypto acceleration on modern devices

### Latency impact
- +0.5-2ms per message (encryption + decryption)
- Imperceptible to users

---

## 12. Implementation Complexity

### Component changes required:

**Mobile App (React Native):**
- ✅ Crypto library: `react-native-quick-crypto` or `expo-crypto`
- New: Key management service (200 LOC)
- New: Encryption service (300 LOC)
- Modified: WebSocket service (100 LOC changes)
- Modified: Message display (no change, decrypt before display)

**CLI (Node.js):**
- ✅ Crypto library: Node.js `crypto` module (built-in)
- New: Key management (150 LOC)
- New: Encryption service (250 LOC)
- Modified: WebSocket client (80 LOC changes)

**Backend (NestJS):**
- New: Public key storage (Prisma model + endpoints, 100 LOC)
- Modified: WebSocket gateway (200 LOC changes, mostly forwarding)
- New: Encrypted message storage (optional, 50 LOC)
- No decryption logic needed

**Total:** ~1,500 lines of new code across all components

---

## 13. Security Considerations

### Threat model: What we protect against
- ✅ Server compromise (messages stay encrypted)
- ✅ Database breach (encrypted blobs useless)
- ✅ Man-in-the-middle (TLS + E2EE double protection)
- ✅ Rogue employee access (can't read messages)
- ✅ Government subpoena for message content (have nothing to give)

### What we DON'T protect against
- ❌ Compromised device (malware can read before encryption)
- ❌ Physical device access (if screen unlocked)
- ❌ Screenshot/screen recording
- ❌ Metadata analysis (who talks to whom, when, how often)

### Audit recommendations
- Code audit by cryptography expert
- Penetration testing after implementation
- Bug bounty program for crypto vulnerabilities

---

## 14. Alternative: Simpler Approach

If full Double Ratchet is too complex, start with **basic E2EE**:

### Minimal viable E2EE:
1. ✅ Device identity keys (Ed25519 + X25519)
2. ✅ Per-session symmetric keys (AES-256-GCM)
3. ✅ Simple key exchange (X25519 ECDH)
4. ❌ Skip forward secrecy initially
5. ❌ Skip key ratcheting
6. ❌ No encrypted message history

**Benefit:** 50% less complexity, still protects against server compromise.

**Upgrade path:** Add forward secrecy in v2.0.

---

## 15. Implementation Phases

### Phase 1: MVP E2EE (4-6 weeks)
**Goal:** Basic encryption working for new sessions

**Tasks:**
1. Add crypto libraries to mobile & CLI
2. Implement key generation on device registration
3. Add public key fields to Device model
4. Create encryption/decryption services
5. Modify WebSocket to handle encrypted messages
6. Backend: Add encrypted message forwarding
7. Testing: Basic encryption flow works

**Deliverable:** Opt-in E2EE for beta users

### Phase 2: Forward Secrecy (2-3 weeks)
**Goal:** Add key ratcheting for forward secrecy

**Tasks:**
1. Implement HKDF key derivation
2. Add key ratcheting logic
3. Handle ratchet synchronization
4. Test key rotation scenarios

**Deliverable:** Full forward secrecy protection

### Phase 3: Production Hardening (3-4 weeks)
**Goal:** Ready for general availability

**Tasks:**
1. Security audit by external firm
2. Penetration testing
3. Performance optimization
4. Error handling & recovery flows
5. Migration tools for existing users
6. Documentation & user education

**Deliverable:** Production-ready E2EE

### Phase 4: Advanced Features (Optional, 2-3 weeks)
**Goal:** Enhanced UX and features

**Tasks:**
1. Encrypted backup with user password
2. Multi-device key synchronization
3. Key verification UI (safety numbers)
4. Encrypted file attachments
5. Encrypted code snippets

**Deliverable:** Full-featured E2EE system

---

## 16. Files to Create/Modify

### New Files

**Mobile (forkoff/):**
- `services/crypto/keyManagement.service.ts` - Key generation, storage, retrieval
- `services/crypto/encryption.service.ts` - Encrypt/decrypt messages
- `services/crypto/types.ts` - TypeScript interfaces
- `utils/crypto.ts` - Crypto helpers (base64, etc.)

**CLI (forkoff-cli/):**
- `src/crypto/keyManagement.ts` - Key management
- `src/crypto/encryption.ts` - Encryption service
- `src/crypto/types.ts` - Type definitions

**Backend (forkoff-api/):**
- `src/crypto/crypto.module.ts` - NestJS module
- `src/crypto/crypto.controller.ts` - Public key endpoints
- `src/crypto/crypto.service.ts` - Key storage service
- `src/crypto/dto/` - DTOs for key exchange

### Modified Files

**Mobile:**
- `services/websocket.service.ts` - Add encrypted message handling
- `stores/settings.store.ts` - Add E2EE toggle
- `app/settings/privacy.tsx` - E2EE settings UI

**CLI:**
- `src/websocket/client.ts` - Add encrypted message support
- `src/pairing.ts` - Upload public key during pairing

**Backend:**
- `src/websocket/websocket.gateway.ts` - Forward encrypted messages
- `prisma/schema.prisma` - Add crypto fields to Device model
- `src/devices/devices.service.ts` - Store/retrieve public keys

---

## 17. Testing Strategy

### Unit Tests
- Key generation produces valid keypairs
- Encryption/decryption round-trip works
- Signature verification catches tampering
- Message counter prevents replay attacks

### Integration Tests
- End-to-end encryption flow (mobile → backend → CLI)
- Key exchange handshake
- Multiple sessions simultaneously
- Session recovery after disconnect

### Security Tests
- Modified ciphertext rejected
- Invalid signatures rejected
- Replay attacks blocked
- Forward secrecy verified (old keys can't decrypt new messages)

### Performance Tests
- Encryption latency < 2ms per message
- Battery drain < 1% over 1000 messages
- Memory usage reasonable (< 10MB for crypto)

---

## 18. Documentation Needed

### Developer Docs
- Architecture overview
- Crypto library setup instructions
- Key management API reference
- WebSocket protocol changes
- Database migration guide

### User Docs
- "What is E2EE?" explainer
- How to enable E2EE
- What happens if you lose your device
- Multi-device pairing guide
- Troubleshooting

### Security Docs
- Threat model
- Cryptographic primitives used
- Key rotation policy
- Incident response plan
- Security audit reports

---

## Summary

### Recommended Approach:
1. **Phase 1 (MVP):** Basic E2EE with X25519 key exchange + AES-256-GCM
2. **Phase 2 (Enhanced):** Add forward secrecy with key ratcheting
3. **Phase 3 (Complete):** Full Signal Protocol implementation

### Estimated Timeline:
- **Design & crypto library selection:** 1 week
- **Backend changes:** 1 week
- **Mobile implementation:** 2 weeks
- **CLI implementation:** 1 week
- **Testing & bug fixes:** 2 weeks
- **Security audit:** 2-4 weeks
- **Total:** 2-3 months for production-ready E2EE

### Cost-Benefit Analysis:

**Costs:**
- 2-3 months engineering time
- Ongoing complexity in debugging
- Cannot implement server-side search/analysis
- Support burden (lost keys, migration issues)
- Security audit costs ($10k-$30k)

**Benefits:**
- Premium privacy feature for marketing
- Protection against server compromise
- Competitive advantage over other dev tools
- User trust & credibility
- Potential requirement for enterprise customers

### Decision Factors:

**Implement E2EE if:**
- Target users are privacy-conscious developers
- Planning enterprise/team features
- Want premium positioning
- Can dedicate 2-3 months to implementation

**Skip E2EE if:**
- Need rapid iteration on server-side features
- Limited engineering resources
- TLS encryption is "good enough" for your market
- Want to keep things simple

---

## Next Steps

1. **Decision:** Get stakeholder buy-in (implement E2EE or not?)
2. **Library Selection:** Choose crypto libraries for React Native, Node.js
3. **Prototype:** 1-week spike to prove key exchange works
4. **Security Review:** Get design reviewed by crypto expert
5. **Plan Mode:** Use this document to implement Phase 1

---

**Ready to implement? Use this document as your implementation plan in plan mode.**

**Questions or adjustments needed? Update this document before starting implementation.**
