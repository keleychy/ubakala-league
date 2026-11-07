
const SPREADSHEET_ID = '1ZV770n5Y6xT-6Ch87Mf8MsKG_XpEXABFX2vfSyt-dhA';
const SHEET_RECORD_CACHE_TTL_SECONDS = 30;
const SHEET_RECORD_CACHE_MAX_BYTES = 90 * 1024;
const FAIR_PLAY_CARD_FIELDS = [
  { field: 'home_fair_play_yellow_only', points: 1 },
  { field: 'home_fair_play_second_yellow_red', points: 3 },
  { field: 'home_fair_play_direct_red', points: 4 },
  { field: 'home_fair_play_yellow_direct_red', points: 5 },
  { field: 'away_fair_play_yellow_only', points: 1 },
  { field: 'away_fair_play_second_yellow_red', points: 3 },
  { field: 'away_fair_play_direct_red', points: 4 },
  { field: 'away_fair_play_yellow_direct_red', points: 5 }
];

/**
 * Web API entry point.
 * Supports read-only GET requests for approved resources.
 */
function doGet(e) {
  try {
    const parameters = e && e.parameter ? e.parameter : {};
    const action = parameters.action || '';

    if (!action) {
      return jsonResponse({
        success: true,
        message: 'Ubakala Football League API is available'
      });
    }
    return jsonResponse(handleApiGet(parameters));

  } catch (error) {
    console.error('API GET error:', error);

    return jsonResponse({
      success: false,
      error: 'The API request could not be completed'
    });
  }
}

/**
 * Handles authenticated administrator requests.
 * The Firebase ID token is verified server-side for every request.
 */
function doPost(e) {
  try {
    const body = JSON.parse(e && e.postData ? e.postData.contents || '{}' : '{}');
    if (body.action === 'news.recordView') {
      return jsonResponse({
        success: true,
        data: recordNewsView_(body)
      });
    }
    const user = authenticateAdmin_(body.idToken);
    const data = handleAdminPost_(body, user);
    return jsonResponse({ success: true, data: data });
  } catch (error) {
    console.error('Admin API POST error:', error);
    return jsonResponse({
      success: false,
      error: getAdminErrorMessage_(error)
    });
  }
}

function getAdminErrorMessage_(error) {
  if (error && error.safeMessage) {
    return error.safeMessage;
  }

  const message = String(error && error.message || '');
  if (/Firebase ID token is required/i.test(message)) {
    return 'No Firebase ID token was provided. Test admin login from the website; doPost requires a POST request body.';
  }
  if (/Unexpected end of JSON input|JSON\.parse/i.test(message)) {
    return 'Apps Script received an invalid admin request body.';
  }
  if (/authorization is required|permission to call UrlFetchApp|script\.external_request/i.test(message)) {
    return 'Apps Script needs authorization to contact Firebase. Run authorizeAdminApi() from the Apps Script editor and approve the requested permissions.';
  }
  if (/Unknown database sheet: UserRoles|UserRoles sheet not found/i.test(message)) {
    return 'The UserRoles sheet is missing. Add the required UserRoles sheet and retry.';
  }
  if (/AuditLog sheet not found/i.test(message)) {
    return 'The AuditLog sheet could not be created. Check that the Apps Script deployment owner can edit the spreadsheet, then retry.';
  }
  if (/AuditLog sheet must have one/i.test(message)) {
    return 'The AuditLog sheet has an invalid header row. Keep its existing audit data and ensure row 1 contains: id, timestamp, user_email, action, entity_type, entity_id, old_value, new_value, reason.';
  }
  if (/Matches sheet must have one/i.test(message)) {
    return 'The Matches sheet is missing a required column or has duplicate column headers. Check its header row and run testDatabaseStructure() in Apps Script.';
  }
  if (/Record not found/i.test(message)) {
    return 'This match could not be found in the spreadsheet. Refresh the Results Editor and try again.';
  }
  if (/spreadsheet|permission denied|access denied|openById/i.test(message)) {
    return 'Apps Script cannot access the spreadsheet. Check the spreadsheet ID and the account that owns the web app deployment.';
  }

  return 'The administrator request failed inside Apps Script. Check the latest failed execution in Apps Script for the detailed error.';
}

/**
 * Run this once from the Apps Script editor as the deployment owner.
 * The deliberately invalid token only checks that Firebase can be contacted;
 * it does not sign in or modify any data.
 */
function authorizeAdminApi() {
  const apiKey = PropertiesService.getScriptProperties()
    .getProperty('FIREBASE_WEB_API_KEY');
  if (!apiKey) {
    throw apiError_(
      'Set the FIREBASE_WEB_API_KEY script property before authorizing admin login'
    );
  }

  const userRolesSheet = SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName('UserRoles');
  if (!userRolesSheet) {
    throw apiError_('The UserRoles sheet is missing from the configured spreadsheet');
  }

  const response = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
      encodeURIComponent(apiKey),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: 'authorization-check' }),
      muteHttpExceptions: true
    }
  );

  Logger.log(
    'Firebase authorization check completed with HTTP ' +
      response.getResponseCode()
  );
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
    Matches: [
      'id', 'season_id', 'group_id', 'match_number', 'stage',
      'match_date', 'kickoff_time', 'home_team_id', 'away_team_id',
      'home_team_name', 'away_team_name', 'home_score', 'away_score',
      'home_penalties', 'away_penalties', 'status', 'result_type',
      'awarded_winner_team_id', 'award_reason', 'official_home_score',
      'official_away_score', 'venue', 'home_yellow_cards',
      'home_red_cards', 'away_yellow_cards', 'away_red_cards',
      'current_period', 'notes',
      'home_fair_play_yellow_only', 'home_fair_play_second_yellow_red',
      'home_fair_play_direct_red', 'home_fair_play_yellow_direct_red',
      'away_fair_play_yellow_only', 'away_fair_play_second_yellow_red',
      'away_fair_play_direct_red', 'away_fair_play_yellow_direct_red'
    ],
    News: [
      'id', 'title', 'content', 'image_url', 'inline_images',
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
  const cache = CacheService.getScriptCache();
  const cacheVersion = getSheetRecordsCacheVersion_(sheetName);
  const cacheKey = getSheetRecordsCacheKey_(sheetName, cacheVersion);

  try {
    const cachedRecords = cache.get(cacheKey);
    if (cachedRecords !== null) {
      try {
        return JSON.parse(cachedRecords);
      } catch (error) {
        console.warn('Ignoring invalid cached records for ' + sheetName, error);
        cache.remove(cacheKey);
      }
    }
  } catch (error) {
    console.warn('Could not read cached records for ' + sheetName, error);
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Unknown database sheet: ' + sheetName);
  }

  const values = sheet.getDataRange().getDisplayValues();

  let records = [];
  if (values.length >= 2) {
    const headers = values[0].map(header => header.trim());

    records = values.slice(1)
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

  const serializedRecords = JSON.stringify(records);
  const serializedSize = Utilities.newBlob(serializedRecords).getBytes().length;
  if (
    serializedSize <= SHEET_RECORD_CACHE_MAX_BYTES &&
    cacheVersion === getSheetRecordsCacheVersion_(sheetName)
  ) {
    try {
      cache.put(cacheKey, serializedRecords, SHEET_RECORD_CACHE_TTL_SECONDS);
    } catch (error) {
      console.warn('Could not cache records for ' + sheetName, error);
    }
  }

  return records;
}

function getSheetRecordsCacheVersion_(sheetName) {
  const key = 'sheet_records_cache_version_' + sheetName;
  return PropertiesService.getScriptProperties().getProperty(key) || '0';
}

function getSheetRecordsCacheKey_(sheetName, version) {
  return 'sheet_records_' + sheetName + '_' + version;
}

function invalidateSheetRecordsCache_(sheetName) {
  const properties = PropertiesService.getScriptProperties();
  const currentVersion = getSheetRecordsCacheVersion_(sheetName);
  const numericVersion = Number(currentVersion);
  const nextVersion = Number.isSafeInteger(numericVersion)
    ? String(numericVersion + 1)
    : '1';

  properties.setProperty(
    'sheet_records_cache_version_' + sheetName,
    nextVersion
  );
  CacheService.getScriptCache().remove(
    getSheetRecordsCacheKey_(sheetName, currentVersion)
  );
}

/**
 * Marks eligible scheduled matches as live once their kickoff time has arrived.
 * Intended to run from an authorized time-driven trigger.
 */
function updateScheduledMatchStatuses() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    console.warn('Match status update skipped because another execution holds the lock');
    return;
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('Matches');
    if (!sheet) {
      throw new Error('Matches sheet not found');
    }

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2 || lastColumn < 1) {
      return;
    }

    const rows = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
    const headers = rows[0].map(header => header.trim());
    const requiredHeaders = ['match_date', 'kickoff_time', 'status'];
    const columnIndexes = {};

    requiredHeaders.forEach(header => {
      const index = headers.indexOf(header);
      if (index < 0 || headers.lastIndexOf(header) !== index) {
        throw new Error('Matches sheet must have one ' + header + ' column');
      }
      columnIndexes[header] = index;
    });

    const now = new Date();
    const rowsToStart = [];

    rows.slice(1).forEach((row, index) => {
      const status = String(row[columnIndexes.status] || '').trim().toUpperCase();
      if (status !== 'PENDING' && status !== 'SCHEDULED') {
        return;
      }

      const kickoff = parseMatchKickoff_(row[columnIndexes.match_date], row[columnIndexes.kickoff_time]);
      if (kickoff && kickoff.getTime() <= now.getTime()) {
        rowsToStart.push(index + 2);
      }
    });

    try {
      rowsToStart.forEach(rowNumber => {
        sheet.getRange(rowNumber, columnIndexes.status + 1).setValue('LIVE');
      });
    } finally {
      if (rowsToStart.length > 0) {
        invalidateSheetRecordsCache_('Matches');
      }
    }

    Logger.log('Marked ' + rowsToStart.length + ' scheduled match(es) as LIVE');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Creates a one-minute trigger without duplicating an existing updater trigger.
 */
