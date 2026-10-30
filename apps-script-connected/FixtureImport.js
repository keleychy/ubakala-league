/**
 * UBakala Unity Cup 2026 — controlled fixture import
 * Add this as a NEW Apps Script file named FixtureImport.gs.
 * It does not replace Code.gs.
 *
 * Run previewFixtureImport() first. It only reads the database and logs a preview.
 * Run importFixtureData() only after reviewing the preview.
 *
 * Dates and kickoff times are stored as text in Africa/Lagos local time to avoid
 * timezone shifts. Source weekday labels are retained for validation only.
 */

const FIXTURE_IMPORT_SPREADSHEET_ID = '1ZV770n5Y6xT-6Ch87Mf8MsKG_XpEXABFX2vfSyt-dhA';

const FIXTURE_CATEGORIES = [
  {
    key: 'junior_boys', name: 'Junior Boys', seasonName: 'Ubakala Unity Cup 2026 - Junior Boys',
    groups: {
      A: ['Umuosu', 'Eziama', 'Avodim', 'Amibo'],
      B: ['Amuzu', 'Nsukwe', "Ezu N'Erim", 'Umuogo'],
      C: ['Mgbarakuma', 'Umumba', 'Uturu', 'Abam'],
      D: ['Nsirimo Aut', 'Ipupe', 'Laguru']
    },
    fixtures: [
      [1,'Umuosu','Eziama','25/10/2026','2pm','Sun'],
      [2,'Amuzu','Nsukwe','26/10/2026','4pm','Mon'],
      [3,'Mgbarakuma','Umumba','27/10/2026','2pm','Tue'],
      [4,'Nsirimo Aut','Ipupe','28/10/2026','4pm','Wed'],
      [5,'Eziama','Amibo','29/10/2026','2pm','Thurs'],
      [6,'Nsukwe','Umuogo','30/10/2026','4pm','Fri'],
      [7,'Umumba','Abam','31/10/2026','2pm','Sat'],
      [8,'Ipupe','Laguru','1/11/2026','2pm','Sun'],
      [9,'Avodim','Umuosu','2/11/2026','4pm','Mon'],
      [10,"Ezu N'Erim",'Amuzu','4/11/2026','2pm','Wed'],
      [11,'Uturu','Mgbarakuma','5/11/2026','4pm','Thur'],
      [12,'Laguru','Nsirimo Aut','7/11/2026','8am','Sat'],
      [13,'Amibo','Umuosu','8/11/2026','2pm','Sun'],
      [14,'Umuogo','Amuzu','9/11/2026','4pm','Mon'],
      [15,'Abam','Mgbarakuma','11/11/2026','4pm','Wed'],
      [16,'Eziama','Avodim','12/11/2026','2pm','Thur'],
      [17,'Nsukwe',"Ezu N'Erim",'14/11/2026','2pm','Sat'],
      [18,'Uturu','Umumba','15/11/2026','8am','Sun'],
      [19,'Avodim','Amibo','17/11/2026','4pm','Mon'],
      [20,"Ezu N'Erim",'Umuogo','19/11/2026','4pm','Thur'],
      [21,'Uturu','Abam','20/11/2026','4pm','Fri'],
      [22,'1st A','2nd B','23/11/2026','2pm','Mon','QF'],
      [23,'1st B','2nd A','26/11/2026','2pm','Thur','QF'],
      [24,'1st C','2nd D','27/11/2026','4pm','Fri','QF'],
      [25,'1st D','2nd C','28/11/2026','8am','Sat','QF'],
      [26,'Winner 22','Winner 24','2/12/2026','2pm','Wed','SF'],
      [27,'Winner 23','Winner 25','5/12/2026','8am','Sat','SF'],
      [28,'Loser 26','Loser 27','8/12/2026','2pm','Mon','THIRD_PLACE'],
      [29,'Winner 26','Winner 27','1/1/2027','10am','Fri','FINAL']
    ]
  },
  {
    key: 'girls', name: 'Girls', seasonName: 'Ubakala Unity Cup 2026 - Girls',
    groups: {
      A: ['Mgbarakuma','Umuosu','Nsukwe','Umumba'],
      B: ['Laguru','Amibo','Amuzu',"Ezu N'Erim"],
      C: ['Ipupe','Eziama','Nsirimo Aut','Umuogo'],
      D: ['Avodim','Abam','Uturu']
    },
    fixtures: [
      [1,'Mgbarakuma','Umuosu','1/11/2026','4pm','Sun'],
      [2,'Laguru','Amibo','2/11/2026','2pm','Mon'],
      [3,'Ipupe','Eziama','3/11/2026','4pm','Tue'],
      [4,'Avodim','Abam','5/11/2026','2pm','Thur'],
      [5,'Nsukwe','Umumba','6/11/2026','2pm','Fri'],
      [6,'Amuzu',"Ezu N'Erim",'7/11/2026','2pm','Sat'],
      [7,'Nsirimo Aut','Umuogo','8/11/2026','8am','Sun'],
      [8,'Abam','Uturu','9/11/2026','2pm','Mon'],
      [9,'Umuosu','Umumba','10/11/2026','2pm','Tue'],
      [10,'Amibo',"Ezu N'Erim",'11/11/2026','2pm','Wed'],
      [11,'Eziama','Umuogo','13/11/2026','2pm','Fri'],
      [12,'Uturu','Avodim','14/11/2026','8am','Sat'],
      [13,'Nsukwe','Mgbarakuma','15/11/2026','2pm','Sun'],
      [14,'Amuzu','Laguru','16/11/2026','2pm','Mon'],
      [15,'Nsirimo Aut','Ipupe','17/11/2026','2pm','Tue'],
      [16,'Umuosu','Nsukwe','18/11/2026','2pm','Wed'],
      [17,'Amibo','Amuzu','19/11/2026','2pm','Thur'],
      [18,'Eziama','Nsirimo Aut','20/11/2026','2pm','Fri'],
      [19,'Umumba','Mgbarakuma','21/11/2026','2pm','Sat'],
      [20,"Ezu N'Erim",'Laguru','22/11/2026','2pm','Sun'],
      [21,'Umuogo','Ipupe','22/11/2026','4pm','Sun'],
      [22,'1st A','2nd B','24/11/2026','2pm','Tue','QF'],
      [23,'1st B','2nd A','27/11/2026','2pm','Fri','QF'],
      [24,'1st C','2nd D','28/11/2026','2pm','Sat','QF'],
      [25,'1st D','2nd C','30/11/2026','2pm','Mon','QF'],
      [26,'Winner 22','Winner 24','2/12/2026','2pm','Thur','SF'],
      [27,'Winner 23','Winner 25','6/12/2026','2pm','Sat','SF'],
      [28,'Loser 26','Loser 27','9/12/2026','2pm','Tue','THIRD_PLACE'],
      [29,'Winner 26','Winner 27','1/1/2027','7am','Fri','FINAL']
    ]
  },
  {
    key: 'intermediate', name: 'Intermediate', seasonName: 'Ubakala Unity Cup 2026 - Intermediate',
    groups: {
      A: ['Eziama','Avodim','Ipupe','Abam'],
      B: ['Umuosu',"Ezu N'Erim",'Nsirimo Aut','Umuogo'],
      C: ['Mgbarakuma','Laguru','Amibo','Umumba'],
      D: ['Uturu','Nsukwe','Amuzu']
    },
    fixtures: [
      [1,'Eziama','Avodim','25/10/2026','4pm','Sun'],
      [2,'Umuosu',"Ezu N'Erim",'26/10/2026','2pm','Mon'],
      [3,'Mgbarakuma','Laguru','27/10/2026','4pm','Tue'],
      [4,'Uturu','Nsukwe','28/10/2026','2pm','Wed'],
      [5,'Ipupe','Abam','29/10/2026','4pm','Thurs'],
      [6,'Nsirimo Aut','Umuogo','30/10/2026','2pm','Fri'],
      [7,'Amibo','Umumba','31/10/2026','4pm','Sat'],
      [8,'Nsukwe','Amuzu','01/11/2026','8am','Sun'],
      [9,'Avodim','Abam','03/11/2026','2pm','Tue'],
      [10,"Ezu N'Erim",'Umuogo','04/11/2026','4pm','Wed'],
      [11,'Laguru','Umumba','06/11/2026','4pm','Fri'],
      [12,'Uturu','Amuzu','07/11/2026','4pm','Sat'],
      [13,'Ipupe','Eziama','08/11/2026','4pm','Sun'],
      [14,'Nsirimo Aut','Umuosu','10/11/2026','4pm','Mon'],
      [15,'Amibo','Mgbarakuma','12/11/2026','4pm','Thur'],
      [16,'Avodim','Ipupe','13/11/2026','4pm','Fri'],
      [17,"Ezu N'Erim",'Nsirimo Aut','14/11/2026','4pm','Sat'],
      [18,'Laguru','Amibo','15/11/2026','4pm','Sun'],
      [19,'Abam','Eziama','16/11/2026','4pm','Mon'],
      [20,'Umuogo','Umuosu','18/11/2026','4pm','Wed'],
      [21,'Umumba','Mgbarakuma','21/11/2026','4pm','Sat'],
      [22,'1st A','2nd B','23/11/2026','4pm','Mon','QF'],
      [23,'1st B','2nd A','24/11/2026','4pm','Tue','QF'],
      [24,'1st C','2nd D','26/11/2026','4pm','Thur','QF'],
      [25,'1st D','2nd C','28/11/2026','4pm','Sat','QF'],
      [26,'Winner 22','Winner 24','1/12/2026','2pm','Tue','SF'],
      [27,'Winner 23','Winner 25','4/12/2026','2pm','Fri','SF'],
      [28,'Loser 26','Loser 27','7/12/2026','2pm','Sun','THIRD_PLACE'],
      [29,'Winner 26','Winner 27','1/1/2027','12pm','Fri','FINAL']
    ]
  },
  {
    key: 'senior_boys', name: 'Senior Boys', seasonName: 'Ubakala Unity Cup 2026 - Senior Boys',
    groups: {
      A: ['Ipupe','Abam','Amuzu','Umuogo'],
      B: ['Nsukwe','Amibo','Umuosu','Avodim'],
      C: ['Mgbarakuma','Eziama',"Ezu N'Erim",'Uturu'],
      D: ['Laguru','Nsirimo Aut','Umumba']
    },
    fixtures: [
      [1,'Ipupe','Abam','29/11/2026','3pm','Sun'],
      [2,'Nsukwe','Amibo','30/11/2026','4pm','Mon'],
      [3,'Mgbarakuma','Eziama','1/12/2026','4pm','Tue'],
      [4,'Laguru','Nsirimo Aut','2/12/2026','4pm','Wed'],
      [5,'Amuzu','Umuogo','3/12/2026','4pm','Thur'],
      [6,'Umuosu','Avodim','4/12/2026','4pm','Fri'],
      [7,"Ezu N'Erim",'Uturu','5/12/2026','4pm','Sat'],
      [8,'Nsirimo Aut','Umumba','6/12/2026','4pm','Sun'],
      [9,'Amuzu','Ipupe','7/12/2026','4pm','Mon'],
      [10,'Umuosu','Nsukwe','8/12/2026','4pm','Tue'],
      [11,"Ezu N'Erim",'Mgbarakuma','9/12/2026','4pm','Wed'],
      [12,'Umumba','Laguru','10/12/2026','4pm','Thur'],
      [13,'Abam','Amuzu','11/12/2026','4pm','Fri'],
      [14,'Amibo','Umuosu','12/12/2026','8am','Sat'],
      [15,"Ezu N'Erim",'Eziama','12/12/2026','4pm','Sat'],
      [16,'Umuogo','Ipupe','13/12/2026','4pm','Sun'],
      [17,'Avodim','Nsukwe','14/12/2026','4pm','Mon'],
      [18,'Uturu','Mgbarakuma','15/12/2026','4pm','Tue'],
      [19,'Abam','Umuogo','16/12/2026','4pm','Wed'],
      [20,'Amibo','Avodim','17/12/2026','4pm','Thur'],
      [21,'Eziama','Uturu','18/12/2026','4pm','Fri'],
      [22,'1st A','2nd B','20/12/2026','4pm','Sun','QF'],
      [23,'1st B','2nd A','21/12/2026','4pm','Mon','QF'],
      [24,'1st C','2nd D','22/12/2026','4pm','Tue','QF'],
      [25,'1st D','2nd C','23/12/2026','4pm','Wed','QF'],
      [26,'Winner 22','Winner 24','24/12/2026','4pm','Thur','SF'],
      [27,'Winner 23','Winner 25','25/12/2026','4pm','Fri','SF'],
      [28,'Loser 26','Loser 27','27/12/2026','4pm','Sun','THIRD_PLACE'],
      [29,'Chocurl','Diamond All Stars','31/12/2026','4pm','Thur','SPECIAL'],
      [30,'Winner 26','Winner 27','1/1/2027','4pm','Fri','FINAL']
    ]
  }
];

