import {
  getMatchDateKey,
  getMatchKickoffDate,
  getMatchStage,
  getMatchStageLabel,
  getMatchStatusCode,
  getMatchStatusLabel,
  getMatchPeriodLabel,
  formatMatchSchedule,
  getMatchesForStage,
  isGroupStageMatch,
  isFinalMatch,
  PUBLIC_CATEGORIES
} from './competition';

describe('competition compatibility helpers', () => {
  test('includes Intermediate in public categories', () => {
    expect(PUBLIC_CATEGORIES).toContainEqual({
      value: 'intermediate',
      label: 'Intermediate'
    });
  });

  test.each([
    ['SCHEDULED', 'Scheduled'],
    ['LIVE', 'Live'],
    ['FINISHED', 'Full Time'],
    ['AWARDED', 'Awarded'],
    ['POSTPONED', 'Postponed'],
    ['CANCELLED', 'Cancelled'],
    ['ABANDONED', 'Abandoned'],
    ['VOID', 'Void']
  ])('uses the official %s match status', (status, label) => {
    const match = { status };

    expect(getMatchStatusCode(match)).toBe(status);
    expect(getMatchStatusLabel(match)).toBe(label);
  });

  test('does not infer status from scores or dates when status is missing', () => {
    const match = {
      home_score: 2,
      away_score: 1,
      match_date: '2026-10-27'
    };

    expect(getMatchStatusCode(match)).toBeNull();
    expect(getMatchStatusLabel(match)).toBe('Status unavailable');
  });

  test('shows a live match period separately from its status', () => {
    const match = { status: 'LIVE', current_period: 'second_half' };

    expect(getMatchStatusLabel(match)).toBe('Live');
    expect(getMatchPeriodLabel(match)).toBe('Second Half');
  });

  test('keeps unknown status and period values visible without guessing', () => {
    expect(getMatchStatusLabel({ status: 'UNDER_REVIEW' })).toBe('UNDER_REVIEW');
    expect(getMatchPeriodLabel({ current_period: 'VAR_CHECK' })).toBe('VAR_CHECK');
  });

  test('uses explicit stages so a Special match is not mistaken for the final', () => {
    const matches = [
      { id: 'm29', match_number: 29, stage: 'SPECIAL' },
      { id: 'm30', match_number: 30, stage: 'FINAL' }
    ];

    expect(getMatchStage(matches[0])).toBe('SPECIAL');
    expect(getMatchStageLabel(matches[0])).toBe('Special');
    expect(isFinalMatch(matches[0])).toBe(false);
    expect(getMatchesForStage(matches, 'FINAL')).toEqual([matches[1]]);
    expect(isFinalMatch(matches[1])).toBe(true);
  });

  test('recognizes the legacy Django stage labels', () => {
    expect(getMatchStage({ match_stage: 'Quarterfinal' })).toBe('QF');
    expect(getMatchStage({ match_stage: 'Third Place' })).toBe('THIRD_PLACE');
  });

  test('uses the date-only field for fixture-day grouping', () => {
    expect(getMatchDateKey({
      match_date: '2026-12-20',
      kickoff_time: '16:00',
      kickoff_at: '2026-12-20T16:00:00+01:00'
    })).toBe('2026-12-20');
  });

  test('combines a sheet date and kickoff time as Lagos local time', () => {
    const match = {
      match_date: '2026-10-27',
      kickoff_time: '14:00'
    };
    const kickoff = getMatchKickoffDate(match);

    expect(kickoff.toISOString()).toBe('2026-10-27T13:00:00.000Z');
    expect(formatMatchSchedule(match)).toContain('2:00 PM');
  });

  test('does not display midnight as a kickoff when only a date is available', () => {
    const match = { match_date: '2026-10-27' };

    expect(getMatchKickoffDate(match)).toBeNull();
    expect(formatMatchSchedule(match)).not.toMatch(/12:00|1:00/);
  });

  test('prefers explicit match stages when determining group-stage fixtures', () => {
    expect(isGroupStageMatch({ stage: 'GROUP', match_number: 30 })).toBe(true);
    expect(isGroupStageMatch({ stage: 'FINAL', match_number: 1 })).toBe(false);
    expect(isGroupStageMatch({ matchday: 21 })).toBe(true);
    expect(isGroupStageMatch({ matchday: 22 })).toBe(false);
  });
});
