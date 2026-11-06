const VIEWER_ID_KEY = 'ubakala-news-viewer-id';
let memoryViewerId;

function createViewerId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function getNewsViewerId() {
  if (memoryViewerId) return memoryViewerId;

  try {
    const existingId = window.localStorage.getItem(VIEWER_ID_KEY);
    if (existingId) {
      memoryViewerId = existingId;
      return existingId;
    }

    memoryViewerId = createViewerId();
    window.localStorage.setItem(VIEWER_ID_KEY, memoryViewerId);
    return memoryViewerId;
  } catch {
    memoryViewerId = createViewerId();
    return memoryViewerId;
  }
}
