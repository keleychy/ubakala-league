const PREDICTION_SHEET_HEADERS = {
  Predictors: [
    'predictor_id', 'first_name', 'surname', 'third_name', 'display_name',
    'normalized_phone', 'registration_date', 'account_status', 'last_updated',
    'verification_status', 'access_code_hash'
  ],
  Predictions: [
    'prediction_id', 'predictor_id', 'fixture_id', 'season_id',
    'competition_category', 'selected_outcome', 'submitted_at', 'updated_at',
    'prediction_status', 'is_locked', 'locked_at', 'revision_count',
    'created_by_source', 'revision_history'
  ],
  'Prediction Results': [
    'settlement_id', 'prediction_id', 'predictor_id', 'fixture_id',
    'official_result', 'selected_outcome', 'settlement_status',
    'points_awarded', 'settled_at', 'settlement_version', 'last_updated'
  ],
  'Prediction Settings': [
    'setting_key', 'setting_value', 'description', 'updated_at', 'updated_by'
  ]
};

const PREDICTION_DEFAULT_SETTINGS = [
  ['feature_enabled', 'true', 'Enable the public Predictions Centre.'],
  ['registration_enabled', 'true', 'Allow new predictor registrations.'],
  ['submissions_enabled', 'true', 'Allow predictions while fixtures are open.'],
  ['leaderboard_enabled', 'true', 'Show the public leaderboard.'],
  ['statistics_enabled', 'true', 'Show public prediction statistics.'],
  ['current_season_id', '', 'Optional season ID used to limit the public predictions season.'],
  ['reopen_postponed_predictions', 'false', 'Allow admin-approved reopening after a fixture is rescheduled.'],
  ['points_per_correct_prediction', '1', 'Points awarded for a correct 1X2 prediction.']
];

const PREDICTION_ALLOWED_SETTINGS = {
  feature_enabled: 'boolean',
  registration_enabled: 'boolean',
  submissions_enabled: 'boolean',
  leaderboard_enabled: 'boolean',
  statistics_enabled: 'boolean',
  current_season_id: 'text',
  reopen_postponed_predictions: 'boolean',
  points_per_correct_prediction: 'points'
};

function initializePredictionSheets_(user) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw apiError_('Another spreadsheet update is in progress; try again shortly');
  }
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    Object.keys(PREDICTION_SHEET_HEADERS).forEach(sheetName => {
      let sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        sheet.getRange(1, 1, 1, PREDICTION_SHEET_HEADERS[sheetName].length)
          .setValues([PREDICTION_SHEET_HEADERS[sheetName]]);
      } else if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, PREDICTION_SHEET_HEADERS[sheetName].length)
          .setValues([PREDICTION_SHEET_HEADERS[sheetName]]);
      }
      validatePredictionSheetHeaders_(sheetName, sheet);
      invalidateSheetRecordsCache_(sheetName);
    });

    const settings = getSheetRecords('Prediction Settings');
    const existingKeys = new Set(settings.map(record =>
      String(record.setting_key || '').trim()
    ));
    PREDICTION_DEFAULT_SETTINGS.forEach(([key, value, description]) => {
      if (existingKeys.has(key)) return;
      appendPredictionRecordLocked_('Prediction Settings', {
        setting_key: key,
        setting_value: value,
        description: description,
        updated_at: new Date().toISOString(),
        updated_by: user.email
      }, 'prediction.settings.initialized', key, user);
    });

    installPredictionMaintenanceTrigger_();
    return {
      initialized: true,
      sheets: Object.keys(PREDICTION_SHEET_HEADERS),
      maintenance: 'installed'
    };
  } finally {
    lock.releaseLock();
  }
}

function installPredictionMaintenanceTrigger_() {
  const exists = ScriptApp.getProjectTriggers().some(trigger =>
    trigger.getHandlerFunction() === 'runPredictionMaintenance'
  );
  if (!exists) {
    ScriptApp.newTrigger('runPredictionMaintenance')
      .timeBased()
      .everyMinutes(5)
      .create();
  }
}

function validatePredictionSheetHeaders_(sheetName, sheet) {
  const headers = getSheetHeaders_(sheet);
  PREDICTION_SHEET_HEADERS[sheetName].forEach(header => {
    if (headers.indexOf(header) < 0 || headers.lastIndexOf(header) !== headers.indexOf(header)) {
      throw apiError_(
        sheetName + ' sheet must contain one ' + header +
        ' column. Existing data was not cleared or changed.'
      );
    }
  });
  return headers;
}

function assertPredictionSheetsReady_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(PREDICTION_SHEET_HEADERS).forEach(sheetName => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      throw apiError_(
        'Predictions are not initialized. Ask an administrator to initialize the Predictions Centre.'
      );
    }
    validatePredictionSheetHeaders_(sheetName, sheet);
  });
}

