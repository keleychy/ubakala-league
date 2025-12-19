// api.js

const defaultRemote = 'https://ubakalaunitycup.onrender.com/api';
const API_URL = process.env.REACT_APP_API_URL || defaultRemote;
export { API_URL };

function buildUrl(path) {
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export async function fetchJSON(path) {
  const res = await fetch(buildUrl(path));
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'API error');
  }
  return res.json();
}

export const api = {
  getTeams: () => fetchJSON('/teams/'),
  // getMatches accepts an optional params object, e.g. { season: 1 } or { season_name: '2025 JUNIOR BOYS CUP' }
  getMatches: (params) => {
    let q = '';
    if (params && typeof params === 'object') {
      const parts = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      if (parts.length) q = `?${parts.join('&')}`;
    }
    return fetchJSON(`/matches/${q}`);
  },
  // optionally pass a category string: 'girls' | 'senior_boys' | 'junior_boys'
  getSeasons: (category) => {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetchJSON(`/seasons/${q}`);
  },
  getNews: () => fetchJSON('/news/'),
  getStandings: (seasonId) => fetchJSON(`/standings/${seasonId}/`),
  getGroupsWithTeams: (seasonId) => fetchJSON(`/groups-with-teams/?season=${seasonId}`),
  // optionally pass a category string (girls|senior_boys|junior_boys)
  getGroupedStandings: (seasonId, category) => {
    const qSeason = `season=${encodeURIComponent(seasonId)}`;
    const qCat = category ? `&category=${encodeURIComponent(category)}` : '';
    return fetchJSON(`/grouped-standings/?${qSeason}${qCat}`);
  },
};

