const SITE_URL = 'https://ubakala-league.vercel.app';
const SPONSORS_URL = `${SITE_URL}/sponsors`;
const SPONSORS_IMAGE_URL =
  `${SITE_URL}/images/sponsors/ubakala-unity-cup-sponsors-og.jpg`;
const TITLE = 'Ubakala Unity Cup | Our Sponsors';
const DESCRIPTION =
  'Celebrating the individuals supporting the Ubakala Unity Cup.';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
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

function upsertCanonical(html, url) {
  const tag = `<link rel="canonical" href="${escapeHtml(url)}"/>`;
  const existingTag = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;
  return existingTag.test(html)
    ? html.replace(existingTag, tag)
    : html.replace(/<\/head>/i, `${tag}</head>`);
}

function renderSponsorsMetadata(html) {
  let result = html.replace(
    /<title\b[^>]*>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(TITLE)}</title>`
  );

  result = upsertMeta(result, 'name', 'description', DESCRIPTION);
  [
    ['og:type', 'website'],
    ['og:url', SPONSORS_URL],
    ['og:title', TITLE],
    ['og:description', DESCRIPTION],
    ['og:image', SPONSORS_IMAGE_URL],
    ['og:image:width', '1200'],
    ['og:image:height', '630'],
    ['og:image:type', 'image/jpeg'],
    ['og:image:alt', 'Ubakala Unity Cup official sponsor appreciation graphic']
  ].forEach(([name, content]) => {
    result = upsertMeta(result, 'property', name, content);
  });

  [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', TITLE],
    ['twitter:description', DESCRIPTION],
    ['twitter:image', SPONSORS_IMAGE_URL],
    ['twitter:image:alt', 'Ubakala Unity Cup official sponsor appreciation graphic']
  ].forEach(([name, content]) => {
    result = upsertMeta(result, 'name', name, content);
  });

  return upsertCanonical(result, SPONSORS_URL);
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).send('Method not allowed');
  }

  try {
    const pageResponse = await fetch(`${SITE_URL}/`);
    if (!pageResponse.ok) {
      throw new Error(`Homepage HTML request failed (${pageResponse.status})`);
    }

    const html = await pageResponse.text();
    const page = renderSponsorsMetadata(html);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=300, stale-while-revalidate=600'
    );
    return response.status(200).send(request.method === 'HEAD' ? '' : page);
  } catch (error) {
    console.error('Sponsors preview generation failed:', error);
    response.setHeader('Cache-Control', 'no-store');
    return response.status(502).send('Sponsors page is temporarily unavailable');
  }
};

module.exports.renderSponsorsMetadata = renderSponsorsMetadata;