function installMatchStatusTrigger() {
  const existingTriggers = ScriptApp.getProjectTriggers().filter(
    trigger => trigger.getHandlerFunction() === 'updateScheduledMatchStatuses'
  );

  if (existingTriggers.length > 0) {
    Logger.log('Match status updater trigger already exists');
    return;
  }

  ScriptApp.newTrigger('updateScheduledMatchStatuses')
    .timeBased()
    .everyMinutes(1)
    .create();
}

function parseMatchKickoff_(dateValue, timeValue) {
  const date = String(dateValue || '').trim();
  const time = String(timeValue || '').trim();
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] || 0);
  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  const timezone = 'Africa/Lagos';
  const datePattern = 'yyyy-MM-dd';
  const dateValueParsed = Utilities.parseDate(date, timezone, datePattern);
  if (Utilities.formatDate(dateValueParsed, timezone, datePattern) !== date) {
    return null;
  }

  const normalizedTime =
    String(hours).padStart(2, '0') + ':' +
    String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0');
  const kickoffPattern = 'yyyy-MM-dd HH:mm:ss';
  const kickoff = Utilities.parseDate(
    date + ' ' + normalizedTime,
    timezone,
    kickoffPattern
  );

  return Utilities.formatDate(kickoff, timezone, kickoffPattern) ===
    date + ' ' + normalizedTime
    ? kickoff
    : null;
}

/**
 * Read-only API router.
 */
function handleApiGet(parameters) {
  const action = String(parameters.action || '').trim().toLowerCase();
  const seasonId = optionalId_(parameters.season_id || parameters.season);

  if (action === 'teams') {
    return {
      success: true,
      data: getSheetRecords('Teams').map(normalizeTeam_)
    };
  }

  if (action === 'seasons') {
    const category = optionalText_(parameters.category);
    const seasons = getSheetRecords('Seasons')
      .map(normalizeSeason_)
      .filter(season => !category || season.category === category.toLowerCase());
    return { success: true, data: seasons };
  }

  if (action === 'groups') {
    const groups = getSheetRecords('Groups').map(normalizeGroup_);
    return {
      success: true,
      data: groups.filter(group => !seasonId || group.season_id === seasonId)
    };
  }

  if (action === 'teamgroups') {
    const assignments = getSheetRecords('TeamGroups').map(normalizeTeamGroup_);
    return {
      success: true,
      data: assignments.filter(item => !seasonId || item.season_id === seasonId)
    };
  }

  if (action === 'groups-with-teams') {
    return {
      success: true,
      data: getGroupsWithTeams_(seasonId)
    };
  }

  if (action === 'matches') {
    const references = readReferences_();
    const matches = getSheetRecords('Matches')
      .map(record => normalizeMatch_(record, references))
      .filter(match => !seasonId || match.season_id === seasonId);
    return { success: true, data: matches };
  }

  if (action === 'news') {
    const publishedNews = getSheetRecords('News')
      .filter(record =>
        optionalBoolean_(record.published, 'News.published') === true
      )
      .map(normalizeNews_);
    const id = optionalId_(parameters.id);
    const data = id
      ? publishedNews.find(item => item.id === id) || null
      : publishedNews;
    return { success: true, data: data };
  }

  return {
    success: false,
    error: 'Unknown or unsupported API action'
  };
}

function handleAdminPost_(body, user) {
  const action = requiredText_(body.action, 'action');

  if (action === 'admin.me') {
    return { email: user.email, role: user.role };
  }
  if (action === 'admin.matches.list') {
    requireAdminPermission_(user, 'matches');
    const references = readReferences_();
    return getSheetRecords('Matches')
      .map(record => normalizeMatch_(record, references));
  }
  if (action === 'admin.news.list') {
    requireAdminPermission_(user, 'news');
    return getSheetRecords('News').map(normalizeNews_);
  }
  if (action === 'admin.seasons.list') {
    requireAdminPermission_(user, 'teams');
    return getSheetRecords('Seasons').map(normalizeSeason_);
  }
  if (action === 'admin.matches.setResult') {
    requireAdminPermission_(user, 'matches');
    return setMatchResult_(body, user);
  }
  if (action === 'admin.matches.setPeriod') {
    requireAdminPermission_(user, 'matches');
    return setMatchPeriod_(body, user);
  }
  if (action === 'admin.matches.setStatus') {
    requireAdminPermission_(user, 'matches');
    return setMatchStatus_(body, user);
  }
  if (action === 'admin.matches.markFinished') {
    requireAdminPermission_(user, 'matches');
    return markMatchFinished_(body, user);
  }
  if (action === 'admin.matches.reopen') {
    requireAdminPermission_(user, 'matches');
    return reopenMatch_(body, user);
  }
  if (action === 'admin.news.create') {
    requireAdminPermission_(user, 'news');
    return createNews_(body, user);
  }
  if (action === 'admin.news.update') {
    requireAdminPermission_(user, 'news');
    return updateNews_(body, user);
  }
  if (action === 'admin.news.delete') {
    requireAdminPermission_(user, 'news');
    return deleteNews_(body, user);
  }
  if (action === 'admin.groups.list') {
    requireAdminPermission_(user, 'teams');
    return getGroupsWithTeams_(optionalId_(body.season_id)).map(item => ({
      id: item.group.id,
      season_id: item.group.season_id,
      name: item.group.name,
      teams: item.teams
    }));
  }
  if (action === 'admin.teams.createManual') {
    requireAdminPermission_(user, 'teams');
    return createManualTeam_(body, user);
  }
  if (action === 'admin.teams.move') {
    requireAdminPermission_(user, 'teams');
    return moveTeam_(body, user);
  }
  if (action === 'admin.teams.import') {
    requireAdminPermission_(user, 'teams');
    return importTeams_(body, user);
  }

  throw apiError_('Unknown or unsupported administrator action');
}