function handlePredictionPublicGet_(parameters) {
  assertPredictionSheetsReady_();
  const settings = getPredictionSettings_();
  if (parameters.action !== 'predictions.configuration' && settings.feature_enabled !== 'true') {
    throw apiError_('The Predictions Centre is currently unavailable');
  }

  if (parameters.action === 'predictions.configuration') {
    return {
      enabled: settings.feature_enabled === 'true',
      registration_enabled: settings.registration_enabled === 'true',
      submissions_enabled: settings.submissions_enabled === 'true',
      leaderboard_enabled: settings.leaderboard_enabled === 'true',
      statistics_enabled: settings.statistics_enabled === 'true',
      seasons: getPredictionEligibleSeasons_(settings).map(season => ({
        id: season.id,
        name: season.name,
        category: season.category
      }))
    };
  }
  if (parameters.action === 'predictions.fixtures') {
    return getPredictionFixtures_(settings);
  }
  if (parameters.action === 'predictions.leaderboard') {
    if (settings.leaderboard_enabled !== 'true') {
      throw apiError_('The leaderboard is currently unavailable');
    }
    return getPredictionLeaderboard_(
      optionalText_(parameters.season_id),
      optionalText_(parameters.category),
      settings
    );
  }
  if (parameters.action === 'predictions.statistics') {
    if (settings.statistics_enabled !== 'true') {
      throw apiError_('Prediction statistics are currently unavailable');
    }
    return getPredictionStatistics_(
      optionalText_(parameters.season_id),
      optionalText_(parameters.category),
      settings
    );
  }
  throw apiError_('Unsupported public Predictions Centre request');
}

function handlePredictionPublicPost_(body) {
  assertPredictionSheetsReady_();
  const settings = getPredictionSettings_();
  if (settings.feature_enabled !== 'true') {
    throw apiError_('The Predictions Centre is currently unavailable');
  }
  const action = requiredText_(body.action, 'action');
  if (action === 'predictions.register') {
    return registerPredictor_(body, settings);
  }
  if (action === 'predictions.history') {
    return getPredictorHistory_(body.predictor_id, body.access_code);
  }
  if (action === 'predictions.submit') {
    return submitPrediction_(body, settings);
  }
  throw apiError_('Unsupported public Predictions Centre request');
}

function registerPredictor_(body, settings) {
  if (settings.registration_enabled !== 'true') {
    throw apiError_('Predictor registration is currently closed');
  }
  const firstName = validatePredictorName_(body.first_name, 'First name');
  const surname = validatePredictorName_(body.surname, 'Surname');
  const thirdName = body.third_name === undefined || body.third_name === null || body.third_name === ''
    ? ''
    : validatePredictorName_(body.third_name, 'Third name');
  const normalizedPhone = normalizePredictorPhone_(body.phone);
  enforcePredictionRateLimit_('register', normalizedPhone, 4, 3600);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw apiError_('Registration is busy; please try again shortly');
  }
  try {
    const predictors = getSheetRecords('Predictors');
    if (predictors.some(record =>
      normalizePredictorPhone_(record.normalized_phone) === normalizedPhone
    )) {
      throw apiError_(
        'This phone number is already registered. Please use your existing Predictor ID and access code, or contact an administrator if you lost your code.'
      );
    }

    const predictorId = generateUniquePredictorId_(surname, normalizedPhone, predictors);
    const accessCode = generatePredictorAccessCode_();
    const displayName = [firstName, thirdName, surname].filter(Boolean).join(' ');
    const timestamp = new Date().toISOString();
    const predictor = {
      predictor_id: predictorId,
      first_name: firstName,
      surname: surname,
      third_name: thirdName,
      display_name: displayName,
      normalized_phone: normalizedPhone,
      registration_date: timestamp,
      account_status: 'ACTIVE',
      last_updated: timestamp,
      verification_status: 'UNVERIFIED',
      access_code_hash: hashPredictorAccessCode_(accessCode)
    };
    appendPredictionRecordLocked_(
      'Predictors',
      predictor,
      'prediction.predictor.registered',
      predictorId,
      { email: 'public-participant' },
      { predictor_id: predictorId, display_name: displayName }
    );
    return {
      predictor_id: predictorId,
      display_name: displayName,
      access_code: accessCode,
      access_code_notice: 'Save this private access code. It is shown only once.'
    };
  } finally {
    lock.releaseLock();
  }
}

function generateUniquePredictorId_(surname, normalizedPhone, predictors) {
  const letters = String(surname).toUpperCase().replace(/[^A-Z]/g, '');
  const digits = normalizedPhone.replace(/\D/g, '');
  if (!letters || digits.length < 4) {
    throw apiError_('Surname or phone number cannot be used to create a Predictor ID');
  }
  const candidates = [
    letters.slice(0, 3) + '-' + digits.slice(-3),
    letters.slice(0, 4) + '-' + digits.slice(-4),
    letters.slice(0, 3) + '-' + digits.slice(-4),
    letters.slice(0, 4) + '-' + digits.slice(-3)
  ];
  const existing = new Set(predictors.map(record =>
    String(record.predictor_id || '').trim().toUpperCase()
  ));
  const candidate = candidates.find(value => !existing.has(value));
  if (candidate) return candidate;

  const prefix = letters.slice(0, 3) + '-' + digits.slice(-3);
  for (let suffix = 1; suffix <= 999999; suffix += 1) {
    const uniqueCandidate = prefix + '-' + suffix;
    if (!existing.has(uniqueCandidate)) return uniqueCandidate;
  }
  throw apiError_('A unique Predictor ID could not be generated');
}

function validatePredictorName_(value, fieldName) {
  const name = requiredText_(value, fieldName).replace(/\s+/g, ' ');
  if (name.length > 80 || /[\u0000-\u001f\u007f<>]/.test(name)) {
    throw apiError_(fieldName + ' is invalid');
  }
  return name;
}

function normalizePredictorPhone_(value) {
  const raw = requiredText_(value, 'Mobile phone number');
  if (!/^[+\d()\s.-]+$/.test(raw)) {
    throw apiError_('Enter a valid phone number, including country code for international numbers');
  }
  let digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = '234' + digits.slice(1);
  }
  if (digits.length < 8 || digits.length > 15) {
    throw apiError_('Enter a valid phone number with 8 to 15 digits');
  }
  if (digits.startsWith('0')) {
    throw apiError_('Use a Nigerian local number beginning with 0 or an international number with its country code');
  }
  return '+' + digits;
}

