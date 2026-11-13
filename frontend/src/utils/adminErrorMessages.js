const firebaseAuthMessages = {
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/wrong-password': 'The email or password is incorrect.',
  'auth/too-many-requests': 'There have been too many attempts. Please wait before trying again.',
  'auth/network-request-failed': 'A network issue interrupted the request. Check your connection and try again.'
};

export function getAdminErrorMessage(error, fallback) {
  if (error?.name === 'AdminApiError' || error?.name === 'AdminAuthError') {
    return error.message || fallback;
  }

  const code = typeof error?.code === 'string' ? error.code : '';
  if (firebaseAuthMessages[code]) return firebaseAuthMessages[code];
  if (code.startsWith('auth/')) return fallback;

  if (
    error?.name === 'TypeError' &&
    /fetch|network/i.test(String(error.message || ''))
  ) {
    return 'A network issue interrupted the request. Check your connection and try again.';
  }

  return fallback;
}