function authenticateAdmin_(idToken) {
  const token = requiredText_(idToken, 'Firebase ID token');
  const apiKey = PropertiesService.getScriptProperties()
    .getProperty('FIREBASE_WEB_API_KEY');
  if (!apiKey) {
    throw apiError_('Administrator authentication is not configured');
  }

  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
    encodeURIComponent(apiKey);
  let response;
  try {
    response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: token }),
      muteHttpExceptions: true
    });
  } catch (error) {
    console.error('Firebase account lookup failed:', error);
    throw apiError_(
      'Apps Script could not contact Firebase. Run authorizeAdminApi() in the Apps Script editor and approve UrlFetch access.'
    );
  }
  if (response.getResponseCode() !== 200) {
    const responseText = response.getContentText();
    if (/API_KEY_INVALID|API_KEY_SERVICE_BLOCKED/.test(responseText)) {
      throw apiError_(
        'The FIREBASE_WEB_API_KEY script property is invalid or blocked. Set it to the Firebase web API key used by the frontend.'
      );
    }
    throw apiError_('Sign-in is invalid or has expired');
  }

  let result;
  try {
    result = JSON.parse(response.getContentText());
  } catch (error) {
    throw apiError_('Sign-in could not be verified');
  }
  const firebaseUser = result && result.users && result.users[0];
  const email = firebaseUser && optionalText_(firebaseUser.email);
  if (!firebaseUser || !email || firebaseUser.disabled || !firebaseUser.emailVerified) {
    throw apiError_('Verify your email address before using administrator tools');
  }

  const matchingRole = getSheetRecords('UserRoles').find(record =>
    optionalText_(record.email) &&
    optionalText_(record.email).toLowerCase() === email.toLowerCase() &&
    optionalBoolean_(record.active, 'UserRoles.active') === true
  );
  const role = matchingRole ? optionalText_(matchingRole.role) : null;
  if (!role || !isSupportedAdminRole_(role)) {
    throw apiError_('This account is not authorized for administrator access');
  }

  return { email: email.toLowerCase(), role: role };
}

function isSupportedAdminRole_(role) {
  return ['admin', 'resultseditor', 'newsuser'].includes(normalizeRole_(role));
}

function requireAdminPermission_(user, permission) {
  const role = normalizeRole_(user.role);
  const allowed =
    role === 'admin' ||
    (role === 'resultseditor' && permission === 'matches') ||
    (role === 'newsuser' && permission === 'news');
  if (!allowed) {
    throw apiError_('You do not have permission to perform this action');
  }
}

function normalizeRole_(role) {
  return String(role || '').toLowerCase().replace(/[\s_-]+/g, '');
}

function apiError_(message) {
  const error = new Error(message);
  error.safeMessage = message;
  return error;
}

function withAdminWriteLock_(callback) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw apiError_('Another administrator update is in progress; try again shortly');
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function getSheetHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error(sheet.getName() + ' sheet has no header row');
  }
  return sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(header => String(header).trim());
}

function getRecordRow_(sheet, id) {
  const headers = getSheetHeaders_(sheet);
  const idIndex = headers.indexOf('id');
  if (idIndex < 0 || headers.lastIndexOf('id') !== idIndex) {
    throw new Error(sheet.getName() + ' sheet must have one id column');
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    throw apiError_('Record not found');
  }
  const ids = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getDisplayValues();
  const offset = ids.findIndex(row => String(row[0]).trim() === String(id));
  if (offset < 0) {
    throw apiError_('Record not found');
  }
  return { headers: headers, rowNumber: offset + 2 };
}

function appendAuditLog_(user, action, entityType, entityId, oldValue, newValue, reason) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const required = [
    'id', 'timestamp', 'user_email', 'action', 'entity_type',
    'entity_id', 'old_value', 'new_value', 'reason'
  ];
  let sheet = spreadsheet.getSheetByName('AuditLog');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('AuditLog');
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
  }
  const headers = getSheetHeaders_(sheet);
  required.forEach(header => {
    if (headers.indexOf(header) < 0 || headers.lastIndexOf(header) !== headers.indexOf(header)) {
      throw new Error('AuditLog sheet must have one ' + header + ' column');
    }
  });
  const values = {
    id: Utilities.getUuid(),
    timestamp: new Date().toISOString(),
    user_email: user.email,
    action: action,
    entity_type: entityType,
    entity_id: String(entityId),
    old_value: JSON.stringify(oldValue === undefined ? null : oldValue),
    new_value: JSON.stringify(newValue === undefined ? null : newValue),
    reason: optionalText_(reason) || ''
  };
  sheet.appendRow(headers.map(header =>
    Object.prototype.hasOwnProperty.call(values, header) ? values[header] : ''
  ));
}

function readRowObject_(sheet, headers, rowNumber) {
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getDisplayValues()[0];
  return headers.reduce((record, header, index) => {
    if (header) record[header] = values[index] === undefined ? '' : values[index];
    return record;
  }, {});
}

function updateRecordFieldsAndAudit_(sheetName, id, updates, user, action, reason) {
  return withAdminWriteLock_(() => {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) throw new Error(sheetName + ' sheet not found');
    const location = getRecordRow_(sheet, id);
    const oldRecord = readRowObject_(sheet, location.headers, location.rowNumber);
    const nextRecord = Object.assign({}, oldRecord, updates);
    Object.keys(updates).forEach(field => {
      const index = location.headers.indexOf(field);
      if (index < 0 || location.headers.lastIndexOf(field) !== index) {
        throw new Error(sheetName + ' sheet must have one ' + field + ' column');
      }
    });

    let writeAttempted = false;
    try {
      Object.keys(updates).forEach(field => {
        const index = location.headers.indexOf(field);
        writeAttempted = true;
        sheet.getRange(location.rowNumber, index + 1).setValue(updates[field]);
      });
      try {
        appendAuditLog_(user, action, sheetName, id, oldRecord, nextRecord, reason);
      } catch (error) {
        Object.keys(updates).forEach(field => {
          const index = location.headers.indexOf(field);
          sheet.getRange(location.rowNumber, index + 1).setValue(oldRecord[field]);
        });
        throw error;
      }
      return nextRecord;
    } finally {
      if (writeAttempted) {
        invalidateSheetRecordsCache_(sheetName);
      }
    }
  });
}

function appendRecordAndAudit_(sheetName, record, user, action, entityId, reason) {
  return withAdminWriteLock_(() => {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) throw new Error(sheetName + ' sheet not found');
    const headers = getSheetHeaders_(sheet);
    Object.keys(record).forEach(field => {
      if (headers.indexOf(field) < 0 || headers.lastIndexOf(field) !== headers.indexOf(field)) {
        throw new Error(sheetName + ' sheet must have one ' + field + ' column');
      }
    });
    const rowNumber = sheet.getLastRow() + 1;
    let writeAttempted = false;
    try {
      writeAttempted = true;
      sheet.getRange(rowNumber, 1, 1, headers.length).setValues([
        headers.map(header =>
          Object.prototype.hasOwnProperty.call(record, header) ? record[header] : ''
        )
      ]);
      try {
        appendAuditLog_(user, action, sheetName, entityId, null, record, reason);
      } catch (error) {
        sheet.deleteRow(rowNumber);
        throw error;
      }
      return record;
    } finally {
      if (writeAttempted) {
        invalidateSheetRecordsCache_(sheetName);
      }
    }
  });
}

function requireRecordId_(body, fieldName) {
  const id = fieldName === 'match id'
    ? body.match_id || body.id
    : body.id;
  return requiredId_(id, fieldName || 'id');
}

function requiredNonNegativeInteger_(value, fieldName) {
  if (value === '' || value === null || value === undefined) {
    throw apiError_(fieldName + ' is required');
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw apiError_(fieldName + ' must be a non-negative integer');
  }
  return number;
}

