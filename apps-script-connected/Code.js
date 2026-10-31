
const SPREADSHEET_ID = '1ZV770n5Y6xT-6Ch87Mf8MsKG_XpEXABFX2vfSyt-dhA';

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
    const user = authenticateAdmin_(body.idToken);
    const data = handleAdminPost_(body, user);
    return jsonResponse({ success: true, data: data });
  } catch (error) {
    console.error('Admin API POST error:', error);
    return jsonResponse({
      success: false,
      error: error && error.safeMessage
        ? error.safeMessage
        : 'The administrator request could not be completed'
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
    Matches: [
      'id', 'season_id', 'group_id', 'match_number', 'stage',
      'match_date', 'kickoff_time', 'home_team_id', 'away_team_id',
      'home_team_name', 'away_team_name', 'home_score', 'away_score',
      'home_penalties', 'away_penalties', 'status', 'result_type',
      'awarded_winner_team_id', 'award_reason', 'official_home_score',
      'official_away_score', 'venue', 'home_yellow_cards',
      'home_red_cards', 'away_yellow_cards', 'away_red_cards',
      'current_period', 'notes'
    ],
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

    rowsToStart.forEach(rowNumber => {
      sheet.getRange(rowNumber, columnIndexes.status + 1).setValue('LIVE');
    });

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
  if (action === 'admin.matches.markFinished') {
    requireAdminPermission_(user, 'matches');
    return markMatchFinished_(body, user);
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
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: token }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
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
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('AuditLog');
  if (!sheet) {
    throw new Error('AuditLog sheet not found');
  }
  const headers = getSheetHeaders_(sheet);
  const required = [
    'id', 'timestamp', 'user_email', 'action', 'entity_type',
    'entity_id', 'old_value', 'new_value', 'reason'
  ];
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

    Object.keys(updates).forEach(field => {
      const index = location.headers.indexOf(field);
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
  });
}

function requireRecordId_(body, fieldName) {
  return requiredId_(body.id, fieldName || 'id');
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
  const updates = {
    home_score: requiredNonNegativeInteger_(body.home_score, 'home_score'),
    away_score: requiredNonNegativeInteger_(body.away_score, 'away_score')
  };
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
  return updateRecordFieldsAndAudit_(
    'Matches', id, updates, user, 'match.result.updated', body.reason
  );
}

function setMatchPeriod_(body, user) {
  const id = requireRecordId_(body, 'match id');
  const period = requiredText_(body.current_period, 'current_period');
  const allowedPeriods = [
    'not_started', 'first_half', '1st_half', 'halftime', 'half_time',
    'second_half', '2nd_half', 'extra_time', 'extra_time_first_half',
    'extra_time_second_half', 'penalties', 'shootout', 'ended'
  ];
  if (!allowedPeriods.includes(period.toLowerCase().replace(/[\s-]+/g, '_'))) {
    throw apiError_('current_period is not supported');
  }
  return updateRecordFieldsAndAudit_(
    'Matches', id, { current_period: period }, user, 'match.period.updated', body.reason
  );
}

function markMatchFinished_(body, user) {
  const id = requireRecordId_(body, 'match id');
  return updateRecordFieldsAndAudit_(
    'Matches',
    id,
    { status: 'FINISHED', current_period: 'ENDED' },
    user,
    'match.finished',
    body.reason
  );
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
    let imageUrl;
    try {
      imageUrl = new URL(updates.image_url);
    } catch (error) {
      throw apiError_('image_url must be a valid URL');
    }
    if (imageUrl.protocol !== 'https:' && imageUrl.protocol !== 'http:') {
      throw apiError_('image_url must use HTTP or HTTPS');
    }
  }
  return updates;
}

function createNews_(body, user) {
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
    }
    return { id: id, deleted: true };
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
    status: optionalText_(record.status),
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
    current_period: optionalText_(record.current_period),
    notes: optionalText_(record.notes)
  };
}

function normalizeNews_(record) {
  return {
    id: requiredId_(record.id, 'News.id'),
    title: requiredText_(record.title, 'News.title'),
    subtitle: optionalText_(record.subtitle),
    content: optionalText_(record.content),
    author: optionalText_(record.author),
    image_url: optionalText_(record.image_url),
    published: optionalBoolean_(record.published, 'News.published'),
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
