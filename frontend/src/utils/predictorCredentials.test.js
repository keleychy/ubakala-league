import { pbkdf2Sync, webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import {
  derivePredictorPasswordVerifier,
  PREDICTOR_PASSWORD_ITERATIONS
} from './predictorCredentials';

beforeAll(() => {
  Object.defineProperty(window, 'crypto', { configurable: true, value: webcrypto });
  window.TextEncoder = TextEncoder;
});

test('derives a SHA-256 PBKDF2 verifier compatible with standard implementations', async () => {
  const expected = pbkdf2Sync('password', Buffer.from('salt'), 2, 32, 'sha256')
    .toString('hex');
  await expect(
    derivePredictorPasswordVerifier('password', '73616c74', 2)
  ).resolves.toBe(expected);
  expect(PREDICTOR_PASSWORD_ITERATIONS).toBe(600000);
});