function fixtureCanonicalName_(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/n'\s*erim/g, "n'erim");
}

function fixtureParseDate_(dateText) {
  const parts = String(dateText).split('/');
  if (parts.length !== 3) throw new Error('Invalid date: ' + dateText);
  const day = Number(parts[0]), month = Number(parts[1]), year = Number(parts[2]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new Error('Invalid calendar date: ' + dateText);
  }
  return {
    iso: year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0'),
    weekday: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]
  };
}

function fixtureTime24_(timeText) {
  const m = String(timeText).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!m) throw new Error('Invalid kickoff time: ' + timeText);
  let h = Number(m[1]), min = Number(m[2] || 0);
  const ap = m[3].toLowerCase();
  if (h < 1 || h > 12 || min > 59) throw new Error('Invalid kickoff time: ' + timeText);
  if (ap === 'am') h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
}

function fixtureGroupForPair_(category, home, away) {
  const homeKey = fixtureCanonicalName_(home);
  const awayKey = fixtureCanonicalName_(away);
  for (const [groupName, teams] of Object.entries(category.groups)) {
    const keys = teams.map(fixtureCanonicalName_);
    if (keys.includes(homeKey) && keys.includes(awayKey)) return groupName;
  }
  return '';
}

function buildFixtureImportPlan_() {
  const errors = [], warnings = [], plan = [];
  const teamsByKey = new Map();
  const seasons = [];
  const groups = [];
  const teamGroups = [];
  const seenFixtureKeys = new Set();

  FIXTURE_CATEGORIES.forEach(category => {
    const seasonId = 'UFC26-' + category.key.toUpperCase();
    seasons.push({
      id: seasonId, name: category.seasonName, category: category.key,
      year: '2026', active: 'TRUE', archived: 'FALSE'
    });

    Object.entries(category.groups).forEach(([groupName, names]) => {
      const groupId = seasonId + '-G' + groupName;
      groups.push({ id: groupId, season_id: seasonId, name: groupName });
      names.forEach(name => {
        const key = fixtureCanonicalName_(name);
        if (!teamsByKey.has(key)) {
          teamsByKey.set(key, { id: 'TEAM-' + key.toUpperCase().replace(/[^A-Z0-9]+/g,'-'), name: name, short_name: name, logo: '', archived: 'FALSE' });
        }
        teamGroups.push({
          id: seasonId + '-' + groupName + '-' + teamsByKey.get(key).id,
          season_id: seasonId, group_id: groupId, team_id: teamsByKey.get(key).id
        });
      });
    });

    category.fixtures.forEach(f => {
      const [number, home, away, sourceDate, sourceTime, sourceDay, explicitStage] = f;
      const parsed = fixtureParseDate_(sourceDate);
      const time = fixtureTime24_(sourceTime);
      const stage = explicitStage || 'GROUP';
      const groupName = stage === 'GROUP' ? fixtureGroupForPair_(category, home, away) : '';
      if (stage === 'GROUP' && !groupName) {
        errors.push(category.name + ' match ' + number + ': cannot determine group for ' + home + ' vs ' + away);
      }
      if (stage !== 'GROUP' && !explicitStage) {
        errors.push(category.name + ' match ' + number + ': knockout stage missing');
      }
      if (String(sourceDay).toLowerCase().slice(0,3) !== parsed.weekday.toLowerCase()) {
        warnings.push({
          category: category.name, match_number: number, date: parsed.iso,
          supplied_weekday: sourceDay, actual_weekday: parsed.weekday,
          message: 'Date preserved; weekday label differs.'
        });
      }

      [home, away].forEach(name => {
        const key = fixtureCanonicalName_(name);
        const isPlaceholder = /^(1st [A-D]|2nd [A-D]|winner \d+|loser \d+)$/i.test(name);
        if (!isPlaceholder && !teamsByKey.has(key)) {
          teamsByKey.set(key, { id: 'TEAM-' + key.toUpperCase().replace(/[^A-Z0-9]+/g,'-'), name: name, short_name: name, logo: '', archived: 'FALSE' });
        }
      });

      const key = [category.key, number, parsed.iso, time, fixtureCanonicalName_(home), fixtureCanonicalName_(away)].join('|');
      if (seenFixtureKeys.has(key)) errors.push('Duplicate fixture in source: ' + category.name + ' match ' + number);
      seenFixtureKeys.add(key);

      const homeIsPlaceholder = /^(1st [A-D]|2nd [A-D]|winner \d+|loser \d+)$/i.test(home);
      const awayIsPlaceholder = /^(1st [A-D]|2nd [A-D]|winner \d+|loser \d+)$/i.test(away);
      const homeTeam = teamsByKey.get(fixtureCanonicalName_(home));
      const awayTeam = teamsByKey.get(fixtureCanonicalName_(away));
      plan.push({
        category: category.key, category_name: category.name, season_id: seasonId,
        group_name: groupName, group_id: groupName ? seasonId + '-G' + groupName : '',
        match_number: number, stage: stage, match_date: parsed.iso, kickoff_time: time,
        source_date: sourceDate, source_time: sourceTime, source_weekday: sourceDay,
        home_team_id: homeIsPlaceholder ? '' : (homeTeam ? homeTeam.id : ''),
        away_team_id: awayIsPlaceholder ? '' : (awayTeam ? awayTeam.id : ''),
        home_team_name: home, away_team_name: away,
        home_score: '', away_score: '', home_penalties: '', away_penalties: '',
        status: 'PENDING', result_type: '', awarded_winner_team_id: '', award_reason: '',
        official_home_score: '', official_away_score: '', venue: '',
        home_yellow_cards: '0', home_red_cards: '0', away_yellow_cards: '0', away_red_cards: '0',
        current_period: '', notes: 'Imported from user-supplied 2026 fixture list; source weekday: ' + sourceDay
      });
    });
  });

  return {
    errors: errors, warnings: warnings, fixtures: plan,
    teams: Array.from(teamsByKey.values()),
    seasons: seasons, groups: groups, teamGroups: teamGroups
  };
}

