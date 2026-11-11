export const PREDICTOR_PASSWORD_ITERATIONS = 600000;

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) {
    throw new Error('Invalid password salt');
  }
  return Uint8Array.from(value.match(/.{2}/g), byte => parseInt(byte, 16));
}

export function createPredictorPasswordSalt() {
  if (!window.crypto?.getRandomValues) {
    throw new Error('Secure password processing is not available in this browser.');
  }
  return bytesToHex(window.crypto.getRandomValues(new Uint8Array(16)));
}

export async function derivePredictorPasswordVerifier(password, salt, iterations = PREDICTOR_PASSWORD_ITERATIONS) {
  if (!window.crypto?.subtle || typeof TextEncoder === 'undefined') {
    throw new Error('Secure password processing is not available in this browser.');
  }
  const key = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await window.crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: hexToBytes(salt),
    iterations,
    hash: 'SHA-256'
  }, key, 256);
  return bytesToHex(new Uint8Array(derived));
}