function setMatchResult_(body, user) {
  const id = requireRecordId_(body, 'match id');
  const status = optionalText_(body.status)
    ? optionalText_(body.status).toUpperCase()
    : null;
  const updates = {
    home_score: requiredNonNegativeInteger_(body.home_score, 'home_score'),
    away_score: requiredNonNegativeInteger_(body.away_score, 'away_score')
  };
  if (status && !['FINISHED', 'AWARDED'].includes(status)) {
    throw apiError_('Only FINISHED or AWARDED matches can be finalized with a result');
  }

  if (status === 'FINISHED') {
    updates.status = 'FINISHED';
    updates.current_period = 'ENDED';
    updates.result_type = '';
    updates.awarded_winner_team_id = '';
    updates.award_reason = '';
  }

  if (status === 'AWARDED') {
    const resultType = requiredText_(body.result_type, 'result_type')
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
    const allowedResultTypes = ['WALKOVER', 'PROTEST', 'OTHER'];
    if (!allowedResultTypes.includes(resultType)) {
      throw apiError_('result_type must be WALKOVER, PROTEST, or OTHER');
    }

    const awardedWinner = requiredId_(
      body.awarded_winner_team_id,
      'awarded_winner_team_id'
    );
    const awardReason = requiredText_(body.award_reason, 'award_reason');
    const match = getSheetRecords('Matches')
      .find(record => String(record.id) === String(id));
    if (!match) throw apiError_('Match not found');
    if (
      awardedWinner !== String(match.home_team_id) &&
      awardedWinner !== String(match.away_team_id)
    ) {
      throw apiError_('Awarded winner must be one of the teams in this match');
    }

    if (resultType === 'WALKOVER') {
      updates.home_score = awardedWinner === String(match.home_team_id) ? 3 : 0;
      updates.away_score = awardedWinner === String(match.away_team_id) ? 3 : 0;
    }

    updates.status = 'AWARDED';
    updates.current_period = 'ENDED';
    updates.result_type = resultType;
    updates.awarded_winner_team_id = awardedWinner;
    updates.award_reason = awardReason;
  }

  const homePenalties = body.home_penalties !== undefined
    ? body.home_penalties
    : body.penalty_home;
  const awayPenalties = body.away_penalties !== undefined
    ? body.away_penalties
    : body.penalty_away;
  if (homePenalties !== undefined || awayPenalties !== undefined) {
    if (homePenalties === undefined || awayPenalties === undefined) {
      throw apiError_('Both penalty scores must be provided together');
    }
    updates.home_penalties = requiredNonNegativeInteger_(homePenalties, 'home_penalties');
    updates.away_penalties = requiredNonNegativeInteger_(awayPenalties, 'away_penalties');
  }
  const fairPlayFields = FAIR_PLAY_CARD_FIELDS.map(item => item.field);
  const fairPlayFieldsProvided = fairPlayFields.filter(field =>
    body[field] !== undefined
  );
  if (fairPlayFieldsProvided.length > 0 && fairPlayFieldsProvided.length !== fairPlayFields.length) {
    throw apiError_('Enter fair-play card counts for both teams, or leave all card counts blank');
  }
  if (fairPlayFieldsProvided.length === fairPlayFields.length) {
    ensureMatchFairPlayColumns_();
    fairPlayFields.forEach(field => {
      updates[field] = requiredNonNegativeInteger_(body[field], field);
    });
    updates.home_yellow_cards =
      updates.home_fair_play_yellow_only +
      updates.home_fair_play_second_yellow_red * 2 +
      updates.home_fair_play_yellow_direct_red;
    updates.home_red_cards =
      updates.home_fair_play_second_yellow_red +
      updates.home_fair_play_direct_red +
      updates.home_fair_play_yellow_direct_red;
    updates.away_yellow_cards =
      updates.away_fair_play_yellow_only +
      updates.away_fair_play_second_yellow_red * 2 +
      updates.away_fair_play_yellow_direct_red;
    updates.away_red_cards =
      updates.away_fair_play_second_yellow_red +
      updates.away_fair_play_direct_red +
      updates.away_fair_play_yellow_direct_red;
  }
  return updateMatchFieldsAndRecalculateQualifications_(
    'Matches', id, updates, user, 'match.result.updated', body.reason
  );
}

function ensureMatchFairPlayColumns_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Matches');
  if (!sheet) throw new Error('Matches sheet not found');
  const fields = FAIR_PLAY_CARD_FIELDS.map(item => item.field);
  const headers = getSheetHeaders_(sheet);
  const missing = fields.filter(field => headers.indexOf(field) < 0);
  if (missing.length === 0) return;

  const startColumn = sheet.getLastColumn() + 1;
  sheet.getRange(1, startColumn, 1, missing.length).setValues([missing]);
  invalidateSheetRecordsCache_('Matches');
}

function migrateFairPlayMatchColumns() {
  ensureMatchFairPlayColumns_();
  Logger.log('Fair-play match columns are ready.');
}

function setMatchPeriod_(body, user) {
  const id = requireRecordId_(body, 'match id');
  let period = requiredText_(body.current_period, 'current_period')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  const periodAliases = {
    '1ST_HALF': 'FIRST_HALF',
    HALF_TIME: 'HALFTIME',
    '2ND_HALF': 'SECOND_HALF',
    SHOOTOUT: 'PENALTIES'
  };
  period = periodAliases[period] || period;
  const allowedPeriods = [
    'NOT_STARTED', 'FIRST_HALF', 'HALFTIME', 'SECOND_HALF',
    'EXTRA_TIME', 'EXTRA_TIME_FIRST_HALF', 'EXTRA_TIME_SECOND_HALF',
    'PENALTIES', 'ENDED'
  ];
  if (!allowedPeriods.includes(period)) {
    throw apiError_('current_period is not supported');
  }
  return updateRecordFieldsAndAudit_(
    'Matches', id, { current_period: period }, user, 'match.period.updated', body.reason
  );
}

function setMatchStatus_(body, user) {
  const id = requireRecordId_(body, 'match id');
  const status = requiredText_(body.status, 'status').toUpperCase();
  const allowedStatuses = [
    'PENDING', 'SCHEDULED', 'LIVE', 'FINISHED', 'AWARDED',
    'POSTPONED', 'CANCELLED', 'ABANDONED', 'VOID'
  ];
  if (!allowedStatuses.includes(status)) {
    throw apiError_('status is not supported');
  }
  if (status === 'FINISHED' || status === 'AWARDED') {
    throw apiError_('Use the match finalization action to save a finished or awarded result');
  }
  return updateMatchFieldsAndRecalculateQualifications_(
    'Matches', id, { status: status }, user, 'match.status.updated', body.reason
  );
}

function markMatchFinished_(body, user) {
  const id = requireRecordId_(body, 'match id');
  const status = requiredText_(body.status, 'status').toUpperCase();
  if (['FINISHED', 'AWARDED'].includes(status)) {
    return setMatchResult_(Object.assign({}, body, { status: status }), user);
  }
  if (['CANCELLED', 'ABANDONED', 'VOID'].includes(status)) {
    return setMatchStatus_(Object.assign({}, body, { status: status }), user);
  }

  throw apiError_(
    'Pending, scheduled, live, and postponed matches cannot be finalized'
  );
}

function reopenMatch_(body, user) {
  const id = requireRecordId_(body, 'match id');
  const reason = requiredText_(body.reason, 'reason');
  return updateMatchFieldsAndRecalculateQualifications_(
    'Matches',
    id,
    { status: 'SCHEDULED', current_period: 'NOT_STARTED' },
    user,
    'match.reopened',
    reason
  );
}

function updateMatchFieldsAndRecalculateQualifications_(
  sheetName, id, updates, user, action, reason
) {
  const updated = updateRecordFieldsAndAudit_(
    sheetName, id, updates, user, action, reason
  );
  const match = getSheetRecords('Matches')
    .find(record => String(record.id) === String(id));
  if (!match || !isGroupStageRecord_(match)) {
    return updated;
  }

  try {
    recalculateGroupQualifications_(String(match.season_id), user);
  } catch (error) {
    console.error('Group qualification synchronization failed:', error);
    throw apiError_(
      'The match update was saved, but group qualification could not be synchronized. ' +
      'Refresh and retry the match update.'
    );
  }
  return updated;
}