function previewFixtureImport() {
  const plan = buildFixtureImportPlan_();
  const ss = SpreadsheetApp.openById(FIXTURE_IMPORT_SPREADSHEET_ID);
  const existingMatches = ss.getSheetByName('Matches');
  const existingCount = existingMatches ? Math.max(0, existingMatches.getLastRow() - 1) : -1;

  const summary = {
    mode: 'PREVIEW ONLY — no spreadsheet rows written',
    fixture_count: plan.fixtures.length,
    expected_by_category: plan.fixtures.reduce((acc, f) => {
      acc[f.category_name] = (acc[f.category_name] || 0) + 1; return acc;
    }, {}),
    unique_team_count: plan.teams.length,
    season_count: plan.seasons.length,
    group_count: plan.groups.length,
    team_group_count: plan.teamGroups.length,
    existing_match_rows: existingCount,
    validation_errors: plan.errors,
    weekday_warnings_count: plan.warnings.length,
    weekday_warnings: plan.warnings,
    sample_first_5_fixtures: plan.fixtures.slice(0, 5),
    sample_last_5_fixtures: plan.fixtures.slice(-5)
  };
  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

function importFixtureData() {
  const plan = buildFixtureImportPlan_();
  if (plan.errors.length) {
    throw new Error('Import stopped: validation errors found. Run previewFixtureImport() and fix the source first. Errors: ' + plan.errors.join(' | '));
  }

  const ss = SpreadsheetApp.openById(FIXTURE_IMPORT_SPREADSHEET_ID);
  const required = ['Teams','Seasons','Groups','TeamGroups','Matches'];
  required.forEach(name => {
    if (!ss.getSheetByName(name)) throw new Error('Required sheet missing: ' + name);
  });

  const matchSheet = ss.getSheetByName('Matches');
  const currentMatches = getFixtureRecords_(matchSheet);
  if (currentMatches.length) {
    throw new Error('Import stopped: Matches already contains ' + currentMatches.length + ' data row(s). No existing matches were changed. Clear/resolve existing rows deliberately before importing.');
  }

  // Refuse to silently mix this seed import with partially populated reference sheets.
  ['Teams','Seasons','Groups','TeamGroups'].forEach(name => {
    const count = getFixtureRecords_(ss.getSheetByName(name)).length;
    if (count) throw new Error('Import stopped: ' + name + ' already contains ' + count + ' data row(s). No data was written.');
  });

  writeFixtureObjects_(ss.getSheetByName('Teams'), plan.teams);
  writeFixtureObjects_(ss.getSheetByName('Seasons'), plan.seasons);
  writeFixtureObjects_(ss.getSheetByName('Groups'), plan.groups);
  writeFixtureObjects_(ss.getSheetByName('TeamGroups'), plan.teamGroups);
  writeFixtureObjects_(matchSheet, plan.fixtures);

  Logger.log(JSON.stringify({
    success: true,
    imported_fixtures: plan.fixtures.length,
    teams: plan.teams.length,
    seasons: plan.seasons.length,
    groups: plan.groups.length,
    team_group_entries: plan.teamGroups.length,
    note: 'Dates and kickoff times stored as local text; no timezone conversion applied.'
  }, null, 2));
}

function getFixtureRecords_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues()
    .slice(1).filter(row => row.some(value => value !== ''));
}

