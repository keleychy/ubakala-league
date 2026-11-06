const DEFAULT_APPS_SCRIPT_API_URL =
  'https://script.google.com/macros/s/AKfycbxk8WnuSRTR40Av-IYppBzgZjAgQL75D4DkIeotwuxTFdEYzWYln5KBU2gfY0lybunv/exec';
const SITE_URL = 'https://ubakala-league.vercel.app';

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

function getArticleDescription(article) {
  const subtitle = String(article.subtitle || '').trim();
  if (subtitle) return subtitle;

  const plainText = String(article.content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plainText.length <= 200) return plainText;
  return `${plainText.slice(0, 197).trim()}...`;
}

function renderArticleMetadata(html, article, articleUrl) {
  const title = String(article.title || 'Ubakala Football League').trim();
  const description = getArticleDescription(article);
  let image = `${SITE_URL}/preview.jpg`;

  try {
    const imageUrl = new URL(article.image_url);
    if (
      (imageUrl.protocol === 'https:' || imageUrl.protocol === 'http:') &&
      imageUrl.hostname &&
      !imageUrl.username &&
      !imageUrl.password
    ) {
      image = imageUrl.href;
    }
  } catch (error) {
    // Keep the site preview image when an article has no usable image URL.
  }

  let result = html
    .replace(
      /<title\b[^>]*>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(title)}</title>`
    )
    .replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtml(description)}"/>`
    );

  [
    ['og:type', 'article'],
    ['og:url', articleUrl],
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

module.exports = async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).send('Method not allowed');
  }

  const requestUrl = new URL(request.url, SITE_URL);
  const id = request.query?.id || requestUrl.searchParams.get('id');
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return response.status(400).send('A valid article ID is required');
  }

  const appsScriptApiUrl = new URL(
    process.env.APPS_SCRIPT_API_URL || DEFAULT_APPS_SCRIPT_API_URL
  );
  appsScriptApiUrl.searchParams.set('action', 'news');
  appsScriptApiUrl.searchParams.set('id', id);

  try {
    const [pageResponse, articleResponse] = await Promise.all([
      fetch(`${SITE_URL}/`),
      fetch(appsScriptApiUrl.toString())
    ]);

    if (!pageResponse.ok || !articleResponse.ok) {
      throw new Error('Article preview source is unavailable');
    }

    const [html, payload] = await Promise.all([
      pageResponse.text(),
      articleResponse.json()
    ]);
    if (!payload || payload.success !== true) {
      throw new Error(payload?.error || 'Article preview request failed');
    }

    const article = payload.data;
    if (!article || article.published !== true) {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      return response.status(404).send(html);
    }

    const articleUrl = `${SITE_URL}/news/${encodeURIComponent(id)}`;
    const page = renderArticleMetadata(html, article, articleUrl);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    return response.status(200).send(request.method === 'HEAD' ? '' : page);
  } catch (error) {
    console.error('News preview generation failed:', error);
    response.setHeader('Cache-Control', 'no-store');
    return response.status(502).send('Article preview is temporarily unavailable');
  }
};

module.exports.renderArticleMetadata = renderArticleMetadata;
