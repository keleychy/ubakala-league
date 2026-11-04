const DEFAULT_APPS_SCRIPT_API_URL =
  'https://script.google.com/macros/s/AKfycbxk8WnuSRTR40Av-IYppBzgZjAgQL75D4DkIeotwuxTFdEYzWYln5KBU2gfY0lybunv/exec';

const READ_ACTIONS = {
  teams: [],
  seasons: ['category'],
  groups: ['season_id', 'season'],
  teamgroups: ['season_id', 'season'],
  'groups-with-teams': ['season_id', 'season'],
  matches: ['season_id', 'season'],
  news: ['id']
};

const ADMIN_ACTIONS = new Set([
  'admin.me',
  'admin.matches.list',
  'admin.news.list',
  'admin.seasons.list',
  'admin.matches.setResult',
  'admin.matches.setPeriod',
  'admin.matches.setStatus',
  'admin.matches.markFinished',
  'admin.news.create',
  'admin.news.update',
  'admin.news.delete',
  'admin.groups.list',
  'admin.teams.createManual',
  'admin.teams.move',
  'admin.teams.import'
]);

const appsScriptApiUrl =
  process.env.APPS_SCRIPT_API_URL || DEFAULT_APPS_SCRIPT_API_URL;

module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  let upstreamUrl = appsScriptApiUrl;
  const options = { redirect: 'follow' };

  if (request.method === 'GET') {
    const action = String(request.query.action || '').trim().toLowerCase();
    const allowedParameters = READ_ACTIONS[action];
    if (!allowedParameters) {
      return response.status(400).json({
        success: false,
        error: 'Unsupported Apps Script read action'
      });
    }

    const url = new URL(appsScriptApiUrl);
    url.searchParams.set('action', action);
    for (const key of allowedParameters) {
      const value = request.query[key];
      if (typeof value === 'string' && value) {
        url.searchParams.set(key, value);
      }
    }
    upstreamUrl = url.toString();
  } else if (request.method === 'POST') {
    let payload;
    try {
      payload = typeof request.body === 'string'
        ? JSON.parse(request.body)
        : request.body;
    } catch {
      return response.status(400).json({
        success: false,
        error: 'Request body must be valid JSON'
      });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return response.status(400).json({
        success: false,
        error: 'Request body must be a JSON object'
      });
    }
    if (!ADMIN_ACTIONS.has(payload.action)) {
      return response.status(400).json({
        success: false,
        error: 'Unsupported Apps Script admin action'
      });
    }
    if (typeof payload.idToken !== 'string' || !payload.idToken) {
      return response.status(400).json({
        success: false,
        error: 'Firebase ID token is required'
      });
    }

    options.method = 'POST';
    options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    options.body = JSON.stringify(payload);
  } else {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, options);
    const responseText = await upstreamResponse.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      if (responseText.includes('Script function not found: doPost')) {
        return response.status(502).json({
          success: false,
          error: 'The deployed Apps Script version is missing doPost. Deploy a new web app version that includes the admin POST handler.'
        });
      }

      return response.status(502).json({
        success: false,
        error: 'Apps Script returned an invalid response'
      });
    }

    if (!upstreamResponse.ok) {
      return response.status(502).json({
        success: false,
        error: data?.error || 'Apps Script request failed'
      });
    }

    return response.status(200).json(data);
  } catch (error) {
    console.error('Apps Script proxy error:', error);
    return response.status(502).json({
      success: false,
      error: 'Apps Script is unavailable'
    });
  }
};