function writeFixtureObjects_(sheet, objects) {
  if (!objects.length) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(h => h.trim());
  const rows = objects.map(obj => headers.map(header => {
    const value = Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : '';
    return value === null || value === undefined ? '' : String(value);
  }));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setNumberFormat('@');
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}


function repairMissingMatchIds() {
  const spreadsheet = SpreadsheetApp.openById(
    '1ZV770n5Y6xT-6Ch87Mf8MsKG_XpEXABFX2vfSyt-dhA'
  );

  const sheet = spreadsheet.getSheetByName('Matches');

  if (!sheet) {
    throw new Error('Matches sheet was not found.');
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    Logger.log('No match records found.');
    return;
  }

  const data = sheet
    .getRange(1, 1, lastRow, sheet.getLastColumn())
    .getDisplayValues();

  const headers = data[0].map(h => h.trim());
  const idColumn = headers.indexOf('id');
  const seasonColumn = headers.indexOf('season_id');
  const numberColumn = headers.indexOf('match_number');

  if (idColumn === -1 || seasonColumn === -1 ||
      numberColumn === -1) {
    throw new Error('Required columns are missing.');
  }

  const existingIds = new Set();

  for (let i = 1; i < data.length; i++) {
    const existingId = data[i][idColumn].trim();

    if (existingId) {
      if (existingIds.has(existingId)) {
        throw new Error('Duplicate existing match ID: ' + existingId);
      }
      existingIds.add(existingId);
    }
  }

  const updates = [];
  let repaired = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const currentId = row[idColumn].trim();

    if (currentId) continue;

    const seasonId = row[seasonColumn].trim();
    const matchNumber = row[numberColumn].trim();

    if (!seasonId || !matchNumber) {
      throw new Error(
        'Cannot generate ID for spreadsheet row ' + (i + 1)
      );
    }

    const newId = seasonId + '-M' +
      String(Number(matchNumber)).padStart(3, '0');

    if (existingIds.has(newId)) {
      throw new Error('Generated ID already exists: ' + newId);
    }

    existingIds.add(newId);
    updates.push({ row: i + 1, id: newId });
    repaired++;
  }

  updates.forEach(item => {
    sheet.getRange(item.row, idColumn + 1).setNumberFormat('@');
    sheet.getRange(item.row, idColumn + 1).setValue(item.id);
  });

  Logger.log(JSON.stringify({
    success: true,
    repaired_ids: repaired,
    total_match_rows: lastRow - 1,
    first_generated_id: updates.length ? updates[0].id : 'None needed',
    message: 'Only previously blank match IDs were filled.'
  }, null, 2));
}

