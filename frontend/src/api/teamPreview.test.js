const {
  getTeamDescription,
  getTeamPreviewImage,
  isSocialPreviewBot,
  renderTeamMetadata
} = require('../../api/team-preview');
const handler = require('../../api/team-preview');

const originalFetch = global.fetch;
const pageHtml =
  '<html><head><title>Ubakala Football League</title></head><body></body></html>';

function createFetchResponse(payload, ok = true) {
  return {
    ok,
    text: async () => payload,
    json: async () => payload
  };
}

function createResponse() {
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

test('uses the team badge and profile text for social metadata', () => {
  const team = {
    id: 'team-1',
    name: 'Avodim United',
    logo: 'https://images.example.com/avodim.png',
    profile_description: 'A team from <b>Ubakala</b>.'
  };
  const rendered = renderTeamMetadata(
    pageHtml,
    team,
    'https://ubakala-league.vercel.app/teams/team-1'
  );

  expect(getTeamPreviewImage(team)).toBe('https://images.example.com/avodim.png');
  expect(getTeamDescription(team)).toBe('A team from Ubakala.');
  expect(rendered).toContain('<title>Avodim United | Ubakala Unity Cup</title>');
  expect(rendered).toContain(
    '<meta property="og:image" content="https://images.example.com/avodim.png"/>'
  );
  expect(rendered).toContain(
    '<meta name="twitter:image" content="https://images.example.com/avodim.png"/>'
  );
  expect(rendered).toContain(
    '<meta property="og:url" content="https://ubakala-league.vercel.app/teams/team-1"/>'
  );
});

test('uses the site preview image when no safe badge URL is available', () => {
  expect(getTeamPreviewImage({ logo: 'javascript:alert(1)' })).toBe(
    'https://ubakala-league.vercel.app/preview.jpg'
  );
  expect(getTeamDescription({})).toBe(
    'Team profile from the Ubakala Unity Cup.'
  );
});

test('recognizes social crawlers but not regular browsers', () => {
  expect(isSocialPreviewBot('WhatsApp/2.24')).toBe(true);
  expect(isSocialPreviewBot('Mozilla/5.0 Chrome/130')).toBe(false);
});

test('serves the regular app page without querying Apps Script for a browser visit', async () => {
  global.fetch = jest.fn().mockResolvedValue(createFetchResponse(pageHtml));
  const response = createResponse();

  await handler({
    method: 'GET',
    query: { id: 'team-1' },
    headers: { 'user-agent': 'Mozilla/5.0 Chrome/130' }
  }, response);

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe(pageHtml);
});

test('queries team data for social crawlers and returns team-specific metadata', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(createFetchResponse(pageHtml))
    .mockResolvedValueOnce(createFetchResponse({
      success: true,
      data: [{
        id: 'team-1',
        name: 'Avodim United',
        logo: 'https://images.example.com/avodim.png',
        profile_description: 'A team from Ubakala.',
        archived: false
      }]
    }));
  const response = createResponse();

  await handler({
    method: 'GET',
    query: { id: 'team-1' },
    headers: { 'user-agent': 'WhatsApp/2.24' }
  }, response);

  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(new URL(global.fetch.mock.calls[1][0]).searchParams.get('action'))
    .toBe('teams');
  expect(response.statusCode).toBe(200);
  expect(response.body).toContain('Avodim United | Ubakala Unity Cup');
  expect(response.body).toContain('https://images.example.com/avodim.png');
  expect(response.headers.Vary).toBe('User-Agent');
  expect(response.headers['Cache-Control']).toContain('s-maxage=300');
});
