/**
 * Polyfill tweetnacl's PRNG for React Native.
 * React Native (Hermes) lacks crypto.getRandomValues, so we use expo-crypto.
 * MUST be imported before any tweetnacl usage.
 */
import nacl from 'tweetnacl';
import * as ExpoCrypto from 'expo-crypto';

nacl.setPRNG((x: Uint8Array, n: number) => {
  const bytes = ExpoCrypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) x[i] = bytes[i];
});
