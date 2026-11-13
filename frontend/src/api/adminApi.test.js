import { callAdminApi, AdminApiError } from './adminApi';
import { invalidateGroupsWithTeamsCache } from './api';
import { getFirebaseAuth } from './firebaseClient';

jest.mock('./api', () => ({
  APPS_SCRIPT_PROXY_URL: '/api/apps-script',
  invalidateGroupsWithTeamsCache: jest.fn()
}));

jest.mock('./firebaseClient', () => ({
  getFirebaseAuth: jest.fn()
}));

function response(payload, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => payload
  };
}

describe('admin API group cache invalidation', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    getFirebaseAuth.mockReturnValue({
      currentUser: { getIdToken: jest.fn().mockResolvedValue('test-token') }
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test.each([
    'admin.teams.createManual',
    'admin.teams.move',
    'admin.teams.import'
  ])('invalidates cached groups after successful %s', async action => {
    global.fetch.mockResolvedValue(response({ success: true, data: { saved: true } }));

    await expect(callAdminApi(action, { season_id: 'season-1' }))
      .resolves.toEqual({ saved: true });

    expect(invalidateGroupsWithTeamsCache).toHaveBeenCalledTimes(1);
  });

  test('does not invalidate for unrelated successful administrator actions', async () => {
    global.fetch.mockResolvedValue(response({ success: true, data: { saved: true } }));

    await expect(callAdminApi('admin.matches.setResult', { match_id: 'match-1' }))
      .resolves.toEqual({ saved: true });

    expect(invalidateGroupsWithTeamsCache).not.toHaveBeenCalled();
  });

  test('does not invalidate when a mutation is rejected by Apps Script', async () => {
    global.fetch.mockResolvedValue(response({
      success: false,
      error: 'The team could not be moved'
    }));

    await expect(callAdminApi('admin.teams.move', { team_id: 'team-1' }))
      .rejects.toThrow(AdminApiError);

    expect(invalidateGroupsWithTeamsCache).not.toHaveBeenCalled();
  });
});
