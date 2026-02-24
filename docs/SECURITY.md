# ForkOff Security Whitepaper

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Living document -- updated as the implementation evolves

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [End-to-End Encryption (E2EE)](#end-to-end-encryption-e2ee)
   - [Key Exchange](#key-exchange)
   - [Message Encryption](#message-encryption)
   - [Identity & Trust (TOFU)](#identity--trust-tofu)
   - [Replay Protection](#replay-protection)
   - [Session Management](#session-management)
4. [Relay Blindness: What the Server Can and Cannot See](#relay-blindness-what-the-server-can-and-cannot-see)
5. [Enforced Encryption Coverage](#enforced-encryption-coverage)
6. [Inbound Enforcement & Event Whitelisting](#inbound-enforcement--event-whitelisting)
7. [Key Storage](#key-storage)
8. [Transport Security](#transport-security)
9. [PRNG & Randomness](#prng--randomness)
10. [Threat Model](#threat-model)
11. [Deliberate Design Decisions](#deliberate-design-decisions)
12. [Compliance Mapping](#compliance-mapping)
13. [Known Limitations & Roadmap](#known-limitations--roadmap)
14. [Responsible Disclosure](#responsible-disclosure)

---

## Overview

ForkOff is a mobile app and CLI toolchain that lets developers control AI coding sessions (Claude Code) on their laptop from their phone. The communication path is:

```
Mobile App  <-->  API Relay Server  <-->  CLI (on developer's machine)
```

The relay server exists solely to route WebSocket messages between the mobile app and the CLI. By design, the relay server **never sees plaintext session data**. All sensitive payloads are encrypted end-to-end between the mobile app and the CLI before reaching the relay.

This document describes the cryptographic design, threat model, and security properties of ForkOff's E2EE implementation.

---

## Architecture & Data Flow

```
+----------------+          +------------------+          +----------------+
|   Mobile App   |  <-wss-> |   API Relay      |  <-wss-> |   CLI Tool     |
|  (React Native)|          |  (NestJS/AWS)    |          |  (Node.js)     |
+----------------+          +------------------+          +----------------+
        |                          |                             |
   E2EE Encrypt              Opaque Blob                   E2EE Decrypt
   E2EE Decrypt              Forwarding                    E2EE Encrypt
        |                          |                             |
   Ed25519 Signing           No Key Access               Ed25519 Signing
   X25519 ECDH                                            X25519 ECDH
   TOFU Key Pinning                                       TOFU Key Pinning
```

The relay server handles:
- WebSocket connection management and room-based routing
- Device pairing code matching
- Push notification delivery
- Session lifecycle metadata (device online/offline)

The relay server does **not** handle:
- Key exchange negotiation (it forwards opaque key exchange messages)
- Decryption of any payload
- Storage of any cryptographic keys
- Inspection of event types or message content (when E2EE is active)

---

## End-to-End Encryption (E2EE)

ForkOff's E2EE is built on [TweetNaCl](https://tweetnacl.js.org/) (a JavaScript port of Daniel J. Bernstein's NaCl library), providing a well-analyzed, misuse-resistant cryptographic API.

### Key Exchange

**Algorithm:** X25519 Elliptic Curve Diffie-Hellman (ECDH) with ephemeral key pairs.

Each time a CLI and mobile app connect, a fresh X25519 key pair is generated on each side. Neither side reuses ephemeral keys across sessions.

**Protocol flow:**

```
CLI                              Relay                           Mobile
 |                                 |                                |
 |  encrypted_key_exchange_init    |                                |
 |  { ephemeralPubKey,             |   (forwards opaque blob)       |
 |    identityPubKey,              | -----------------------------> |
 |    signature }                  |                                |
 |                                 |                                |
 |                                 |   encrypted_key_exchange_ack   |
 |                                 |   { ephemeralPubKey,           |
 |   (forwards opaque blob)        |     identityPubKey,           |
 | <------------------------------ |     signature }                |
 |                                 |                                |
 |  Both sides now compute:        |                                |
 |  sharedKey = nacl.box.before(   |                                |
 |    theirEphemeralPub,           |                                |
 |    myEphemeralPrivate)          |                                |
```

**Shared secret derivation:** `nacl.box.before()` performs X25519 ECDH followed by HSalsa20 key derivation, producing a 32-byte symmetric key suitable for NaCl secretbox encryption.

**HKDF key derivation** (implemented): HKDF-SHA256 will derive separate directional send/receive keys from the ECDH output, preventing key reuse across directions.

### Message Encryption

**Algorithm:** XSalsa20-Poly1305 authenticated encryption (NaCl `secretbox`).

- **Cipher:** XSalsa20 stream cipher (256-bit key, 192-bit nonce)
- **MAC:** Poly1305 message authentication code (128-bit tag)
- **Nonce:** 24 bytes of cryptographically random data, generated fresh per message via `nacl.randomBytes(24)`
- **Key:** 32-byte shared secret from the ECDH key exchange

Each message is encrypted as:

```typescript
// Encryption (sender)
const nonce = nacl.randomBytes(24);           // Fresh random nonce
const ciphertext = nacl.secretbox(            // XSalsa20-Poly1305
  plaintextBytes, nonce, sharedKey
);
// Transmitted: { ciphertext (base64), nonce (base64) }

// Decryption (recipient)
const plaintext = nacl.secretbox.open(
  ciphertext, nonce, sharedKey
);
// Returns null if MAC verification fails (tampered or wrong key)
```

The Poly1305 MAC is computed over the ciphertext and verified before decryption. If the MAC check fails (indicating tampering, corruption, or a wrong key), `secretbox.open` returns `null` and decryption is rejected. This provides both **confidentiality** and **integrity/authentication** in a single operation.

### Identity & Trust (TOFU)

**Algorithm:** Ed25519 digital signatures for identity verification.

ForkOff uses Trust On First Use (TOFU) to establish device identity. Each device generates a long-lived Ed25519 signing key pair on first initialization. During key exchange, each side signs its ephemeral public key with its Ed25519 identity key:

```
Signed payload (init):  "KEY_EXCHANGE_INIT:senderDeviceId:ephemeralPublicKey"
Signed payload (ack):   "KEY_EXCHANGE_ACK:senderDeviceId:ephemeralPublicKey:recipientDeviceId"
```

The signature verification process:

1. **First contact:** The peer's Ed25519 identity public key is stored (pinned) in secure storage.
2. **Subsequent contacts:** The presented identity key is compared against the pinned key.
3. **Key mismatch:** If a peer presents a different identity key than what was previously pinned, the key exchange is **rejected** with an explicit error: `"IDENTITY KEY MISMATCH... This could indicate a man-in-the-middle attack."`.
4. **Invalid signature:** If the Ed25519 signature does not verify, the key exchange is **rejected**.
5. **Missing signature:** If a peer sends an unsigned key exchange (e.g., an outdated client), the exchange is **rejected** with a message requiring the peer to update.

This prevents a man-in-the-middle from substituting their own ephemeral keys during the exchange, since they cannot produce a valid signature under the legitimate peer's Ed25519 identity key.

### Replay Protection

Each encrypted session maintains **per-peer monotonic message counters**:

- **Outgoing counter:** Starts at 0, incremented by 1 for each message sent. Transmitted as `messageCounter` in every encrypted message.
- **Incoming counter:** Tracks the highest counter value received from the peer. Initialized to -1 (no messages received).

**Validation rules (enforced on every incoming message):**

| Check | Condition | Failure mode |
|-------|-----------|--------------|
| Type | `typeof counter === 'number'` | Rejected |
| Finite | `Number.isFinite(counter)` | Rejected |
| Integer | `Number.isInteger(counter)` | Rejected |
| Positive | `counter >= 1` | Rejected |
| Upper bound | `counter < Number.MAX_SAFE_INTEGER - 1` | Rejected |
| Monotonic | `counter > lastReceivedCounter` | Rejected (replay attack) |

A message with a counter equal to or less than the last received counter is dropped with an explicit replay attack warning. This prevents an attacker (or the relay) from re-delivering captured ciphertext.

### Session Management

Each E2EE session is scoped to a single connection between one mobile device and one CLI instance:

- **Ephemeral keys:** A fresh X25519 key pair is generated for each session. Compromising a session key does not reveal keys from other sessions.
- **Session expiry** (implemented): Sessions will expire after **24 hours** or **10,000 messages**, whichever comes first. Expired sessions force a full re-keying (new ECDH exchange).
- **Pending exchange limits:** A maximum of 20 pending (incomplete) key exchanges are tracked, with a 5-minute TTL. This prevents resource exhaustion from incomplete handshakes.
- **Duplicate exchange protection:** If a key exchange init arrives for a peer that already has an established session or a pending exchange, it is silently ignored. This prevents race conditions from relay message re-delivery.
- **Session teardown:** On disconnect, all sessions and pending exchanges are cleared. The `_anyE2EESessionEstablished` flag is reset, re-enabling plaintext fallback for the next connection.

---

## Relay Blindness: What the Server Can and Cannot See

When E2EE is active, the API relay server is intentionally blind to application data. Here is exactly what the relay can and cannot observe:

| Visible to Relay | NOT Visible to Relay |
|---|---|
| `senderDeviceId` (opaque UUID) | Event type (encrypted inside payload) |
| `recipientDeviceId` (opaque UUID) | Message content |
| `messageCounter` (integer) | Session keys or ephemeral keys |
| `timestamp` (ISO string) | File paths, directories, code |
| `sessionId` (opaque string) | Approval decisions |
| Encrypted blob (base64 ciphertext + nonce) | Permission rules |
| Connection metadata (IP, socket ID) | User prompts or AI responses |
| | Tool inputs/outputs |
| | Terminal commands |
| | Any payload data whatsoever |

The relay sees only the **envelope** (who is talking to whom, when, and the message sequence number) and an opaque encrypted blob. The event type itself is encrypted inside the payload, so the relay cannot even distinguish a "user_message" from a "permission_response".

---

## Enforced Encryption Coverage

When E2EE is active, **24 sensitive outbound event types** are automatically routed through encryption. The application code does not need to opt in -- the WebSocket service intercepts these events and encrypts them transparently:

**Outbound (Mobile to CLI):**

| Event | Contains |
|-------|----------|
| `user_message` | User prompts to Claude |
| `permission_response` | Approval/denial of tool use |
| `claude_approval_response` | Yes/no/plan responses |
| `approval_response` | Code change approvals |
| `claude_resume_session` | Session resume with context |
| `claude_start_session` | New session parameters |
| `claude_stop_session` | Session termination |
| `terminal_command` | Shell commands |
| `terminal_create` | Terminal creation with working directory |
| `terminal_resize` | Terminal dimensions |
| `terminal_close` | Terminal teardown |
| `directory_list` | Directory path requests |
| `read_file` | File path requests |
| `transcript_fetch` | Transcript requests |
| `transcript_subscribe` | Transcript subscription |
| `transcript_unsubscribe` | Transcript unsubscription |
| `permission_rules_sync` | Tool permission rule configuration |
| `session_settings_update` | Session settings (unrestricted mode, etc.) |
| `transcript_subscribe_sdk` | SDK transcript subscription |
| `tab_complete` | Tab completion requests |
| `sdk_session_history` | Session history requests |
| `claude_abort` | Abort current operation |
| `usage_stats_request` | Usage data requests |

If encryption fails for any reason, the event falls back to plaintext delivery so the application remains functional. This fallback is logged for debugging.

---

## Inbound Enforcement & Event Whitelisting

ForkOff implements two layers of inbound security to prevent event injection:

### Plaintext Rejection

When E2EE has been established (`_anyE2EESessionEstablished` flag), inbound events matching the `ENFORCED_INBOUND_EVENTS` set are **silently dropped** if they arrive as plaintext. Only the decrypted versions (arriving through the `encrypted_message` channel) are trusted.

This prevents an attacker who has compromised the relay from injecting fake `terminal_output`, `permission_prompt`, or other sensitive events. The set covers 28 peer-originated event types.

### Encrypted Event Whitelist

When an encrypted message is decrypted, its inner `_event` field is checked against the `ALLOWED_ENCRYPTED_EVENTS` whitelist. Events not on this list are dropped. This prevents a compromised CLI from injecting infrastructure events (e.g., `connected`, `error`, `pair_device_ack`) through the E2EE channel.

Only legitimate application events that the CLI would normally produce are allowed through decryption.

---

## Key Storage

Cryptographic keys are stored using platform-appropriate secure storage:

| Platform | Storage Backend | Protection |
|----------|----------------|------------|
| **iOS (Mobile)** | `expo-secure-store` backed by iOS Keychain Services | Hardware-backed Secure Enclave, encrypted at rest, access-controlled per app |
| **Android (Mobile)** | `expo-secure-store` backed by Android Keystore | Hardware-backed keystore, encrypted at rest, per-app sandbox |
| **macOS (CLI)** | macOS Keychain | System keychain, encrypted at rest, user login required |
| **Windows (CLI)** | Windows Credential Manager | DPAPI-encrypted, tied to user account |
| **Linux (CLI)** | `libsecret` (GNOME Keyring / KWallet) | Desktop keyring, encrypted at rest |

**What is stored:**

- **Ed25519 identity key pair** (long-lived, survives app restarts): Used for TOFU identity verification during key exchange.
- **Ed25519 signing key pair** (long-lived): Used to sign ephemeral keys during key exchange.
- **Trusted peer identity keys** (long-lived, per device): Pinned Ed25519 public keys for TOFU verification.
- **Session keys** (optional persistence on CLI): The CLI may persist encrypted session keys to disk; on mobile, session keys are memory-only and cleared on disconnect.

**What is NOT stored:**

- Ephemeral X25519 private keys are never persisted. They exist only in memory for the duration of a session.
- Shared secrets derived from ECDH are never persisted on mobile. They exist only in the `ActiveSession` in-memory map.
- Plaintext message content is never written to disk.

---

## Transport Security

In addition to E2EE at the application layer, all network communication uses TLS:

- **Production WebSocket:** `wss://` (TLS 1.2+) is enforced. The service explicitly upgrades `ws://` URLs to `wss://` for non-local addresses in production builds.
- **Development exception:** `ws://` is allowed only for `localhost`, `127.0.0.1`, and private IP ranges (`192.168.*`, `10.*`, `172.*`) in development builds.
- **Certificate validation:** Standard platform TLS certificate validation applies (system trust store).
- **Custom relay URLs:** When users configure a self-hosted relay, `wss://` is still enforced for non-local addresses in production.

This provides a **double encryption layer**: TLS protects the connection from network-level eavesdroppers, while E2EE protects the payload from the relay server itself.

---

## PRNG & Randomness

Cryptographic randomness is critical for key generation and nonce production. ForkOff addresses this across platforms:

- **React Native (Hermes engine):** The Hermes JavaScript engine lacks `crypto.getRandomValues`. ForkOff injects a polyfill using `expo-crypto` (which delegates to the platform's native CSPRNG) as TweetNaCl's PRNG **before any NaCl usage**.
- **Node.js (CLI):** Uses Node's built-in `crypto.randomBytes`, which delegates to the OS CSPRNG (`/dev/urandom` on Linux/macOS, `CryptGenRandom` on Windows).

The polyfill is loaded as the first import in all crypto modules to ensure no NaCl operation ever runs with an uninitialized or weak PRNG:

```typescript
// polyfill.ts — loaded before any nacl usage
import nacl from 'tweetnacl';
import * as ExpoCrypto from 'expo-crypto';

nacl.setPRNG((x: Uint8Array, n: number) => {
  const bytes = ExpoCrypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) x[i] = bytes[i];
});
```

---

## Threat Model

### Compromised Relay Server

**Threat:** An attacker gains full control of the API relay server.

**Mitigation:** The relay only sees encrypted blobs, device IDs, counters, and timestamps. The attacker cannot:
- Read message content, event types, or payloads
- Inject fake events (inbound plaintext is dropped when E2EE is established)
- Forge encrypted messages (requires the shared key, which never touches the relay)
- Replay messages (monotonic counter validation rejects duplicates)
- Tamper with messages (Poly1305 MAC detects any modification)

**Residual risk:** The attacker can observe metadata (which devices communicate, when, and how often) and can deny service by dropping or delaying messages.

### Network Eavesdropper

**Threat:** An attacker on the same network intercepts traffic between a device and the relay.

**Mitigation:** Two layers of encryption:
1. **TLS** (wss://) encrypts the WebSocket connection, preventing eavesdropping on the wire.
2. **E2EE** encrypts the application payload, so even if TLS were somehow broken, the attacker sees only ciphertext.

**Residual risk:** Traffic analysis (message sizes and timing) could reveal communication patterns.

### Man-in-the-Middle During Pairing

**Threat:** An attacker intercepts the key exchange and substitutes their own ephemeral keys.

**Mitigation:**
- Each side signs its ephemeral public key with its Ed25519 identity key.
- The signature covers `prefix:senderDeviceId:ephemeralPublicKey[:recipientDeviceId]`, binding the ephemeral key to a specific identity and exchange direction.
- TOFU key pinning detects if a previously known device presents a different identity key.
- Pairing requires a short code exchanged via QR scan or manual entry (physical proximity).

**Residual risk:** The very first pairing (before any key is pinned) relies on the pairing code for authentication. An attacker who intercepts the pairing code AND controls the network could theoretically MITM the first connection. This is mitigated by the physical proximity requirement of QR code scanning.

### Replay Attacks

**Threat:** An attacker captures an encrypted message and re-sends it.

**Mitigation:** Per-peer monotonic counters. Each message carries a strictly increasing counter. The recipient tracks the highest counter seen and rejects any message with a counter less than or equal to it. Counter validation includes type checks, finiteness checks, integer checks, positivity checks, and upper bound checks.

**Residual risk:** None for exact replay. An attacker cannot reorder messages (messages with out-of-order counters that are still higher than the last seen will be accepted, but will increment the counter floor, causing the "skipped" messages to be rejected if they arrive later).

### Stolen Device

**Threat:** An attacker gains physical access to a mobile device or developer laptop.

**Mitigation:**
- Cryptographic keys are stored in the OS secure keychain, which is encrypted at rest and requires device unlock (biometric or passcode) to access.
- Ephemeral session keys exist only in memory and are lost when the app is closed or the session disconnects.
- Session expiry (24h / 10k messages, being added) limits the window of exposure.

**Residual risk:** If the attacker can unlock the device, they can access the secure keychain and extract identity keys. This would allow them to impersonate the device in future key exchanges. Mitigation: users should remotely unpair compromised devices, which invalidates the relay-level routing.

### Key Compromise

**Threat:** An attacker obtains the shared session key for an active session.

**Mitigation:**
- **Forward secrecy:** Ephemeral X25519 key pairs are generated per session. Compromising long-term Ed25519 identity keys does NOT reveal past session keys (the identity keys are only used for signing, not for deriving shared secrets).
- **Session expiry:** 24-hour / 10,000-message session limits (implemented) bound the exposure window. After expiry, a new ECDH exchange is required.
- **No key reuse:** Each session uses a fresh ECDH exchange. Compromising one session key does not help with past or future sessions.

**Residual risk:** An attacker who obtains a session key can decrypt all messages within that single session until it expires. They cannot decrypt messages from other sessions.

### Malicious CLI

**Threat:** The CLI on the developer's machine is compromised.

**Mitigation:** This is largely outside the E2EE threat model -- the CLI is a trusted endpoint. However:
- The `ALLOWED_ENCRYPTED_EVENTS` whitelist prevents a compromised CLI from injecting infrastructure events through the E2EE channel.
- The mobile app's permission system requires explicit user approval for sensitive tool executions.

**Residual risk:** A compromised CLI has access to the developer's machine and can execute arbitrary code. E2EE cannot protect against a compromised endpoint.

---

## Deliberate Design Decisions

### No Double Ratchet

ForkOff uses static sessions (one ECDH per connection) rather than the Signal Protocol's Double Ratchet Algorithm. This is a deliberate choice:

| Factor | Signal Double Ratchet | ForkOff Static Session |
|--------|----------------------|----------------------|
| **Session duration** | Months to years (messaging) | Minutes to hours (dev sessions) |
| **Offline messages** | Must handle (async messaging) | Not needed (both peers always online) |
| **Forward secrecy granularity** | Per-message via ratchet | Per-session via ephemeral ECDH |
| **Break-in recovery** | Automatic via ratchet | Automatic via session expiry + re-key |
| **Implementation complexity** | High (ratchet state, header encryption, out-of-order handling) | Low (one ECDH, one shared key) |
| **Audit surface** | Large | Small |

The 24-hour / 10,000-message session expiry provides forward secrecy boundaries analogous to (though coarser than) the Double Ratchet's per-message forward secrecy. For a synchronous developer tool with short-lived sessions, this tradeoff is appropriate.

### TOFU over PKI

ForkOff does not use a Certificate Authority or any form of centralized public key infrastructure. Identity keys are pinned on first contact (TOFU), similar to SSH's `known_hosts` model. This is acceptable because:

1. **Physical proximity at pairing:** Devices pair via QR code scan, establishing the initial trust anchor in a setting where the user can verify both devices are theirs.
2. **Loud key mismatch warnings:** Any change in a previously seen identity key produces an explicit, blocking error that prevents the exchange from completing.
3. **Technical audience:** ForkOff's users are developers who understand key verification concepts and can evaluate key mismatch warnings.
4. **No central trust dependency:** There is no CA to compromise, no certificate chain to validate, and no revocation infrastructure to maintain.

### NaCl over Web Crypto API

ForkOff uses TweetNaCl (a JavaScript port of NaCl) rather than the browser's Web Crypto API:

1. **Cross-platform consistency:** TweetNaCl provides identical behavior on React Native (Hermes), Node.js, and browsers. Web Crypto API availability and behavior varies across these environments.
2. **Misuse resistance:** NaCl's API is designed to be hard to misuse. There is no algorithm negotiation (which would enable downgrade attacks), no mode selection, and no padding scheme to get wrong.
3. **Well-analyzed construction:** XSalsa20-Poly1305 is a Bernstein construction with extensive academic analysis. The `box.before()` function combines X25519 ECDH with HSalsa20 key derivation in a single, well-studied operation.
4. **Deterministic nonce size:** NaCl's 24-byte nonces are large enough that random nonce selection has negligible collision probability (birthday bound ~2^96), eliminating the need for nonce counters or nonce-misuse-resistant modes.

---

## Compliance Mapping

ForkOff is **not currently certified** for any compliance framework. The following mapping is provided for informational purposes to assist organizations evaluating ForkOff against their compliance requirements.

### SOC 2

| Control | Mapping |
|---------|---------|
| **CC6.1** (Logical access security) | E2EE ensures only authorized endpoints can read data. Key storage uses OS-level access controls (Keychain, Credential Manager). |
| **CC6.7** (Encryption of data in transit) | All data in transit is protected by TLS (transport layer) and E2EE (application layer). The relay server never accesses plaintext. |
| **CC6.8** (Protection against unauthorized access) | TOFU identity verification, Ed25519 signatures, and monotonic replay counters prevent unauthorized access and data injection. |

### GDPR (Article 32)

E2EE constitutes an "appropriate technical measure" for ensuring the security of personal data processing. The relay server's inability to access plaintext data limits the scope of any data breach at the infrastructure level.

### HIPAA

E2EE makes the relay server a **non-BAA entity** -- it never accesses, processes, or stores protected health information (PHI). Only the endpoints (mobile app and CLI) handle plaintext data, and these run on devices controlled by the end user.

### Important Caveats

- ForkOff has not undergone a formal third-party security audit.
- The compliance mappings above are informational and do not constitute certification or attestation.
- Organizations with specific compliance requirements should conduct their own evaluation.

---

## Known Limitations & Roadmap

| Item | Status | Description |
|------|--------|-------------|
| **HKDF directional keys** | Implemented | HKDF-SHA256 derivation of separate send/receive keys from the ECDH shared secret. Prevents key reuse across message directions. |
| **Session expiry** | Implemented | 24-hour and 10,000-message session limits with automatic re-keying. |
| **No out-of-order tolerance** | By design | Messages must arrive in strict counter order. Out-of-order messages are rejected. This is acceptable because WebSocket (TCP) guarantees in-order delivery. |
| **Metadata visibility** | By design | Device IDs, counters, and timestamps are visible to the relay. This is the minimum metadata required for message routing. |
| **Third-party audit** | Planned | No formal security audit has been conducted yet. |

---

## Responsible Disclosure

If you discover a security vulnerability in ForkOff, please report it responsibly:

**Email:** [security@forkoff.app](mailto:security@forkoff.app)

**Guidelines:**

- Please provide a clear description of the vulnerability, including steps to reproduce if possible.
- Allow reasonable time for the issue to be investigated and patched before public disclosure.
- Do not access, modify, or delete other users' data as part of your research.
- Do not perform denial-of-service attacks against ForkOff infrastructure.

**What to expect:**

- Acknowledgment of your report within 48 hours.
- Regular updates on the status of the investigation.
- Credit in the security advisory (unless you prefer to remain anonymous).

We appreciate the security research community's efforts in helping keep ForkOff and its users safe.

---

## Cryptographic Primitive Summary

| Purpose | Primitive | Parameters |
|---------|-----------|------------|
| Key exchange | X25519 ECDH | 32-byte keys, Curve25519 |
| Key derivation (from ECDH) | HSalsa20 (via `nacl.box.before`) | 32-byte output |
| Key derivation (directional) | HKDF-SHA256 | 32-byte output per direction |
| Symmetric encryption | XSalsa20 | 256-bit key, 192-bit nonce |
| Message authentication | Poly1305 | 128-bit tag |
| Identity signatures | Ed25519 | 256-bit keys, 512-bit signatures |
| Random number generation | Platform CSPRNG | `expo-crypto` (mobile), `crypto.randomBytes` (CLI) |

---

*This document describes the security architecture of ForkOff as implemented. It is not a guarantee of security. The cryptographic implementation uses well-established primitives and constructions, but has not yet been formally audited. Use at your own risk.*
