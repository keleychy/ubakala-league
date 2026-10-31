import { getFirebaseAuth } from './firebaseClient';

const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxk8WnuSRTR40Av-IYppBzgZjAgQL75D4DkIeotwuxTFdEYzWYln5KBU2gfY0lybunv/exec';

export class AdminApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function callAdminApi(action, payload = {}) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new AdminApiError('Please sign in to continue');
  }

  const idToken = await user.getIdToken();
  const apiUrl =
    process.env.REACT_APP_APPS_SCRIPT_API_URL || DEFAULT_APPS_SCRIPT_URL;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, action, idToken })
  });

  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new AdminApiError('Apps Script returned an invalid response');
  }
  if (!response.ok || !result || result.success !== true) {
    throw new AdminApiError(
      result?.error || `Apps Script request failed (${response.status})`
    );
  }
  return result.data;
}
