const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appsScriptPath = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'apps-script-connected',
  'Code.js'
);

function createAppsScriptContext() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(appsScriptPath, 'utf8'), context);
  return context;
}

describe('Apps Script team profile updates', () => {
  test('allows admins to update normalized profile fields with audit metadata', () => {
    const context = createAppsScriptContext();
    context.updateRecordFieldsAndAudit_ = jest.fn(
      (sheet, id, updates, user, action, reason) => ({
        id,
        name: 'Avodim United',
        short_name: null,
        logo: null,
        archived: false,
        ...updates
      })
    );

    const updated = context.handleAdminPost_({
      action: 'admin.teams.profile.update',
      team_id: 'team-1',
      profile_description: '  A community team  ',
      profile_history: '',
      home_community: ' Ubakala '
    }, { role: 'admin', email: 'admin@example.com' });

    expect(updated).toMatchObject({
      id: 'team-1',
      profile_description: 'A community team',
      profile_history: null,
      home_community: 'Ubakala'
    });
    expect(context.updateRecordFieldsAndAudit_).toHaveBeenCalledWith(
      'Teams',
      'team-1',
      {
        profile_description: 'A community team',
        profile_history: '',
        home_community: 'Ubakala'
      },
      { role: 'admin', email: 'admin@example.com' },
      'team.profile_updated',
      'Updated public team profile'
    );
  });

  test('rejects non-admin users before attempting a profile update', () => {
    const context = createAppsScriptContext();
    context.updateRecordFieldsAndAudit_ = jest.fn();

    expect(() => context.handleAdminPost_({
      action: 'admin.teams.profile.update',
      team_id: 'team-1'
    }, { role: 'ResultsEditor' })).toThrow(
      'You do not have permission to perform this action'
    );
    expect(context.updateRecordFieldsAndAudit_).not.toHaveBeenCalled();
  });

  test('rejects invalid profile values and reports missing sheet headers clearly', () => {
    const context = createAppsScriptContext();
    context.updateRecordFieldsAndAudit_ = jest.fn();

    expect(() => context.handleAdminPost_({
      action: 'admin.teams.profile.update',
      team_id: 'team-1',
      profile_description: 'x'.repeat(601)
    }, { role: 'admin' })).toThrow(
      'profile_description must be 600 characters or fewer'
    );
    expect(context.updateRecordFieldsAndAudit_).not.toHaveBeenCalled();
    expect(context.getAdminErrorMessage_(
      new Error('Teams sheet must have one home_community column')
    )).toMatch(/Add profile_description, profile_history, and home_community/);
  });
});
