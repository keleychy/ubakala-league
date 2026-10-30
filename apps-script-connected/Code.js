
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
    group: { id: group.id, name: group.name },
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
    content: optionalText_(record.content),
    image_url: optionalText_(record.image_url),
    published: optionalBoolean_(record.published, 'News.published'),
    created_at: optionalText_(record.created_at),
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
