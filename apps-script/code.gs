
const SPREADSHEET_ID = '1ZV770n5Y6xT-6Ch87Mf8MsKG_XpEXABFX2vfSyt-dhA';

/**
 * Web API entry point.
 * Supports read-only GET requests for approved resources.
 */
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : '';

    // Keep the original connection-test response when no action is supplied.
    if (!action) {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

      return jsonResponse({
        success: true,
        message: 'Ubakala Football League API connected successfully',
        spreadsheet: spreadsheet.getName(),
        sheets: spreadsheet.getSheets().map(sheet => sheet.getName())
      });
    }

    return jsonResponse(handleApiGet(action));

  } catch (error) {
    console.error('API GET error:', error);

    return jsonResponse({
      success: false,
      error: 'The API request could not be completed'
    });
  }
}

/**
 * Converts an object into a JSON HTTP response.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Checks the expected database headers.
 */
function checkDatabaseStructure() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  const expectedHeaders = {
    Teams: ['id', 'name', 'short_name', 'logo', 'archived'],
    Seasons: ['id', 'name', 'category', 'year', 'active', 'archived'],
    Groups: ['id', 'season_id', 'name'],
    TeamGroups: ['id', 'season_id', 'group_id', 'team_id'],
    News: [
      'id', 'title', 'content', 'image_url',
      'published', 'created_at', 'updated_at'
    ],
    UserRoles: [
      'id', 'email', 'role', 'active', 'created_at', 'updated_at'
    ],
    AuditLog: [
      'id', 'timestamp', 'user_email', 'action',
      'entity_type', 'entity_id', 'old_value',
      'new_value', 'reason'
    ]
  };

  const results = {};

  for (const [sheetName, expected] of Object.entries(expectedHeaders)) {
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      results[sheetName] = {
        ok: false,
        error: 'Sheet not found'
      };
      continue;
    }

    const actual = sheet
      .getRange(1, 1, 1, expected.length)
      .getDisplayValues()[0]
      .map(value => value.trim());

    results[sheetName] = {
      ok: expected.every((header, index) => actual[index] === header),
      expected: expected,
      actual: actual
    };
  }

  const matchesSheet = spreadsheet.getSheetByName('Matches');

  if (matchesSheet) {
    const lastColumn = matchesSheet.getLastColumn();

    const actual = lastColumn
      ? matchesSheet
          .getRange(1, 1, 1, lastColumn)
          .getDisplayValues()[0]
          .map(value => value.trim())
      : [];

    results.Matches = {
      ok: actual.length > 0 &&
        actual[0] === 'id' &&
        actual.includes('season_id') &&
        actual.includes('match_date') &&
        actual.includes('home_score') &&
        actual.includes('away_score') &&
        actual.includes('status'),
      headers: actual
    };
  } else {
    results.Matches = {
      ok: false,
      error: 'Sheet not found'
    };
  }

  const allOk = Object.values(results).every(result => result.ok);

  Logger.log(JSON.stringify({
    success: allOk,
    spreadsheet: spreadsheet.getName(),
    results: results
  }, null, 2));
}

/**
 * Reads a sheet and returns its non-empty rows as objects.
 */
function getSheetRecords(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Unknown database sheet: ' + sheetName);
  }

  const values = sheet.getDataRange().getDisplayValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(header => header.trim());

  return values.slice(1)
    .filter(row => row.some(value => value !== ''))
    .map(row => {
      const record = {};

      headers.forEach((header, index) => {
        if (header) {
          record[header] = row[index] === undefined ? '' : row[index];
        }
      });

      return record;
    });
}

/**
 * Read-only API router.
 */
function handleApiGet(action) {
  const allowedSheets = {
    teams: 'Teams',
    seasons: 'Seasons',
    groups: 'Groups',
    teamgroups: 'TeamGroups',
    matches: 'Matches',
    news: 'News'
  };

  const normalizedAction = String(action || '').trim().toLowerCase();
  const sheetName = allowedSheets[normalizedAction];

  if (!sheetName) {
    return {
      success: false,
      error: 'Unknown or unsupported API action'
    };
  }

  return {
    success: true,
    data: getSheetRecords(sheetName)
  };
}

/**
 * Local test: read teams.
 */
function testReadTeams() {
  const teams = getSheetRecords('Teams');

  Logger.log(JSON.stringify({
    success: true,
    count: teams.length,
    teams: teams
  }, null, 2));
}

/**
 * Local test: test the API router.
 */
function testApiRouter() {
  const result = handleApiGet('teams');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Local test: confirm all database headers.
 */
function testDatabaseStructure() {
  checkDatabaseStructure();
}