function generatePredictorAccessCode_() {
  return (Utilities.getUuid() + Utilities.getUuid())
    .replace(/-/g, '')
    .slice(0, 16)
    .toUpperCase();
}

function hashPredictorAccessCode_(accessCode) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(accessCode),
    Utilities.Charset.UTF_8
  );
  return bytes.map(byte => ('0' + (byte & 255).toString(16)).slice(-2)).join('');
}

function getPredictorByAccessCode_(predictorId, accessCode) {
  const id = requiredText_(predictorId, 'Predictor ID').toUpperCase();
  const code = requiredText_(accessCode, 'Private access code').toUpperCase();
  enforcePredictionRateLimit_('access', id, 8, 900);
  const predictor = getSheetRecords('Predictors').find(record =>
    String(record.predictor_id || '').trim().toUpperCase() === id
  );
  const submittedHash = hashPredictorAccessCode_(code);
  if (
    !predictor ||
    !constantTimeStringEqual_(
      String(predictor.access_code_hash || ''),
      submittedHash
    )
  ) {
    throw apiError_('Predictor ID or access code is incorrect');
  }
  if (String(predictor.account_status || '').toUpperCase() !== 'ACTIVE') {
    throw apiError_('This predictor account is not active');
  }
  return predictor;
}

function constantTimeStringEqual_(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function enforcePredictionRateLimit_(prefix, identifier, limit, windowSeconds) {
  const cache = CacheService.getScriptCache();
  const key = 'prediction_rate_' + prefix + '_' +
    hashPredictorAccessCode_(String(identifier)).slice(0, 24);
  const attempts = Number(cache.get(key) || 0);
  if (attempts >= limit) {
    throw apiError_('Too many requests. Please wait before trying again.');
  }
  cache.put(key, String(attempts + 1), windowSeconds);
}

function getPredictorHistory_(predictorId, accessCode) {
  const predictor = getPredictorByAccessCode_(predictorId, accessCode);
  const predictions = getSheetRecords('Predictions')
    .filter(record => String(record.predictor_id) === String(predictor.predictor_id));
  const matches = getSheetRecords('Matches');
  const seasons = getSheetRecords('Seasons');
  const settlements = getSheetRecords('Prediction Results');
  const matchesById = Object.create(null);
  const seasonsById = Object.create(null);
  const settlementsByPrediction = Object.create(null);
  matches.forEach(match => { matchesById[String(match.id)] = match; });
  seasons.forEach(season => { seasonsById[String(season.id)] = season; });
  settlements.forEach(result => {
    settlementsByPrediction[String(result.prediction_id)] = result;
  });

  const history = predictions.map(record => {
    const match = matchesById[String(record.fixture_id)] || {};
    const settlement = settlementsByPrediction[String(record.prediction_id)] || null;
    const season = seasonsById[String(record.season_id)] || {};
    return {
      prediction_id: String(record.prediction_id),
      fixture_id: String(record.fixture_id),
      season_id: String(record.season_id),
      competition_category: String(record.competition_category || season.category || ''),
      selected_outcome: String(record.selected_outcome || ''),
      prediction_status: String(record.prediction_status || ''),
      is_locked: optionalBoolean_(record.is_locked, 'Predictions.is_locked') === true ||
        hasPredictionDeadlinePassed_(match),
      submitted_at: String(record.submitted_at || ''),
      updated_at: String(record.updated_at || ''),
      home_team_name: String(match.home_team_name || ''),
      away_team_name: String(match.away_team_name || ''),
      match_date: String(match.match_date || ''),
      kickoff_time: String(match.kickoff_time || ''),
      stage: String(match.stage || ''),
      official_result: settlement ? String(settlement.official_result || '') : '',
      settlement_status: settlement ? String(settlement.settlement_status || 'PENDING') : 'PENDING',
      points_awarded: settlement
        ? Number(settlement.points_awarded || 0)
        : null
    };
  });
  return {
    predictor: {
      predictor_id: String(predictor.predictor_id),
      display_name: String(predictor.display_name || '')
    },
    predictions: history
  };
}

function submitPrediction_(body, settings) {
  if (settings.submissions_enabled !== 'true') {
    throw apiError_('Prediction submissions are currently closed');
  }
  const predictor = getPredictorByAccessCode_(body.predictor_id, body.access_code);
  const fixtureId = requiredText_(body.fixture_id, 'Fixture ID');
  const outcome = requiredText_(body.selected_outcome, 'Selected outcome').toUpperCase();
  if (!['1', 'X', '2'].includes(outcome)) {
    throw apiError_('Select 1, X, or 2');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw apiError_('Prediction submission is busy; please try again shortly');
  }
  try {
    const activePredictor = getSheetRecords('Predictors').find(record =>
      String(record.predictor_id || '').toUpperCase() ===
        String(predictor.predictor_id).toUpperCase() &&
      String(record.account_status || '').toUpperCase() === 'ACTIVE'
    );
    if (!activePredictor) throw apiError_('This predictor account is not active');
    const match = getSheetRecords('Matches').find(record =>
      String(record.id) === fixtureId
    );
    if (!match) throw apiError_('This fixture is not available for predictions');
    const season = getSheetRecords('Seasons').find(record =>
      String(record.id) === String(match.season_id)
    );
    if (!isPredictionSeasonEligible_(season, settings)) {
      throw apiError_('This fixture is not in the current predictions season');
    }
    const now = new Date();
    const kickoff = parseMatchKickoff_(match.match_date, match.kickoff_time);
    if (!kickoff) throw apiError_('This fixture has no valid kickoff time');
    const status = String(match.status || '').trim().toUpperCase();
    const reopenPostponed = settings.reopen_postponed_predictions === 'true';
    const allowedStatus = status === 'PENDING' || status === 'SCHEDULED' ||
      (status === 'POSTPONED' && reopenPostponed);
    if (!allowedStatus || kickoff.getTime() <= now.getTime()) {
      throw apiError_('Prediction submission has closed for this match');
    }
    if (!String(match.home_team_id || '') || !String(match.away_team_id || '')) {
      throw apiError_('This fixture is waiting for its teams to be confirmed');
    }

    const records = getSheetRecords('Predictions');
    const existing = records.find(record =>
      String(record.predictor_id) === String(predictor.predictor_id) &&
      String(record.fixture_id) === fixtureId
    );
    const timestamp = now.toISOString();
    if (existing) {
      const alreadyLocked =
        optionalBoolean_(existing.is_locked, 'Predictions.is_locked') === true ||
        hasPredictionDeadlinePassed_(match);
      if (
        alreadyLocked &&
        !(status === 'POSTPONED' && reopenPostponed && kickoff.getTime() > now.getTime())
      ) {
        throw apiError_('Your prediction is locked and can no longer be changed');
      }
      const history = parsePredictionRevisionHistory_(existing.revision_history);
      history.push({
        selected_outcome: String(existing.selected_outcome || ''),
        updated_at: String(existing.updated_at || existing.submitted_at || ''),
        changed_at: timestamp
      });
      const changes = {
        selected_outcome: outcome,
        updated_at: timestamp,
        prediction_status: 'SUBMITTED',
        is_locked: false,
        locked_at: '',
        revision_count: Number(existing.revision_count || 0) + 1,
        revision_history: JSON.stringify(history)
      };
      updatePredictionRecordLocked_(
        'Predictions',
        'prediction_id',
        String(existing.prediction_id),
        changes,
        'prediction.updated',
        { predictor_id: predictor.predictor_id, fixture_id: fixtureId },
        { selected_outcome: outcome, revision_count: changes.revision_count },
        { email: 'public-participant' }
      );
      return { prediction_id: String(existing.prediction_id), selected_outcome: outcome, updated: true };
    }

    const prediction = {
      prediction_id: Utilities.getUuid(),
      predictor_id: String(predictor.predictor_id),
      fixture_id: fixtureId,
      season_id: String(match.season_id),
      competition_category: String(season.category || ''),
      selected_outcome: outcome,
      submitted_at: timestamp,
      updated_at: timestamp,
      prediction_status: 'SUBMITTED',
      is_locked: false,
      locked_at: '',
      revision_count: 0,
      created_by_source: 'web',
      revision_history: '[]'
    };
    appendPredictionRecordLocked_(
      'Predictions',
      prediction,
      'prediction.submitted',
      prediction.prediction_id,
      { email: 'public-participant' },
      {
        predictor_id: predictor.predictor_id,
        fixture_id: fixtureId,
        selected_outcome: outcome
      }
    );
    return {
      prediction_id: prediction.prediction_id,
      selected_outcome: outcome,
      updated: false
    };
  } finally {
    lock.releaseLock();
  }
}

function parsePredictionRevisionHistory_(value) {
  if (!value) return [];
  try {
    const history = JSON.parse(String(value));
    if (!Array.isArray(history)) throw new Error('not an array');
    return history;
  } catch (error) {
    throw apiError_('The prediction revision history is invalid; contact an administrator');
  }
}

function getPredictionSettings_() {
  const settings = Object.create(null);
  getSheetRecords('Prediction Settings').forEach(record => {
    const key = String(record.setting_key || '').trim();
    if (key) {
      const value = String(record.setting_value || '').trim();
      settings[key] = key === 'current_season_id' ? value : value.toLowerCase();
    }
  });
  PREDICTION_DEFAULT_SETTINGS.forEach(([key, value]) => {
    if (settings[key] === undefined) settings[key] = value;
  });
  return settings;
}

function getPredictionEligibleSeasons_(settings) {
  return getSheetRecords('Seasons')
    .map(normalizeSeason_)
    .filter(season =>
      season.active &&
      !season.archived &&
      (!settings.current_season_id || season.id === settings.current_season_id)
    );
}

function isPredictionSeasonEligible_(season, settings) {
  return Boolean(
    season &&
    optionalBoolean_(season.active, 'Seasons.active') === true &&
    optionalBoolean_(season.archived, 'Seasons.archived') !== true &&
    (!settings.current_season_id ||
      String(season.id) === String(settings.current_season_id))
  );
}

function getPredictionFixtures_(settings) {
  const seasons = getPredictionEligibleSeasons_(settings);
  const seasonsById = Object.create(null);
  seasons.forEach(season => { seasonsById[season.id] = season; });
  const now = new Date();
  return getSheetRecords('Matches')
    .filter(match => {
      const season = seasonsById[String(match.season_id)];
      const status = String(match.status || '').trim().toUpperCase();
      const postponedAllowed =
        status === 'POSTPONED' &&
        settings.reopen_postponed_predictions === 'true';
      if (!season || !(status === 'PENDING' || status === 'SCHEDULED' || postponedAllowed)) {
        return false;
      }
      if (!String(match.home_team_id || '') || !String(match.away_team_id || '')) return false;
      const kickoff = parseMatchKickoff_(match.match_date, match.kickoff_time);
      return kickoff && kickoff.getTime() > now.getTime();
    })
    .map(match => {
      const season = seasonsById[String(match.season_id)];
      return {
        id: String(match.id),
        season_id: String(match.season_id),
        competition_category: season.category,
        season_name: season.name,
        group_id: optionalText_(match.group_id) || '',
        match_number: optionalNumber_(match.match_number, 'Matches.match_number'),
        stage: optionalText_(match.stage) || '',
        match_date: String(match.match_date || ''),
        kickoff_time: String(match.kickoff_time || ''),
        kickoff_at: match.match_date && match.kickoff_time
          ? String(match.match_date) + 'T' + String(match.kickoff_time) + ':00+01:00'
          : null,
        home_team_id: String(match.home_team_id),
        away_team_id: String(match.away_team_id),
        home_team_name: String(match.home_team_name || ''),
        away_team_name: String(match.away_team_name || ''),
        venue: String(match.venue || ''),
        status: String(match.status || '').toUpperCase()
      };
    });
}

function hasPredictionDeadlinePassed_(match) {
  if (!match) return false;
  const kickoff = parseMatchKickoff_(match.match_date, match.kickoff_time);
  return !kickoff || kickoff.getTime() <= new Date().getTime();
}

function getPredictionOutcome_(match) {
  const status = String(match.status || '').trim().toUpperCase();
  if (status === 'VOID') return { status: 'VOID', outcome: '', points: 0 };
  if (status === 'AWARDED') {
    const winnerId = String(match.awarded_winner_team_id || '');
    if (winnerId && winnerId === String(match.home_team_id || '')) {
      return { status: 'SETTLED', outcome: '1' };
    }
    if (winnerId && winnerId === String(match.away_team_id || '')) {
      return { status: 'SETTLED', outcome: '2' };
    }
    return null;
  }
  if (status !== 'FINISHED') return null;

  const homeScore = nonNegativeIntegerOrNull_(match.home_score);
  const awayScore = nonNegativeIntegerOrNull_(match.away_score);
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return { status: 'SETTLED', outcome: '1' };
  if (awayScore > homeScore) return { status: 'SETTLED', outcome: '2' };

  const isKnockout = !isGroupStageRecord_(match);
  if (!isKnockout) return { status: 'SETTLED', outcome: 'X' };
  const homePenalties = nonNegativeIntegerOrNull_(match.home_penalties);
  const awayPenalties = nonNegativeIntegerOrNull_(match.away_penalties);
  if (
    homePenalties === null ||
    awayPenalties === null ||
    homePenalties === awayPenalties
  ) return null;
  return {
    status: 'SETTLED',
    outcome: homePenalties > awayPenalties ? '1' : '2'
  };
}

function settlePredictions_(seasonId) {
  assertPredictionSheetsReady_();
  const settings = getPredictionSettings_();
  const matches = getSheetRecords('Matches')
    .filter(match => !seasonId || String(match.season_id) === String(seasonId));
  const matchesById = Object.create(null);
  matches.forEach(match => { matchesById[String(match.id)] = match; });
  const predictions = getSheetRecords('Predictions')
    .filter(record => !seasonId || String(record.season_id) === String(seasonId));
  const existingSettlements = getSheetRecords('Prediction Results');
  const resultsByPrediction = Object.create(null);
  existingSettlements.forEach(result => {
    resultsByPrediction[String(result.prediction_id)] = result;
  });
  let changed = 0;

  predictions.forEach(prediction => {
    const match = matchesById[String(prediction.fixture_id)];
    if (!match) return;
    const result = getPredictionOutcome_(match);
    if (!result) return;
    const current = resultsByPrediction[String(prediction.prediction_id)];
    const selected = String(prediction.selected_outcome || '').toUpperCase();
    const points = result.status === 'VOID'
      ? 0
      : selected === result.outcome
        ? Number(settings.points_per_correct_prediction || 1)
        : 0;
    const timestamp = new Date().toISOString();
    const oldResult = current
      ? {
          official_result: String(current.official_result || ''),
          selected_outcome: String(current.selected_outcome || ''),
          settlement_status: String(current.settlement_status || ''),
          points_awarded: Number(current.points_awarded || 0)
        }
      : null;
    const newResult = {
      official_result: result.outcome,
      selected_outcome: selected,
      settlement_status: result.status,
      points_awarded: points
    };
    if (
      current &&
      oldResult.official_result === newResult.official_result &&
      oldResult.selected_outcome === newResult.selected_outcome &&
      oldResult.settlement_status === newResult.settlement_status &&
      oldResult.points_awarded === newResult.points_awarded
    ) return;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw apiError_('Prediction settlement is busy; retry the settlement');
    }
    try {
      const latest = getSheetRecords('Prediction Results').find(record =>
        String(record.prediction_id) === String(prediction.prediction_id)
      );
      if (latest) {
        const updates = {
          official_result: result.outcome,
          selected_outcome: selected,
          settlement_status: result.status,
          points_awarded: points,
          settled_at: timestamp,
          settlement_version: Number(latest.settlement_version || 0) + 1,
          last_updated: timestamp
        };
        updatePredictionRecordLocked_(
          'Prediction Results',
          'prediction_id',
          String(prediction.prediction_id),
          updates,
          'prediction.result.recalculated',
          oldResult,
          newResult,
          { email: 'system-prediction-settlement' }
        );
      } else {
        appendPredictionRecordLocked_(
          'Prediction Results',
          {
            settlement_id: Utilities.getUuid(),
            prediction_id: String(prediction.prediction_id),
            predictor_id: String(prediction.predictor_id),
            fixture_id: String(prediction.fixture_id),
            official_result: result.outcome,
            selected_outcome: selected,
            settlement_status: result.status,
            points_awarded: points,
            settled_at: timestamp,
            settlement_version: 1,
            last_updated: timestamp
          },
          'prediction.result.settled',
          String(prediction.prediction_id),
          { email: 'system-prediction-settlement' },
          newResult
        );
      }
      changed += 1;
    } finally {
      lock.releaseLock();
    }
  });
  return changed;
}

