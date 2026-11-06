// api.js

import { createAppsScriptApi } from './appsScriptApi';

const defaultRemote = 'https://ubakalaunitycup.onrender.com/api';
const API_URL = process.env.REACT_APP_API_URL || defaultRemote;
export { API_URL };
export const APPS_SCRIPT_PROXY_URL =
  process.env.REACT_APP_APPS_SCRIPT_PROXY_URL || '/api/apps-script';

export const isAppsScriptReadApiEnabled = () =>
  process.env.REACT_APP_API_PROVIDER
    ? process.env.REACT_APP_API_PROVIDER === 'apps-script'
    : process.env.NODE_ENV === 'production';

const inFlightRequests = new Map();
let appsScriptApiInstance;

function getAppsScriptApi() {
  if (!isAppsScriptReadApiEnabled()) return null;
  if (!appsScriptApiInstance) {
    appsScriptApiInstance = createAppsScriptApi(
      APPS_SCRIPT_PROXY_URL
    );
  }
  return appsScriptApiInstance;
}

function buildUrl(path) {
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export async function fetchJSON(path) {
  const url = buildUrl(path);
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const request = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'API error');
    }
    return res.json();
  })();
  inFlightRequests.set(url, request);

  try {
    return await request;
  } finally {
    if (inFlightRequests.get(url) === request) {
      inFlightRequests.delete(url);
    }
  }
}

export const api = {
  getTeams: () => {
    const appsScriptApi = getAppsScriptApi();
    return appsScriptApi ? appsScriptApi.getTeams() : fetchJSON('/teams/');
  },
  getMatches: (params) => {
    const appsScriptApi = getAppsScriptApi();
    if (appsScriptApi) return appsScriptApi.getMatches(params);

    let q = '';
    if (params && typeof params === 'object') {
      const parts = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      if (parts.length) q = `?${parts.join('&')}`;
    }
    return fetchJSON(`/matches/${q}`);
  },
  getSeasons: (category) => {
    const appsScriptApi = getAppsScriptApi();
    if (appsScriptApi) return appsScriptApi.getSeasons(category);

    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetchJSON(`/seasons/${q}`);
  },
  getNews: () => {
    const appsScriptApi = getAppsScriptApi();
    return appsScriptApi ? appsScriptApi.getNews() : fetchJSON('/news/');
  },
  getNewsById: (id) => {
    const appsScriptApi = getAppsScriptApi();
    return appsScriptApi
      ? appsScriptApi.getNewsById(id)
      : fetchJSON(`/news/${id}/`);
  },
  recordNewsView: (id, visitorId) => {
    const appsScriptApi = getAppsScriptApi();
    if (!appsScriptApi) {
      throw new Error('Article view tracking requires the Apps Script API provider.');
    }
    return appsScriptApi.recordNewsView(id, visitorId);
  },
  getStandings: (seasonId) => {
    if (isAppsScriptReadApiEnabled()) {
      throw new Error('Standings are not available from the Apps Script read API');
    }
    return fetchJSON(`/standings/${seasonId}/`);
  },
  getGroupsWithTeams: (seasonId) => {
    const appsScriptApi = getAppsScriptApi();
    return appsScriptApi
      ? appsScriptApi.getGroupsWithTeams(seasonId)
      : fetchJSON(`/groups-with-teams/?season=${seasonId}`);
  },
  getGroupedStandings: (seasonId, category) => {
    if (isAppsScriptReadApiEnabled()) {
      throw new Error('Server-calculated standings are not available from the Apps Script read API');
    }
    const qSeason = `season=${encodeURIComponent(seasonId)}`;
    const qCat = category ? `&category=${encodeURIComponent(category)}` : '';
    return fetchJSON(`/grouped-standings/?${qSeason}${qCat}`);
  },
};