function isGroupStageRecord_(match) {
  const stage = String(match.stage || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return stage === 'GROUP' || stage === 'GROUP_STAGE';
}

function recalculateGroupQualifications_(seasonId, user) {
  const groups = getSheetRecords('Groups')
    .map(normalizeGroup_)
    .filter(group => group.season_id === seasonId);
  const assignments = getSheetRecords('TeamGroups')
    .map(normalizeTeamGroup_)
    .filter(assignment => assignment.season_id === seasonId);
  const teamsById = Object.create(null);
  getSheetRecords('Teams').map(normalizeTeam_).forEach(team => {
    teamsById[team.id] = team;
  });
  const seasonMatches = getSheetRecords('Matches')
    .filter(match => String(match.season_id) === seasonId);
  const qualifiersByGroup = Object.create(null);

  groups.forEach(group => {
    const teamIds = assignments
      .filter(assignment => assignment.group_id === group.id)
      .map(assignment => assignment.team_id)
      .filter(teamId => teamsById[teamId]);
    if (teamIds.length < 2) return;

    const teamIdSet = new Set(teamIds);
    const groupMatches = seasonMatches.filter(match =>
      String(match.group_id || '') === group.id && isGroupStageRecord_(match) &&
      teamIdSet.has(String(match.home_team_id || '')) &&
      teamIdSet.has(String(match.away_team_id || ''))
    );
    const scheduledMatches = Object.create(null);
    const playedMatches = Object.create(null);
    const standings = Object.create(null);
    const completedGroupMatches = [];

    teamIds.forEach(teamId => {
      scheduledMatches[teamId] = 0;
      playedMatches[teamId] = 0;
      standings[teamId] = {
        team_id: teamId,
        team_name: teamsById[teamId].name,
        points: 0,
        goals_for: 0,
        goals_against: 0,
        fair_play_points: 0,
        fair_play_complete: true
      };
    });

    groupMatches.forEach(match => {
      const homeId = String(match.home_team_id);
      const awayId = String(match.away_team_id);
      scheduledMatches[homeId] += 1;
      scheduledMatches[awayId] += 1;

      const status = String(match.status || '').trim().toUpperCase();
      if (status !== 'FINISHED' && status !== 'AWARDED') return;

      const homeScore = Number(match.home_score || 0);
      const awayScore = Number(match.away_score || 0);
      if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return;

      playedMatches[homeId] += 1;
      playedMatches[awayId] += 1;
      completedGroupMatches.push({
        home_id: homeId,
        away_id: awayId,
        home_score: homeScore,
        away_score: awayScore
      });
      standings[homeId].goals_for += homeScore;
      standings[homeId].goals_against += awayScore;
      standings[awayId].goals_for += awayScore;
      standings[awayId].goals_against += homeScore;
      const cardFields = FAIR_PLAY_CARD_FIELDS.map(item => [
        item.field, item.points
      ]);
      const cardValues = cardFields.map(([field]) =>
        match[field] === '' || match[field] === null || match[field] === undefined
          ? NaN
          : Number(match[field])
      );
      if (cardValues.some(value => !Number.isInteger(value) || value < 0)) {
        standings[homeId].fair_play_complete = false;
        standings[awayId].fair_play_complete = false;
      } else {
        cardFields.forEach(([field, penalty]) => {
          const value = Number(match[field]);
          const teamId = field.startsWith('home_') ? homeId : awayId;
          standings[teamId].fair_play_points += value * penalty;
        });
      }
      if (homeScore > awayScore) {
        standings[homeId].points += 3;
      } else if (awayScore > homeScore) {
        standings[awayId].points += 3;
      } else {
        standings[homeId].points += 1;
        standings[awayId].points += 1;
      }
    });

    const groupIsComplete = teamIds.every(teamId =>
      scheduledMatches[teamId] > 0 &&
      playedMatches[teamId] >= scheduledMatches[teamId]
    );
    if (!groupIsComplete) return;

    const rankedTeams = Object.keys(standings).map(teamId => {
      const team = standings[teamId];
      return Object.assign({}, team, {
        goal_difference: team.goals_for - team.goals_against
      });
    });
    const splitTiedTeams = (teams, compare) => {
      const sorted = teams.slice().sort(compare);
      return sorted.reduce((groups, team) => {
        const current = groups[groups.length - 1];
        if (!current || compare(current[0], team) !== 0) {
          groups.push([team]);
        } else {
          current.push(team);
        }
        return groups;
      }, []);
    };
    const compareOverall = (left, right) =>
      right.points - left.points ||
      right.goal_difference - left.goal_difference ||
      right.goals_for - left.goals_for;
    const compareHeadToHead = (left, right) =>
      right.head_to_head_points - left.head_to_head_points ||
      right.head_to_head_goal_difference - left.head_to_head_goal_difference ||
      right.head_to_head_goals_for - left.head_to_head_goals_for;

    const resolveHeadToHeadTies = tiedTeams => {
      const tiedTeamIds = new Set(tiedTeams.map(team => team.team_id));
      const miniTable = Object.create(null);
      tiedTeams.forEach(team => {
        miniTable[team.team_id] = {
          points: 0,
          goals_for: 0,
          goals_against: 0
        };
      });
      completedGroupMatches.forEach(match => {
        if (!tiedTeamIds.has(match.home_id) || !tiedTeamIds.has(match.away_id)) return;
        const home = miniTable[match.home_id];
        const away = miniTable[match.away_id];
        home.goals_for += match.home_score;
        home.goals_against += match.away_score;
        away.goals_for += match.away_score;
        away.goals_against += match.home_score;
        if (match.home_score > match.away_score) {
          home.points += 3;
        } else if (match.home_score < match.away_score) {
          away.points += 3;
        } else {
          home.points += 1;
          away.points += 1;
        }
      });

      const miniRanked = tiedTeams.map(team => {
        const stats = miniTable[team.team_id];
        return Object.assign({}, team, {
          head_to_head_points: stats.points,
          head_to_head_goal_difference: stats.goals_for - stats.goals_against,
          head_to_head_goals_for: stats.goals_for
        });
      });
      const partitions = splitTiedTeams(miniRanked, compareHeadToHead);
      if (partitions.length === 1) return [tiedTeams];
      return partitions.flatMap(partition =>
        partition.length > 1 ? resolveHeadToHeadTies(partition) : [partition]
      );
    };

    const finalRankingGroups = [];
    splitTiedTeams(rankedTeams, compareOverall).forEach(overallGroup => {
      const headToHeadGroups = overallGroup.length > 1
        ? resolveHeadToHeadTies(overallGroup)
        : [overallGroup];
      headToHeadGroups.forEach(headToHeadGroup => {
        if (headToHeadGroup.length === 1) {
          finalRankingGroups.push(headToHeadGroup);
          return;
        }
        if (!headToHeadGroup.every(team => team.fair_play_complete)) {
          finalRankingGroups.push(headToHeadGroup);
          return;
        }
        splitTiedTeams(
          headToHeadGroup,
          (left, right) => left.fair_play_points - right.fair_play_points
        ).forEach(fairPlayGroup => finalRankingGroups.push(fairPlayGroup));
      });
    });

    if (
      finalRankingGroups.length < 2 ||
      finalRankingGroups[0].length !== 1 ||
      finalRankingGroups[1].length !== 1
    ) return;

    qualifiersByGroup[group.name.toUpperCase()] = {
      first: finalRankingGroups[0][0],
      second: finalRankingGroups[1][0]
    };
  });

  const quarterfinalSlots = {
    22: { home: ['first', 'A'], away: ['second', 'B'] },
    23: { home: ['first', 'B'], away: ['second', 'A'] },
    24: { home: ['first', 'C'], away: ['second', 'D'] },
    25: { home: ['first', 'D'], away: ['second', 'C'] }
  };
  let updatedCount = 0;

  seasonMatches.forEach(match => {
    const matchNumber = Number(match.match_number);
    const slots = quarterfinalSlots[matchNumber];
    const stage = String(match.stage || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (!slots || !['QF', 'QUARTERFINAL', 'QUARTERFINALS'].includes(stage)) return;

    const resolveSlot = slot => {
      const [place, groupName] = slot;
      const qualifier = qualifiersByGroup[groupName];
      const team = qualifier && qualifier[place];
      return {
        id: team ? team.team_id : '',
        name: team ? team.team_name : place === 'first'
          ? '1st ' + groupName
          : '2nd ' + groupName
      };
    };
    const home = resolveSlot(slots.home);
    const away = resolveSlot(slots.away);
    const updates = {};
    if (String(match.home_team_id || '') !== home.id) {
      updates.home_team_id = home.id;
    }
    if (String(match.away_team_id || '') !== away.id) {
      updates.away_team_id = away.id;
    }
    if (String(match.home_team_name || '') !== home.name) {
      updates.home_team_name = home.name;
    }
    if (String(match.away_team_name || '') !== away.name) {
      updates.away_team_name = away.name;
    }
    if (Object.keys(updates).length === 0) return;

    updateRecordFieldsAndAudit_(
      'Matches',
      String(match.id),
      updates,
      user,
      'match.qualification.updated',
      'Automatically synchronized after a group-stage result or status change'
    );
    updatedCount += 1;
  });

  return updatedCount;
}

function validateNewsInput_(body, partial) {
  const updates = {};
  ['title', 'subtitle', 'content', 'author', 'image_url'].forEach(field => {
    if (partial && body[field] === undefined) return;
    const value = optionalText_(body[field]);
    if (field === 'title' || field === 'content') {
      if (!value) throw apiError_(field + ' is required');
      if (field === 'content' && value.length < 20) {
        throw apiError_('content must be at least 20 characters');
      }
      updates[field] = value;
    } else {
      updates[field] = value || '';
    }
  });
  if (updates.image_url) {
    if (!isValidHttpImageUrl_(updates.image_url)) {
      throw apiError_('image_url must be a valid URL');
    }
  }
  if (!partial || body.inline_images !== undefined) {
    const inlineImages = body.inline_images === undefined ? [] : body.inline_images;
    if (!Array.isArray(inlineImages) || inlineImages.length > 10) {
      throw apiError_('inline_images must be an array with no more than 10 images');
    }
    const paragraphs = String(
      updates.content !== undefined ? updates.content : body.content || ''
    ).split(/\r?\n(?:[ \t]*\r?\n)+/).filter(paragraph => paragraph.trim());
    updates.inline_images = JSON.stringify(inlineImages.map((image, index) => {
      if (!image || typeof image !== 'object' || Array.isArray(image)) {
        throw apiError_('Inline image ' + (index + 1) + ' is invalid');
      }
      const url = requiredText_(image.url, 'inline_images[' + index + '].url');
      if (!isValidHttpImageUrl_(url)) {
        throw apiError_('Inline image ' + (index + 1) + ' must have a valid HTTP or HTTPS URL');
      }
      const afterParagraph = Number(image.after_paragraph);
      if (
        !Number.isInteger(afterParagraph) ||
        afterParagraph < 1 ||
        afterParagraph > paragraphs.length
      ) {
        throw apiError_(
          'Inline image ' + (index + 1) + ' must be placed after an existing paragraph'
        );
      }
      return {
        url: url,
        caption: optionalText_(image.caption) || '',
        after_paragraph: afterParagraph
      };
    }));
  }
  return updates;
}

function ensureNewsInlineImagesColumn_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('News');
  if (!sheet) throw new Error('News sheet not found');
  const headers = getSheetHeaders_(sheet);
  if (headers.indexOf('inline_images') >= 0) return;
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue('inline_images');
  invalidateSheetRecordsCache_('News');
}

function isValidHttpImageUrl_(value) {
  const candidate = optionalText_(value);
  if (!candidate || /[\u0000-\u0020\u007f]/.test(candidate)) {
    return false;
  }

  if (typeof URL === 'function') {
    try {
      const parsedUrl = new URL(candidate);
      return (
        (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') &&
        Boolean(parsedUrl.hostname) &&
        !parsedUrl.username &&
        !parsedUrl.password
      );
    } catch (error) {
      // Use the strict fallback for Apps Script deployments without URL parsing support.
    }
  }

  const match = /^(https?):\/\/([a-z0-9.-]+)(?::([0-9]{1,5}))?(?:[/?#]|$)/i.exec(candidate);
  if (!match) {
    return false;
  }

  const hostname = match[2].replace(/\.$/, '');
  const labels = hostname.split('.');
  if (
    !hostname ||
    hostname.length > 253 ||
    labels.some(label =>
      label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    )
  ) {
    return false;
  }

  return match[3] === undefined || Number(match[3]) <= 65535;
}

function createNews_(body, user) {
  ensureNewsInlineImagesColumn_();
  const timestamp = new Date().toISOString();
  const id = Utilities.getUuid();
  const record = Object.assign(validateNewsInput_(body, false), {
    id: id,
    published: body.published === false ? 'FALSE' : 'TRUE',
    created_at: timestamp,
    updated_at: timestamp
  });
  appendRecordAndAudit_(
    'News', record, user, 'news.created', id, body.reason
  );
  return normalizeNews_(record);
}

function updateNews_(body, user) {
  ensureNewsInlineImagesColumn_();
  const id = requireRecordId_(body, 'news id');
  const updates = validateNewsInput_(body, true);
  if (body.published !== undefined) {
    if (typeof body.published !== 'boolean') {
      throw apiError_('published must be a boolean');
    }
    updates.published = body.published ? 'TRUE' : 'FALSE';
  }
  if (!Object.keys(updates).length) {
    throw apiError_('No news fields were provided');
  }
  updates.updated_at = new Date().toISOString();
  const updated = updateRecordFieldsAndAudit_(
    'News', id, updates, user, 'news.updated', body.reason
  );
  return normalizeNews_(updated);
}

function deleteNews_(body, user) {
  const id = requireRecordId_(body, 'news id');
  return withAdminWriteLock_(() => {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('News');
    if (!sheet) throw new Error('News sheet not found');
    const location = getRecordRow_(sheet, id);
    const oldRecord = readRowObject_(sheet, location.headers, location.rowNumber);
    appendAuditLog_(user, 'news.deleted', 'News', id, oldRecord, null, body.reason);
    try {
      sheet.deleteRow(location.rowNumber);
    } catch (error) {
      sheet.insertRowBefore(location.rowNumber);
      sheet.getRange(location.rowNumber, 1, 1, location.headers.length)
        .setValues([location.headers.map(header => oldRecord[header] || '')]);
      throw error;
    } finally {
      invalidateSheetRecordsCache_('News');
    }
    return { id: id, deleted: true };
  });
}

function recordNewsView_(body) {
  const newsId = requiredId_(body.news_id, 'news_id');
  const visitorId = requiredText_(body.visitor_id, 'visitor_id');
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(visitorId)) {
    throw apiError_('A valid visitor_id is required');
  }

  const visitorHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    visitorId,
    Utilities.Charset.UTF_8
  ).map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');

  return withAdminWriteLock_(() => {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const newsSheet = spreadsheet.getSheetByName('News');
    if (!newsSheet) throw new Error('News sheet not found');
    const newsLocation = getRecordRow_(newsSheet, newsId);
    const newsRecord = readRowObject_(
      newsSheet,
      newsLocation.headers,
      newsLocation.rowNumber
    );
    if (!optionalBoolean_(newsRecord.published, 'News.published')) {
      throw apiError_('Published news article not found');
    }

    let viewsIndex = newsLocation.headers.indexOf('views');
    if (viewsIndex < 0) {
      viewsIndex = newsLocation.headers.length;
      newsSheet.getRange(1, viewsIndex + 1).setValue('views');
      newsLocation.headers.push('views');
    } else if (newsLocation.headers.lastIndexOf('views') !== viewsIndex) {
      throw new Error('News sheet must have one views column');
    }

    const viewerHeaders = ['news_id', 'viewer_hash', 'last_viewed_at'];
    let viewersSheet = spreadsheet.getSheetByName('NewsViewers');
    if (!viewersSheet) {
      viewersSheet = spreadsheet.insertSheet('NewsViewers');
      viewersSheet.getRange(1, 1, 1, viewerHeaders.length).setValues([viewerHeaders]);
    } else if (viewersSheet.getLastRow() === 0) {
      viewersSheet.getRange(1, 1, 1, viewerHeaders.length).setValues([viewerHeaders]);
    }

    const actualViewerHeaders = getSheetHeaders_(viewersSheet);
    viewerHeaders.forEach(header => {
      if (
        actualViewerHeaders.indexOf(header) < 0 ||
        actualViewerHeaders.lastIndexOf(header) !== actualViewerHeaders.indexOf(header)
      ) {
        throw new Error('NewsViewers sheet must have one ' + header + ' column');
      }
    });

    const newsIdIndex = actualViewerHeaders.indexOf('news_id');
    const viewerHashIndex = actualViewerHeaders.indexOf('viewer_hash');
    const lastViewedIndex = actualViewerHeaders.indexOf('last_viewed_at');
    const lastViewerRow = viewersSheet.getLastRow();
    const viewerRows = lastViewerRow > 1
      ? viewersSheet.getRange(2, 1, lastViewerRow - 1, actualViewerHeaders.length)
          .getValues()
      : [];
    const existingIndex = viewerRows.findIndex(row =>
      String(row[newsIdIndex]) === newsId &&
      String(row[viewerHashIndex]) === visitorHash
    );
    const now = Date.now();
    const existingTimestamp = existingIndex < 0
      ? null
      : Number(viewerRows[existingIndex][lastViewedIndex]);
    const viewsCell = newsSheet.getRange(newsLocation.rowNumber, viewsIndex + 1);
    const currentViews = Number(viewsCell.getValue()) || 0;

    if (existingTimestamp !== null && now - existingTimestamp < 24 * 60 * 60 * 1000) {
      return { views: currentViews };
    }

    if (existingIndex < 0) {
      viewersSheet.appendRow(actualViewerHeaders.map(header => ({
        news_id: newsId,
        viewer_hash: visitorHash,
        last_viewed_at: now
      })[header] || ''));
    } else {
      viewersSheet.getRange(existingIndex + 2, lastViewedIndex + 1).setValue(now);
    }

    const nextViews = currentViews + 1;
    viewsCell.setValue(nextViews);
    invalidateSheetRecordsCache_('News');
    return { views: nextViews };
  });
}

function findSeasonForTeam_(category, seasonId) {
  const normalizedCategory = requiredText_(category, 'category').toLowerCase();
  const season = getSheetRecords('Seasons')
    .map(normalizeSeason_)
    .find(item => item.id === String(seasonId) && item.category === normalizedCategory);
  if (!season) {
    throw apiError_('The selected season does not match the selected category');
  }
  return season;
}

function findGroupForTeam_(seasonId, groupName) {
  const name = requiredText_(groupName, 'group_name').toLowerCase();
  const group = getSheetRecords('Groups')
    .map(normalizeGroup_)
    .find(item => item.season_id === String(seasonId) && item.name.toLowerCase() === name);
  if (!group) {
    throw apiError_('The selected group does not belong to the selected season');
  }
  return group;
}

function canonicalTeamName_(value) {
  return requiredText_(value, 'team name').toLowerCase().replace(/\s+/g, ' ');
}

function findTeamByName_(name) {
  const canonical = canonicalTeamName_(name);
  return getSheetRecords('Teams')
    .map(normalizeTeam_)
    .find(team => canonicalTeamName_(team.name) === canonical) || null;
}

function findTeamAssignment_(seasonId, teamId) {
  return getSheetRecords('TeamGroups')
    .map(normalizeTeamGroup_)
    .find(item => item.season_id === String(seasonId) && item.team_id === String(teamId)) || null;
}

function createTeamRecord_(name) {
  return {
    id: Utilities.getUuid(),
    name: requiredText_(name, 'team_name'),
    short_name: '',
    logo: '',
    archived: 'FALSE'
  };
}

function createTeamAssignment_(seasonId, groupId, teamId) {
  return {
    id: Utilities.getUuid(),
    season_id: String(seasonId),
    group_id: String(groupId),
    team_id: String(teamId)
  };
}

function createManualTeam_(body, user) {
  const teamName = requiredText_(body.team_name, 'team_name');
  const season = findSeasonForTeam_(body.category, body.season_id);
  const group = findGroupForTeam_(season.id, body.group_name);
  let team = findTeamByName_(teamName);
  if (team && findTeamAssignment_(season.id, team.id)) {
    throw apiError_('This team is already assigned in the selected season');
  }

  if (!team) {
    team = appendRecordAndAudit_(
      'Teams',
      createTeamRecord_(teamName),
      user,
      'team.created',
      'new',
      body.reason
    );
  }
  const assignment = appendRecordAndAudit_(
    'TeamGroups',
    createTeamAssignment_(season.id, group.id, team.id),
    user,
    'team.assigned',
    team.id,
    body.reason
  );
  return {
    team: normalizeTeam_(team),
    assignment: normalizeTeamGroup_(assignment)
  };
}

function moveTeam_(body, user) {
  const teamId = requiredId_(body.team_id, 'team_id');
  const targetGroupId = requiredId_(body.to_group_id, 'to_group_id');
  const seasonId = requiredId_(body.season_id, 'season_id');
  const groups = getSheetRecords('Groups').map(normalizeGroup_);
  const targetGroup = groups.find(group =>
    group.id === targetGroupId && group.season_id === seasonId
  );
  if (!targetGroup) {
    throw apiError_('The destination group does not belong to the selected season');
  }
  const assignment = findTeamAssignment_(seasonId, teamId);
  if (!assignment) {
    throw apiError_('The team is not assigned in the selected season');
  }
  if (assignment.group_id === targetGroupId) {
    return assignment;
  }
  const duplicate = getSheetRecords('TeamGroups')
    .map(normalizeTeamGroup_)
    .some(item =>
      item.season_id === seasonId &&
      item.group_id === targetGroupId &&
      item.team_id === teamId
    );
  if (duplicate) {
    throw apiError_('The team is already assigned to the destination group');
  }
  const updated = updateRecordFieldsAndAudit_(
    'TeamGroups',
    assignment.id,
    { group_id: targetGroupId },
    user,
    'team.group_moved',
    body.reason
  );
  return normalizeTeamGroup_(updated);
}

function getImportValue_(row, names) {
  const keys = Object.keys(row || {});
  const match = keys.find(key =>
    names.includes(String(key).trim().toLowerCase().replace(/[\s_-]+/g, ''))
  );
  return match ? optionalText_(row[match]) : null;
}

function importTeams_(body, user) {
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    throw apiError_('The import must contain at least one team row');
  }
  if (body.rows.length > 500) {
    throw apiError_('A maximum of 500 team rows can be imported at once');
  }
  const results = [];

  body.rows.forEach((row, index) => {
    const teamName = getImportValue_(row, ['teamname', 'name']);
    const category = getImportValue_(row, ['category']);
    const seasonValue = getImportValue_(row, ['season', 'seasonid']);
    const groupName = getImportValue_(row, ['group', 'groupname']);
    try {
      if (!teamName || !category || !seasonValue || !groupName) {
        throw apiError_('Team Name, Category, Season and Group are required');
      }
      const categoryKey = category.toLowerCase().replace(/[\s-]+/g, '_');
      const seasons = getSheetRecords('Seasons').map(normalizeSeason_);
      const season = seasons.find(item =>
        item.category === categoryKey &&
        (item.id === seasonValue || item.name.toLowerCase() === seasonValue.toLowerCase() ||
          String(item.year) === seasonValue)
      );
      if (!season) {
        throw apiError_('No matching season was found for this category');
      }
      const group = findGroupForTeam_(season.id, groupName);
      let team = findTeamByName_(teamName);
      let created = false;
      if (!team) {
        team = appendRecordAndAudit_(
          'Teams', createTeamRecord_(teamName), user, 'team.created', 'import', ''
        );
        created = true;
      }
      if (findTeamAssignment_(season.id, team.id)) {
        results.push({
          team: teamName,
          status: 'skipped',
          reason: 'Already assigned in this season'
        });
        return;
      }
      appendRecordAndAudit_(
        'TeamGroups',
        createTeamAssignment_(season.id, group.id, team.id),
        user,
        'team.imported',
        team.id,
        ''
      );
      results.push({
        team: teamName,
        status: created ? 'created' : 'assigned',
        reason: ''
      });
    } catch (error) {
      results.push({
        team: teamName || 'Row ' + (index + 2),
        status: 'error',
        reason: error && error.safeMessage ? error.safeMessage : 'Import row could not be processed'
      });
    }
  });
  return { results: results };
}

function readReferences_() {
  const teams = getSheetRecords('Teams').map(normalizeTeam_);
  const seasons = getSheetRecords('Seasons').map(normalizeSeason_);
  const groups = getSheetRecords('Groups').map(normalizeGroup_);
  return {
    teamsById: indexById_(teams),
    seasonsById: indexById_(seasons),
    groupsById: indexById_(groups)
  };
}

function getGroupsWithTeams_(seasonId) {
  const groups = getSheetRecords('Groups')
    .map(normalizeGroup_)
    .filter(group => !seasonId || group.season_id === seasonId);
  const assignments = getSheetRecords('TeamGroups')
    .map(normalizeTeamGroup_)
    .filter(item => !seasonId || item.season_id === seasonId);
  const teamsById = indexById_(
    getSheetRecords('Teams').map(normalizeTeam_)
  );
  const assignmentsByGroup = Object.create(null);

  assignments.forEach(assignment => {
    if (!assignmentsByGroup[assignment.group_id]) {
      assignmentsByGroup[assignment.group_id] = [];
    }

    const team = teamsById[assignment.team_id];
    if (!team) {
      throw new Error('Team assignment references an unknown team');
    }
    assignmentsByGroup[assignment.group_id].push(team);
  });

  return groups.map(group => ({
    group: { id: group.id, season_id: group.season_id, name: group.name },
    teams: assignmentsByGroup[group.id] || []
  }));
}

function normalizeTeam_(record) {
  return {
    id: requiredId_(record.id, 'Teams.id'),
    name: requiredText_(record.name, 'Teams.name'),
    short_name: optionalText_(record.short_name),
    logo: optionalText_(record.logo),
    archived: optionalBoolean_(record.archived, 'Teams.archived')
  };
}

function normalizeSeason_(record) {
  return {
    id: requiredId_(record.id, 'Seasons.id'),
    name: requiredText_(record.name, 'Seasons.name'),
    category: requiredText_(record.category, 'Seasons.category').toLowerCase(),
    year: optionalNumber_(record.year, 'Seasons.year'),
    active: optionalBoolean_(record.active, 'Seasons.active'),
    archived: optionalBoolean_(record.archived, 'Seasons.archived')
  };
}

function normalizeGroup_(record) {
  return {
    id: requiredId_(record.id, 'Groups.id'),
    season_id: requiredId_(record.season_id, 'Groups.season_id'),
    name: requiredText_(record.name, 'Groups.name')
  };
}

function normalizeTeamGroup_(record) {
  return {
    id: requiredId_(record.id, 'TeamGroups.id'),
    season_id: requiredId_(record.season_id, 'TeamGroups.season_id'),
    group_id: requiredId_(record.group_id, 'TeamGroups.group_id'),
    team_id: requiredId_(record.team_id, 'TeamGroups.team_id')
  };
}

function normalizeMatch_(record, references) {
  const id = requiredId_(record.id, 'Matches.id');
  const seasonId = requiredId_(record.season_id, 'Matches.season_id');
  const groupId = optionalId_(record.group_id);
  const homeTeamId = optionalId_(record.home_team_id);
  const awayTeamId = optionalId_(record.away_team_id);
  const stage = optionalText_(record.stage);
  const date = normalizeDate_(record.match_date);
  const kickoffTime = normalizeTime_(record.kickoff_time);

  return {
    id: id,
    season_id: seasonId,
    season: references.seasonsById[seasonId] || { id: seasonId },
    group_id: groupId,
    group: groupId ? references.groupsById[groupId] || { id: groupId } : null,
    match_number: optionalNumber_(record.match_number, 'Matches.match_number'),
    matchday: optionalNumber_(record.match_number, 'Matches.match_number'),
    stage: stage,
    match_stage: stage,
    match_date: date,
    kickoff_time: kickoffTime,
    kickoff_at: date && kickoffTime ? date + 'T' + kickoffTime + ':00+01:00' : null,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_team_name: optionalText_(record.home_team_name),
    away_team_name: optionalText_(record.away_team_name),
    home_team: {
      id: homeTeamId,
      name: optionalText_(record.home_team_name) ||
        (homeTeamId && references.teamsById[homeTeamId]
          ? references.teamsById[homeTeamId].name
          : null)
    },
    away_team: {
      id: awayTeamId,
      name: optionalText_(record.away_team_name) ||
        (awayTeamId && references.teamsById[awayTeamId]
          ? references.teamsById[awayTeamId].name
          : null)
    },
    home_score: optionalNumber_(record.home_score, 'Matches.home_score'),
    away_score: optionalNumber_(record.away_score, 'Matches.away_score'),
    home_penalties: optionalNumber_(record.home_penalties, 'Matches.home_penalties'),
    away_penalties: optionalNumber_(record.away_penalties, 'Matches.away_penalties'),
    penalty_home: optionalNumber_(record.home_penalties, 'Matches.home_penalties'),
    penalty_away: optionalNumber_(record.away_penalties, 'Matches.away_penalties'),
    status: optionalText_(record.status)?.toUpperCase() || null,
    result_type: optionalText_(record.result_type),
    awarded_winner_team_id: optionalId_(record.awarded_winner_team_id),
    award_reason: optionalText_(record.award_reason),
    official_home_score: optionalNumber_(record.official_home_score, 'Matches.official_home_score'),
    official_away_score: optionalNumber_(record.official_away_score, 'Matches.official_away_score'),
    venue: optionalText_(record.venue),
    home_yellow_cards: optionalNumber_(record.home_yellow_cards, 'Matches.home_yellow_cards'),
    home_red_cards: optionalNumber_(record.home_red_cards, 'Matches.home_red_cards'),
    away_yellow_cards: optionalNumber_(record.away_yellow_cards, 'Matches.away_yellow_cards'),
    away_red_cards: optionalNumber_(record.away_red_cards, 'Matches.away_red_cards'),
    home_fair_play_yellow_only: optionalNumber_(record.home_fair_play_yellow_only, 'Matches.home_fair_play_yellow_only'),
    home_fair_play_second_yellow_red: optionalNumber_(record.home_fair_play_second_yellow_red, 'Matches.home_fair_play_second_yellow_red'),
    home_fair_play_direct_red: optionalNumber_(record.home_fair_play_direct_red, 'Matches.home_fair_play_direct_red'),
    home_fair_play_yellow_direct_red: optionalNumber_(record.home_fair_play_yellow_direct_red, 'Matches.home_fair_play_yellow_direct_red'),
    away_fair_play_yellow_only: optionalNumber_(record.away_fair_play_yellow_only, 'Matches.away_fair_play_yellow_only'),
    away_fair_play_second_yellow_red: optionalNumber_(record.away_fair_play_second_yellow_red, 'Matches.away_fair_play_second_yellow_red'),
    away_fair_play_direct_red: optionalNumber_(record.away_fair_play_direct_red, 'Matches.away_fair_play_direct_red'),
    away_fair_play_yellow_direct_red: optionalNumber_(record.away_fair_play_yellow_direct_red, 'Matches.away_fair_play_yellow_direct_red'),
    current_period: optionalText_(record.current_period)?.toUpperCase() || null,
    notes: optionalText_(record.notes)
  };
}

function normalizeNews_(record) {
  let inlineImages = [];
  const rawInlineImages = optionalText_(record.inline_images);
  if (rawInlineImages) {
    try {
      const parsed = JSON.parse(rawInlineImages);
      if (!Array.isArray(parsed)) {
        throw new Error('News.inline_images must contain a JSON array');
      }
      inlineImages = parsed;
    } catch (error) {
      throw new Error('News.inline_images contains invalid JSON');
    }
  }
  return {
    id: requiredId_(record.id, 'News.id'),
    title: requiredText_(record.title, 'News.title'),
    subtitle: optionalText_(record.subtitle),
    content: optionalText_(record.content),
    author: optionalText_(record.author),
    image_url: optionalText_(record.image_url),
    inline_images: inlineImages,
    published: optionalBoolean_(record.published, 'News.published'),
    views: optionalNumber_(record.views, 'News.views') || 0,
    created_at: optionalText_(record.created_at),
    published_at: optionalText_(record.published_at) || optionalText_(record.created_at),
    updated_at: optionalText_(record.updated_at)
  };
}

function indexById_(records) {
  return records.reduce((index, record) => {
    index[record.id] = record;
    return index;
  }, Object.create(null));
}

function requiredId_(value, fieldName) {
  const id = optionalId_(value);
  if (!id) {
    throw new Error(fieldName + ' is required');
  }
  return id;
}

function optionalId_(value) {
  const normalized = optionalText_(value);
  return normalized === null ? null : normalized;
}

function requiredText_(value, fieldName) {
  const normalized = optionalText_(value);
  if (normalized === null) {
    throw new Error(fieldName + ' is required');
  }
  return normalized;
}

function optionalText_(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function optionalNumber_(value, fieldName) {
  const normalized = optionalText_(value);
  if (normalized === null) {
    return null;
  }
  const number = Number(normalized);
  if (!Number.isFinite(number)) {
    throw new Error(fieldName + ' must be numeric');
  }
  return number;
}

function optionalBoolean_(value, fieldName) {
  const normalized = optionalText_(value);
  if (normalized === null) {
    return null;
  }
  if (normalized.toLowerCase() === 'true' || normalized === '1') {
    return true;
  }
  if (normalized.toLowerCase() === 'false' || normalized === '0') {
    return false;
  }
  throw new Error(fieldName + ' must be boolean');
}

function normalizeDate_(value) {
  const date = optionalText_(value);
  if (date === null) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error('Matches.match_date must use YYYY-MM-DD');
  }
  const parsed = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  ));
  if (
    parsed.getUTCFullYear() !== Number(match[1]) ||
    parsed.getUTCMonth() !== Number(match[2]) - 1 ||
    parsed.getUTCDate() !== Number(match[3])
  ) {
    throw new Error('Matches.match_date is not a valid date');
  }
  return date;
}

function normalizeTime_(value) {
  const time = optionalText_(value);
  if (time === null) {
    return null;
  }
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new Error('Matches.kickoff_time must use 24-hour HH:mm');
  }
  return String(Number(match[1])).padStart(2, '0') + ':' + match[2];
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
  const result = handleApiGet({ action: 'teams' });
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Local test: confirm all database headers.
 */
function testDatabaseStructure() {
  checkDatabaseStructure();
}