function runPredictionMaintenance() {
  assertPredictionSheetsReady_();
  lockExpiredPredictions_();
  settlePredictions_();
}

function lockExpiredPredictions_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    console.warn('Prediction locking skipped because another execution holds the lock');
    return;
  }
  try {
  const matches = getSheetRecords('Matches');
  const matchesById = Object.create(null);
  matches.forEach(match => { matchesById[String(match.id)] = match; });
  const predictions = getSheetRecords('Predictions');
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName('Predictions');
  const headers = validatePredictionSheetHeaders_('Predictions', sheet);
  const idIndex = headers.indexOf('prediction_id');
  const isLockedIndex = headers.indexOf('is_locked');
  const lockedAtIndex = headers.indexOf('locked_at');
  const ids = sheet.getLastRow() >= 2
    ? sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1)
      .getDisplayValues()
    : [];
  const rowByPredictionId = Object.create(null);
  ids.forEach((row, index) => {
    rowByPredictionId[String(row[0]).trim()] = index + 2;
  });
  let updated = false;
  predictions.forEach(prediction => {
    if (optionalBoolean_(prediction.is_locked, 'Predictions.is_locked') === true) return;
    const match = matchesById[String(prediction.fixture_id)];
    if (!hasPredictionDeadlinePassed_(match)) return;
    const rowNumber = rowByPredictionId[String(prediction.prediction_id)];
    if (!rowNumber) return;
    sheet.getRange(rowNumber, isLockedIndex + 1).setValue(true);
    sheet.getRange(rowNumber, lockedAtIndex + 1).setValue(new Date().toISOString());
    updated = true;
  });
  if (updated) invalidateSheetRecordsCache_('Predictions');
  } finally {
    lock.releaseLock();
  }
}

