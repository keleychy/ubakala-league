import { getFirebaseAuth } from './firebaseClient';
import { APPS_SCRIPT_PROXY_URL, invalidateGroupsWithTeamsCache } from './api';

const GROUP_MEMBERSHIP_MUTATIONS = new Set([
  'admin.teams.createManual',
  'admin.teams.move',
  'admin.teams.import'
]);

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
  const response = await fetch(APPS_SCRIPT_PROXY_URL, {
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
  if (GROUP_MEMBERSHIP_MUTATIONS.has(action)) {
    invalidateGroupsWithTeamsCache();
  }
  return result.data;
}
