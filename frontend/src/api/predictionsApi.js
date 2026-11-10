import { APPS_SCRIPT_PROXY_URL } from './api';
import { callAdminApi } from './adminApi';

function buildActionUrl(action, parameters = {}) {
  const baseUrl = new URL(
    APPS_SCRIPT_PROXY_URL,
    typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  );
  baseUrl.searchParams.set('action', action);
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      baseUrl.searchParams.set(key, String(value));
    }
  });
  return baseUrl.toString();
}

async function getAction(action, parameters) {
  const response = await fetch(buildActionUrl(action, parameters));
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error('The Predictions service returned an invalid response');
  }
  if (!response.ok || !payload || payload.success !== true) {
    throw new Error(payload?.error || `Predictions request failed (${response.status})`);
  }
  return payload.data;
}

async function postAction(action, body) {
  const response = await fetch(APPS_SCRIPT_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, action })
  });
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error('The Predictions service returned an invalid response');
  }
  if (!response.ok || !payload || payload.success !== true) {
    throw new Error(payload?.error || `Predictions request failed (${response.status})`);
  }
  return payload.data;
}

export const predictionsApi = {
  getConfiguration: () => getAction('predictions.configuration'),
  getFixtures: () => getAction('predictions.fixtures'),
  getLeaderboard: (filters = {}) => getAction('predictions.leaderboard', filters),
  getStatistics: (filters = {}) => getAction('predictions.statistics', filters),
  register: details => postAction('predictions.register', details),
  getHistory: credentials => postAction('predictions.history', credentials),
  setPassword: credentials => postAction('predictions.setPassword', credentials),
  requestRecovery: details => postAction('predictions.recoveryRequest', details),
  submit: prediction => postAction('predictions.submit', prediction),
  submitBatch: batch => postAction('predictions.submitBatch', batch)
};

export const predictionsAdminApi = {
  initialize: () => callAdminApi('admin.predictions.initialize'),
  getSummary: () => callAdminApi('admin.predictions.summary'),
  getOverview: (filters = {}) => callAdminApi('admin.predictions.overview', filters),
  getPredictorHistory: predictorId => callAdminApi(
    'admin.predictions.predictorHistory',
    { predictor_id: predictorId }
  ),
  getRecoveryRequests: () => callAdminApi('admin.predictions.recoveryRequests'),
  reviewRecovery: (requestId, decision, adminNote) => callAdminApi(
    'admin.predictions.reviewRecovery',
    { request_id: requestId, decision, admin_note: adminNote }
  ),
  getAuditHistory: () => callAdminApi('admin.predictions.audit'),
  settle: seasonId => callAdminApi('admin.predictions.settle', { season_id: seasonId }),
  searchPredictors: query => callAdminApi('admin.predictions.predictors', { query }),
  setAccountStatus: (predictorId, accountStatus) => callAdminApi(
    'admin.predictions.accountStatus',
    { predictor_id: predictorId, account_status: accountStatus }
  ),
  resetAccessCode: (predictorId, reason) => callAdminApi(
    'admin.predictions.resetAccessCode',
    { predictor_id: predictorId, reason }
  ),
  setSetting: (settingKey, settingValue) => callAdminApi(
    'admin.predictions.setSetting',
    { setting_key: settingKey, setting_value: settingValue }
  )
};