function getPredictionLeaderboard_(seasonId, category, settings) {
  const eligibleSeasons = getPredictionEligibleSeasons_(settings)
    .filter(season =>
      (!seasonId || season.id === seasonId) &&
      (!category || season.category === category.toLowerCase())
    );
  const allowedSeasonIds = new Set(eligibleSeasons.map(season => season.id));
  const predictors = getSheetRecords('Predictors')
    .filter(record => String(record.account_status || '').toUpperCase() === 'ACTIVE');
  const predictorsById = Object.create(null);
  predictors.forEach(record => {
    predictorsById[String(record.predictor_id)] = record;
  });
  const predictions = getSheetRecords('Predictions')
    .filter(record => allowedSeasonIds.has(String(record.season_id)));
  const settlements = getSheetRecords('Prediction Results');
  const settlementsByPrediction = Object.create(null);
  settlements.forEach(record => {
    settlementsByPrediction[String(record.prediction_id)] = record;
  });
  const totals = Object.create(null);
  predictions.forEach(prediction => {
    const predictorId = String(prediction.predictor_id);
    if (!predictorsById[predictorId]) return;
    if (!totals[predictorId]) {
      totals[predictorId] = {
        predictor_id: predictorId,
        display_name: String(predictorsById[predictorId].display_name || ''),
        total_predictions: 0,
        settled_predictions: 0,
        correct_predictions: 0,
        total_points: 0
      };
    }
    const total = totals[predictorId];
    total.total_predictions += 1;
    const settlement = settlementsByPrediction[String(prediction.prediction_id)];
    if (!settlement) return;
    const status = String(settlement.settlement_status || '').toUpperCase();
    if (status === 'VOID' || status !== 'SETTLED') return;
    total.settled_predictions += 1;
    total.total_points += Number(settlement.points_awarded || 0);
    if (
      String(settlement.selected_outcome || '').toUpperCase() ===
      String(settlement.official_result || '').toUpperCase()
    ) {
      total.correct_predictions += 1;
    }
  });
  const leaderboard = Object.keys(totals).map(id => {
    const total = totals[id];
    return Object.assign({}, total, {
      pending_predictions: total.total_predictions -
        total.settled_predictions -
        predictions.filter(prediction => {
          if (String(prediction.predictor_id) !== id) return false;
          const settlement = settlementsByPrediction[String(prediction.prediction_id)];
          return settlement &&
            String(settlement.settlement_status || '').toUpperCase() === 'VOID';
        }).length,
      accuracy_percentage: total.settled_predictions
        ? Math.round(total.correct_predictions / total.settled_predictions * 10000) / 100
        : 0
    });
  }).sort((left, right) =>
    right.total_points - left.total_points ||
    right.correct_predictions - left.correct_predictions ||
    right.accuracy_percentage - left.accuracy_percentage
  );
  let previousRank = 0;
  leaderboard.forEach((entry, index) => {
    const previous = leaderboard[index - 1];
    if (
      !previous ||
      entry.total_points !== previous.total_points ||
      entry.correct_predictions !== previous.correct_predictions ||
      entry.accuracy_percentage !== previous.accuracy_percentage
    ) previousRank = index + 1;
    entry.rank = previousRank;
  });
  return leaderboard;
}

