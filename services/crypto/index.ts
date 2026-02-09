/**
 * E2EE Crypto Module - Barrel Export
 */
export { generateKeyPair } from './keyGeneration';
export { keyStorage } from './keyStorage';
export { encrypt, decrypt } from './encryption';
export { computeSharedKey } from './keyExchange';
export { E2EEManager } from './e2eeManager';
export type {
  E2EEKeyPair,
  EncryptedPayload,
  EncryptedMessage,
  SessionKeys,
  KeyExchangeInit,
  KeyExchangeAck,
  DevicePublicKeyData,
  E2EESessionStatus,
} from './types';
