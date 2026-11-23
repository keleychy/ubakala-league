const handler = require('../../api/apps-script');

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

describe('Apps Script proxy Support click actions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        success: true,
        data: { click_count: 12 }
      })
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('forwards profile schema preflight as an option on the existing teams read', async () => {
    const response = createResponse();

    await handler({
      method: 'GET',
      query: { action: 'teams', profile_schema: '1' }
    }, response);

    const forwardedUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(forwardedUrl.searchParams.get('action')).toBe('teams');
    expect(forwardedUrl.searchParams.get('profile_schema')).toBe('1');
  });

  test('allows public homepage Support click recording without visitor data', async () => {
    const response = createResponse();

    await handler({
      method: 'POST',
      body: { action: 'support.recordHomepageClick' }
    }, response);

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      action: 'support.recordHomepageClick'
    });
  });

  test('allows the protected count action only when an ID token is supplied', async () => {
    const response = createResponse();

    await handler({
      method: 'POST',
      body: { action: 'admin.support.clickCount', idToken: 'firebase-token' }
    }, response);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      action: 'admin.support.clickCount',
      idToken: 'firebase-token'
    });
  });

  test('rejects the protected count action when an ID token is missing', async () => {
    const response = createResponse();

    await handler({
      method: 'POST',
      body: { action: 'admin.support.clickCount' }
    }, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload.error).toBe('Firebase ID token is required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('allows team profile updates only through the authenticated admin action list', async () => {
    const response = createResponse();

    await handler({
      method: 'POST',
      body: {
        action: 'admin.teams.profile.update',
        idToken: 'firebase-token',
        team_id: 'team-1',
        profile_description: 'Community club'
      }
    }, response);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({
      action: 'admin.teams.profile.update',
      idToken: 'firebase-token',
      team_id: 'team-1',
      profile_description: 'Community club'
    });
  });
});