function getPredictionStatistics_(seasonId, category, settings) {
  const eligibleSeasons = getPredictionEligibleSeasons_(settings)
    .filter(season =>
      (!seasonId || season.id === seasonId) &&
      (!category || season.category === category.toLowerCase())
    );
  const allowedSeasonIds = new Set(eligibleSeasons.map(season => season.id));
  const predictors = getSheetRecords('Predictors')
    .filter(record => String(record.account_status || '').toUpperCase() === 'ACTIVE');
  const predictions = getSheetRecords('Predictions')
    .filter(record => allowedSeasonIds.has(String(record.season_id)));
  const settlements = getSheetRecords('Prediction Results');
  const settlementsByPrediction = Object.create(null);
  settlements.forEach(record => {
    settlementsByPrediction[String(record.prediction_id)] = record;
  });
  const stats = {
    registered_predictors: predictors.length,
    total_predictions: predictions.length,
    correct_predictions: 0,
    incorrect_predictions: 0,
    pending_predictions: 0,
    void_predictions: 0,
    most_selected_outcome: null,
    accuracy_percentage: 0
  };
  const selections = { '1': 0, X: 0, '2': 0 };
  predictions.forEach(prediction => {
    const selection = String(prediction.selected_outcome || '').toUpperCase();
    if (selections[selection] !== undefined) selections[selection] += 1;
    const settlement = settlementsByPrediction[String(prediction.prediction_id)];
    const status = String(settlement && settlement.settlement_status || '').toUpperCase();
    if (!settlement || status === 'PENDING') {
      stats.pending_predictions += 1;
    } else if (status === 'VOID') {
      stats.void_predictions += 1;
    } else if (
      String(settlement.selected_outcome || '').toUpperCase() ===
      String(settlement.official_result || '').toUpperCase()
    ) {
      stats.correct_predictions += 1;
    } else {
      stats.incorrect_predictions += 1;
    }
  });
  const settledCount = stats.correct_predictions + stats.incorrect_predictions;
  stats.accuracy_percentage = settledCount
    ? Math.round(stats.correct_predictions / settledCount * 10000) / 100
    : 0;
  const mostSelected = Object.keys(selections).sort((left, right) =>
    selections[right] - selections[left]
  )[0];
  if (selections[mostSelected] > 0) stats.most_selected_outcome = mostSelected;
  return stats;
}

