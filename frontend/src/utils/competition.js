export const PUBLIC_CATEGORIES = [
  { value: 'senior_boys', label: 'Senior Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'junior_boys', label: 'Junior Boys' },
  { value: 'intermediate', label: 'Intermediate' }
];

const STAGE_ALIASES = {
  GROUP: 'GROUP',
  'GROUP STAGE': 'GROUP',
  QF: 'QF',
  QUARTERFINAL: 'QF',
  QUARTERFINALS: 'QF',
  SF: 'SF',
  SEMIFINAL: 'SF',
  SEMIFINALS: 'SF',
  THIRD_PLACE: 'THIRD_PLACE',
  'THIRD PLACE': 'THIRD_PLACE',
  FINAL: 'FINAL',
  SPECIAL: 'SPECIAL'
};

const STAGE_LABELS = {
  GROUP: 'Group Stage',
  QF: 'Quarterfinals',
  SF: 'Semifinals',
  THIRD_PLACE: 'Third Place',
  FINAL: 'Final',
  SPECIAL: 'Special'
};

const MATCH_STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  LIVE: 'Live',
  FINISHED: 'Full Time',
  AWARDED: 'Awarded',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
  ABANDONED: 'Abandoned',
  VOID: 'Void'
};

const MATCH_PERIOD_LABELS = {
  NOT_STARTED: 'Not Started',
  FIRST_HALF: 'First Half',
  '1ST_HALF': 'First Half',
  HALFTIME: 'Half Time',
  HALF_TIME: 'Half Time',
  SECOND_HALF: 'Second Half',
  '2ND_HALF': 'Second Half',
  EXTRA_TIME: 'Extra Time',
  EXTRA_TIME_FIRST_HALF: 'Extra Time - First Half',
  EXTRA_TIME_SECOND_HALF: 'Extra Time - Second Half',
  PENALTIES: 'Penalties',
  SHOOTOUT: 'Penalties',
  ENDED: 'Ended'
};

export function getMatchStatusCode(match) {
  const status = match?.status;
  if (status === null || status === undefined) return null;
  const normalized = String(status).trim().toUpperCase();
  return normalized || null;
}

export function getMatchStatusLabel(match) {
  const status = getMatchStatusCode(match);
  if (!status) return 'Status unavailable';
  return MATCH_STATUS_LABELS[status] || String(match.status).trim();
}

export function getMatchPeriodLabel(match) {
  const period = match?.current_period;
  if (period === null || period === undefined) return null;
  const normalized = String(period).trim();
  if (!normalized) return null;

  const key = normalized.toUpperCase().replace(/[\s-]+/g, '_');
  return MATCH_PERIOD_LABELS[key] || normalized;
}

export function getMatchStage(match) {
  const rawStage = match?.stage ?? match?.match_stage;
  const stage = rawStage === null || rawStage === undefined
    ? ''
    : String(rawStage).trim().toUpperCase();
  return STAGE_ALIASES[stage] || stage || null;
}

export function getMatchStageLabel(match) {
  const stage = getMatchStage(match);
  return STAGE_LABELS[stage] || (stage ? stage : 'Group Stage');
}

export function getMatchesForStage(matches, stage) {
  return (matches || [])
    .filter(match => getMatchStage(match) === stage)
    .sort((left, right) => {
      const leftNumber = Number(left.match_number ?? left.matchday);
      const rightNumber = Number(right.match_number ?? right.matchday);
      return leftNumber - rightNumber;
    });
}

export function isFinalMatch(match) {
  return getMatchStage(match) === 'FINAL';
}

export function isGroupStageMatch(match) {
  const stage = getMatchStage(match);
  if (stage !== null) return stage === 'GROUP';

  const matchday = Number(match?.matchday ?? match?.match_number);
  return !Number.isFinite(matchday) || matchday < 22;
}

export function getLagosDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function shiftDateKey(dateKey, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const date = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + days
  ));
  return date.toISOString().slice(0, 10);
}

export function getMatchDateKey(match) {
  const date = match?.match_date;
  if (!date) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = new Date(match.kickoff_at || date);
  return Number.isNaN(parsed.getTime()) ? null : getLagosDateKey(parsed);
}

function parseLagosDateTime(value) {
  const text = value === null || value === undefined ? '' : String(value).trim();
  if (!text) return null;

  const localDateTime = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/;
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(text);
  const date = new Date(
    localDateTime.test(text) && !hasTimezone ? `${text}+01:00` : text
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateOnlyValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const date = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12
  ));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

export function getMatchKickoffDate(match) {
  const kickoffAt = match?.kickoff_at === null || match?.kickoff_at === undefined
    ? ''
    : String(match.kickoff_at).trim();
  if (kickoffAt && /T\d{2}:\d{2}/.test(kickoffAt)) {
    return parseLagosDateTime(kickoffAt);
  }

  const matchDate = match?.match_date === null || match?.match_date === undefined
    ? ''
    : String(match.match_date).trim();
  const dateOnly = getDateOnlyValue(matchDate || kickoffAt);
  const kickoffTime = match?.kickoff_time === null || match?.kickoff_time === undefined
    ? ''
    : String(match.kickoff_time).trim();
  const timeParts = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(kickoffTime);

  if (dateOnly && timeParts) {
    const hours = Number(timeParts[1]);
    const minutes = Number(timeParts[2]);
    const seconds = Number(timeParts[3] || 0);
    if (hours > 23 || minutes > 59 || seconds > 59) return null;
    const dateText = `${matchDate || kickoffAt}T${String(hours).padStart(2, '0')}:${timeParts[2]}:${String(seconds).padStart(2, '0')}+01:00`;
    return parseLagosDateTime(dateText);
  }

  if (dateOnly) return null;
  return parseLagosDateTime(kickoffAt || matchDate);
}

export function formatMatchSchedule(match) {
  const date = getMatchKickoffDate(match);
  if (date) {
    return date.toLocaleString(undefined, {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  const matchDate = match?.match_date === null || match?.match_date === undefined
    ? ''
    : String(match.match_date).trim();
  const dateOnly = getDateOnlyValue(matchDate);
  if (dateOnly) {
    return dateOnly.toLocaleDateString(undefined, {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  const value = match?.kickoff_at || match?.match_date;
  if (!value) return 'Date to be confirmed';
  return String(value);
}
