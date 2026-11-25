const handler = require('../../api/sponsors-preview');
const { renderSponsorsMetadata } = require('../../api/sponsors-preview');

const originalFetch = global.fetch;
const pageHtml =
  '<html><head><title>Ubakala Football League</title>' +
  '<meta name="description" content="Default description"/>' +
  '<meta property="og:url" content="https://ubakala-league.vercel.app/"/>' +
  '<meta property="og:image" content="https://ubakala-league.vercel.app/preview.jpg"/>' +
  '<meta name="twitter:image" content="https://ubakala-league.vercel.app/preview.jpg"/>' +
  '</head><body><div id="root"></div></body></html>';

function createResponse(payload) {
  return {
    ok: true,
    text: async () => payload
  };
}

function createApiResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    }
  };
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

test('renders sponsors metadata directly into HTML for crawlers', () => {
  const html = renderSponsorsMetadata(pageHtml);

  expect(html).toContain('<title>Ubakala Unity Cup | Our Sponsors</title>');
  expect(html).toContain(
    '<meta name="description" content="Celebrating the individuals supporting the Ubakala Unity Cup."/>'
  );
  expect(html).toContain(
    '<meta property="og:url" content="https://ubakala-league.vercel.app/sponsors"/>'
  );
  expect(html).toContain(
    '<meta property="og:image" content="https://ubakala-league.vercel.app/images/sponsors/ubakala-unity-cup-sponsors-og.jpg"/>'
  );
  expect(html).toContain('<meta property="og:image:width" content="1200"/>');
  expect(html).toContain('<meta property="og:image:height" content="630"/>');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
  expect(html).toContain(
    '<link rel="canonical" href="https://ubakala-league.vercel.app/sponsors"/>'
  );
  expect(html).not.toContain('Ubakala Football League</title>');
  expect(html).not.toContain('Default description');
  expect(html).not.toContain('/preview.jpg');
});

test('serves crawler-readable sponsors metadata at the routed page URL', async () => {
  global.fetch = jest.fn().mockResolvedValue(createResponse(pageHtml));
  const response = createApiResponse();

  await handler({
    method: 'GET',
    headers: { 'user-agent': 'WhatsApp/2.24.0' }
  }, response);

  expect(global.fetch).toHaveBeenCalledWith('https://ubakala-league.vercel.app/');
  expect(response.statusCode).toBe(200);
  expect(response.headers['Content-Type']).toBe('text/html; charset=utf-8');
  expect(response.headers['Cache-Control']).toContain('s-maxage=300');
  expect(response.body).toContain('og:title');
  expect(response.body).toContain('Our Sponsors');
});