function handlePredictionAdminAction_(body, user) {
  const action = requiredText_(body.action, 'action');
  if (action === 'admin.predictions.initialize') {
    return initializePredictionSheets_(user);
  }
  assertPredictionSheetsReady_();
  if (action === 'admin.predictions.summary') {
    const settings = getPredictionSettings_();
    return {
      settings: settings,
      statistics: getPredictionStatistics_(null, null, settings),
      leaderboard: getPredictionLeaderboard_(null, null, settings),
      seasons: getSheetRecords('Seasons').map(normalizeSeason_)
        .filter(season => season.active && !season.archived)
        .map(season => ({
        id: season.id,
        name: season.name,
        category: season.category
        })),
      pending_settlements: getSheetRecords('Predictions').filter(prediction => {
        const settlement = getSheetRecords('Prediction Results').find(result =>
          String(result.prediction_id) === String(prediction.prediction_id)
        );
        return !settlement || String(settlement.settlement_status).toUpperCase() === 'PENDING';
      }).length
    };
  }
  if (action === 'admin.predictions.settle') {
    const count = settlePredictions_(optionalText_(body.season_id));
    return { updated_settlements: count };
  }
  if (action === 'admin.predictions.predictors') {
    const query = String(body.query || '').trim().toLowerCase();
    return getSheetRecords('Predictors')
      .filter(record =>
        !query ||
        String(record.predictor_id || '').toLowerCase().includes(query) ||
        String(record.display_name || '').toLowerCase().includes(query)
      )
      .map(record => ({
        predictor_id: String(record.predictor_id),
        display_name: String(record.display_name || ''),
        account_status: String(record.account_status || ''),
        registration_date: String(record.registration_date || ''),
        verification_status: String(record.verification_status || '')
      }));
  }
  if (action === 'admin.predictions.accountStatus') {
    return updatePredictorAccountStatus_(body, user);
  }
  if (action === 'admin.predictions.resetAccessCode') {
    return resetPredictorAccessCode_(body, user);
  }
  if (action === 'admin.predictions.setSetting') {
    return setPredictionSetting_(body, user);
  }
  throw apiError_('Unsupported Predictions Centre administrator action');
}

function updatePredictorAccountStatus_(body, user) {
  const predictorId = requiredText_(body.predictor_id, 'Predictor ID').toUpperCase();
  const status = requiredText_(body.account_status, 'account_status').toUpperCase();
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    throw apiError_('Account status must be ACTIVE or SUSPENDED');
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw apiError_('Another update is in progress');
  try {
    const predictor = getSheetRecords('Predictors').find(record =>
      String(record.predictor_id).toUpperCase() === predictorId
    );
    if (!predictor) throw apiError_('Predictor not found');
    updatePredictionRecordLocked_(
      'Predictors', 'predictor_id', predictorId,
      { account_status: status, last_updated: new Date().toISOString() },
      'prediction.predictor.status.updated',
      { account_status: String(predictor.account_status || '') },
      { account_status: status },
      user
    );
    return { predictor_id: predictorId, account_status: status };
  } finally {
    lock.releaseLock();
  }
}

