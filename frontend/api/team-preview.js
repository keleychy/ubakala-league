const DEFAULT_APPS_SCRIPT_API_URL =
  'https://script.google.com/macros/s/AKfycbxk8WnuSRTR40Av-IYppBzgZjAgQL75D4DkIeotwuxTFdEYzWYln5KBU2gfY0lybunv/exec';
const SITE_URL = 'https://ubakala-league.vercel.app';
const SOCIAL_PREVIEW_BOT =
  /facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|googlebot|bingbot/i;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

function isSocialPreviewBot(userAgent = '') {
  return SOCIAL_PREVIEW_BOT.test(userAgent);
}

function getTeamPreviewImage(team) {
  try {
    const imageUrl = new URL(team.logo);
    if (
      ['https:', 'http:'].includes(imageUrl.protocol) &&
      imageUrl.hostname &&
      !imageUrl.username &&
      !imageUrl.password
    ) {
      return imageUrl.href;
    }
  } catch (error) {
    // Use the league image when a team badge URL is absent or invalid.
  }
  return `${SITE_URL}/preview.jpg`;
}

function getTeamDescription(team) {
  const description = String(
    team.profile_description || team.home_community || team.profile_history || ''
  )
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!description) return 'Team profile from the Ubakala Unity Cup.';
  if (description.length <= 200) return description;
  return `${description.slice(0, 197).trim()}...`;
}

function upsertMeta(html, attribute, name, content) {
  const tag = `<meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}"/>`;
  const existingTag = new RegExp(
    `<meta\\s+${attribute}=["']${name}["'][^>]*>`,
    'i'
  );
  return existingTag.test(html)
    ? html.replace(existingTag, tag)
    : html.replace(/<\/head>/i, `${tag}</head>`);
}

function renderTeamMetadata(html, team, teamUrl) {
  const title = `${String(team.name || 'Team').trim()} | Ubakala Unity Cup`;
  const description = getTeamDescription(team);
  const image = getTeamPreviewImage(team);
  let result = html.replace(
    /<title\b[^>]*>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );

  [
    ['og:type', 'website'],
    ['og:url', teamUrl],
    ['og:title', title],
    ['og:description', description],
    ['og:image', image]
  ].forEach(([name, content]) => {
    result = upsertMeta(result, 'property', name, content);
  });

  [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', title],
    ['twitter:description', description],
    ['twitter:image', image]
  ].forEach(([name, content]) => {
    result = upsertMeta(result, 'name', name, content);
  });

  return result;
}

async function getSiteHtml() {
  const response = await fetch(`${SITE_URL}/`);
  if (!response.ok) throw new Error('Team preview page is unavailable');
  return response.text();
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).send('Method not allowed');
  }

  const id = request.query?.id;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return response.status(400).send('A valid team ID is required');
  }

  const headers = request.headers || {};
  const userAgent = headers['user-agent'] || headers['User-Agent'] || '';
  const cacheControl = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';

  try {
    const html = await getSiteHtml();
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Vary', 'User-Agent');
    response.setHeader('Cache-Control', cacheControl);
    if (!isSocialPreviewBot(userAgent)) {
      return response.status(200).send(html);
    }

    const appsScriptApiUrl = new URL(
      process.env.APPS_SCRIPT_API_URL || DEFAULT_APPS_SCRIPT_API_URL
    );
    appsScriptApiUrl.searchParams.set('action', 'teams');
    const teamsResponse = await fetch(appsScriptApiUrl.toString());
    if (!teamsResponse.ok) throw new Error('Team data is unavailable');
    const payload = await teamsResponse.json();
    if (payload?.success !== true || !Array.isArray(payload.data)) {
      throw new Error(payload?.error || 'Team data response is invalid');
    }

    const team = payload.data.find(item => String(item.id) === id);
    if (!team) {
      response.setHeader('Cache-Control', 'no-store');
      return response.status(404).send(html);
    }

    const teamUrl = `${SITE_URL}/teams/${encodeURIComponent(id)}`;
    const page = renderTeamMetadata(html, team, teamUrl);
    return response.status(200).send(request.method === 'HEAD' ? '' : page);
  } catch (error) {
    console.error('Team preview generation failed:', error);
    response.setHeader('Cache-Control', 'no-store');
    return response.status(502).send('Team preview is temporarily unavailable');
  }
};

module.exports.isSocialPreviewBot = isSocialPreviewBot;
module.exports.getTeamPreviewImage = getTeamPreviewImage;
module.exports.getTeamDescription = getTeamDescription;
module.exports.renderTeamMetadata = renderTeamMetadata;
