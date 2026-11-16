export const ADMIN_SESSION_ACTIVITY_KEY = 'ubakala-admin-last-activity-v1';

export function getAdminLastActivity() {
  const stored = window.localStorage.getItem(ADMIN_SESSION_ACTIVITY_KEY);
  const timestamp = Number(stored);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function recordAdminActivity(timestamp = Date.now()) {
  window.localStorage.setItem(ADMIN_SESSION_ACTIVITY_KEY, String(timestamp));
  return timestamp;
}