function resetPredictorAccessCode_(body, user) {
  const predictorId = requiredText_(body.predictor_id, 'Predictor ID').toUpperCase();
  const reason = requiredText_(body.reason, 'reason');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw apiError_('Another update is in progress');
  try {
    const predictor = getSheetRecords('Predictors').find(record =>
      String(record.predictor_id).toUpperCase() === predictorId
    );
    if (!predictor) throw apiError_('Predictor not found');
    const accessCode = generatePredictorAccessCode_();
    updatePredictionRecordLocked_(
      'Predictors', 'predictor_id', predictorId,
      {
        access_code_hash: hashPredictorAccessCode_(accessCode),
        last_updated: new Date().toISOString()
      },
      'prediction.predictor.access_code.reset',
      { predictor_id: predictorId },
      { access_code_reset: true },
      user,
      reason
    );
    return {
      predictor_id: predictorId,
      access_code: accessCode,
      access_code_notice: 'Deliver this code privately. It will not be shown again.'
    };
  } finally {
    lock.releaseLock();
  }
}

function setPredictionSetting_(body, user) {
  const key = requiredText_(body.setting_key, 'setting_key');
  const type = PREDICTION_ALLOWED_SETTINGS[key];
  if (!type) throw apiError_('Unsupported Predictions Centre setting');
  const rawValue = body.setting_value === undefined || body.setting_value === null
    ? ''
    : String(body.setting_value).trim();
  const value = type === 'text' ? rawValue : rawValue.toLowerCase();
  if (type === 'boolean' && !['true', 'false'].includes(value)) {
    throw apiError_(key + ' must be true or false');
  }
  if (type === 'points' && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 10)) {
    throw apiError_('points_per_correct_prediction must be a whole number from 0 to 10');
  }
  if (type === 'text' && value) {
    const seasonExists = getSheetRecords('Seasons').some(season =>
      String(season.id) === value &&
      optionalBoolean_(season.active, 'Seasons.active') === true &&
      optionalBoolean_(season.archived, 'Seasons.archived') !== true
    );
    if (!seasonExists) throw apiError_('Select an active, non-archived season');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw apiError_('Another update is in progress');
  try {
    const existing = getSheetRecords('Prediction Settings').find(record =>
      String(record.setting_key) === key
    );
    const timestamp = new Date().toISOString();
    const updates = {
      setting_value: value,
      updated_at: timestamp,
      updated_by: user.email
    };
    if (existing) {
      updatePredictionRecordLocked_(
        'Prediction Settings',
        'setting_key',
        key,
        updates,
        'prediction.setting.updated',
        { setting_value: String(existing.setting_value || '') },
        { setting_value: value },
        user
      );
    } else {
      appendPredictionRecordLocked_(
        'Prediction Settings',
        Object.assign({
          setting_key: key,
          description: ''
        }, updates),
        'prediction.setting.created',
        key,
        user,
        { setting_value: value }
      );
    }
    return { setting_key: key, setting_value: value };
  } finally {
    lock.releaseLock();
  }
}

function appendPredictionRecordLocked_(
  sheetName, record, action, entityId, user, auditSnapshot
) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) throw apiError_(sheetName + ' sheet not found');
  const headers = validatePredictionSheetHeaders_(sheetName, sheet);
  const rowNumber = sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([
    headers.map(header =>
      Object.prototype.hasOwnProperty.call(record, header) ? record[header] : ''
    )
  ]);
  try {
    appendAuditLog_(
      user,
      action,
      sheetName,
      entityId,
      null,
      auditSnapshot || predictionAuditSnapshot_(record),
      ''
    );
  } catch (error) {
    sheet.deleteRow(rowNumber);
    throw error;
  }
  invalidateSheetRecordsCache_(sheetName);
  return record;
}

function updatePredictionRecordLocked_(
  sheetName, keyField, keyValue, updates, action, oldAudit, newAudit, user, reason
) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) throw apiError_(sheetName + ' sheet not found');
  const headers = validatePredictionSheetHeaders_(sheetName, sheet);
  const keyIndex = headers.indexOf(keyField);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw apiError_('Prediction record not found');
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const rowOffset = rows.findIndex(row => String(row[keyIndex]).trim() === String(keyValue));
  if (rowOffset < 0) throw apiError_('Prediction record not found');
  const rowNumber = rowOffset + 2;
  const oldRecord = headers.reduce((result, header, index) => {
    result[header] = rows[rowOffset][index];
    return result;
  }, {});
  const writtenFields = [];
  try {
    Object.keys(updates).forEach(field => {
      const index = headers.indexOf(field);
      if (index < 0 || headers.lastIndexOf(field) !== index) {
        throw apiError_(sheetName + ' sheet must contain one ' + field + ' column');
      }
      sheet.getRange(rowNumber, index + 1).setValue(updates[field]);
      writtenFields.push(field);
    });
    appendAuditLog_(
      user,
      action,
      sheetName,
      keyValue,
      oldAudit,
      newAudit,
      reason || ''
    );
  } catch (error) {
    writtenFields.forEach(field => {
      const index = headers.indexOf(field);
      sheet.getRange(rowNumber, index + 1).setValue(oldRecord[field]);
    });
    throw error;
  }
  invalidateSheetRecordsCache_(sheetName);
  return Object.assign(oldRecord, updates);
}

function predictionAuditSnapshot_(record) {
  return {
    predictor_id: record.predictor_id || '',
    fixture_id: record.fixture_id || '',
    selected_outcome: record.selected_outcome || '',
    account_status: record.account_status || '',
    setting_key: record.setting_key || '',
    setting_value: record.setting_value || ''
  };
}
