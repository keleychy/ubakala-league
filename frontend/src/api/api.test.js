describe('API provider selection', () => {
  const originalProvider = process.env.REACT_APP_API_PROVIDER;
  const originalApiUrl = process.env.REACT_APP_API_URL;
  const originalAppsScriptUrl = process.env.REACT_APP_APPS_SCRIPT_API_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.REACT_APP_API_PROVIDER;
    } else {
      process.env.REACT_APP_API_PROVIDER = originalProvider;
    }
    if (originalApiUrl === undefined) {
      delete process.env.REACT_APP_API_URL;
    } else {
      process.env.REACT_APP_API_URL = originalApiUrl;
    }
    if (originalAppsScriptUrl === undefined) {
      delete process.env.REACT_APP_APPS_SCRIPT_API_URL;
    } else {
      process.env.REACT_APP_APPS_SCRIPT_API_URL = originalAppsScriptUrl;
    }
    process.env.NODE_ENV = originalNodeEnv;
    global.fetch = originalFetch;
    jest.resetModules();
  });

  test('keeps Django as the default read provider', async () => {
    process.env.REACT_APP_API_PROVIDER = '';
    process.env.REACT_APP_API_URL = '';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    });
    jest.resetModules();
    const { api, API_URL, isAppsScriptReadApiEnabled } = require('./api');

    expect(API_URL).toBe('https://ubakalaunitycup.onrender.com/api');
    expect(isAppsScriptReadApiEnabled()).toBe(false);
    await api.getTeams();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://ubakalaunitycup.onrender.com/api/teams/'
    );
  });

  test('uses Apps Script only when explicitly selected', async () => {
    process.env.REACT_APP_API_PROVIDER = 'apps-script';
    process.env.REACT_APP_API_URL = '';
    process.env.REACT_APP_APPS_SCRIPT_API_URL =
      'https://script.google.com/macros/s/test/exec';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ id: 'TEAM-1', name: 'Avodim', archived: false }]
      })
    });
    jest.resetModules();
    const { api, API_URL, isAppsScriptReadApiEnabled } = require('./api');

    expect(API_URL).toBe('https://ubakalaunitycup.onrender.com/api');
    expect(isAppsScriptReadApiEnabled()).toBe(true);
    await expect(api.getTeams()).resolves.toMatchObject([
      { id: 'TEAM-1', name: 'Avodim' }
    ]);
    expect(new URL(global.fetch.mock.calls[0][0]).searchParams.get('action')).toBe('teams');
  });

  test('uses the public Apps Script API by default in production builds', async () => {
    delete process.env.REACT_APP_API_PROVIDER;
    delete process.env.REACT_APP_APPS_SCRIPT_API_URL;
    process.env.NODE_ENV = 'production';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ id: 'TEAM-1', name: 'Avodim', archived: false }]
      })
    });
    jest.resetModules();
    const { api, isAppsScriptReadApiEnabled } = require('./api');

    expect(isAppsScriptReadApiEnabled()).toBe(true);
    await expect(api.getTeams()).resolves.toMatchObject([
      { id: 'TEAM-1', name: 'Avodim' }
    ]);
    const requestUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(requestUrl.origin).toBe('https://script.google.com');
    expect(requestUrl.searchParams.get('action')).toBe('teams');
  });
});
