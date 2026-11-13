import { getFairPlayPoints, rankGroupStandings } from './standingsRanking';

function team(id, fairPlayPoints, fairPlayComplete = true) {
  return {
    team_id: id,
    points: 4,
    goal_diff: 2,
    goals_for: 5,
    fair_play_points: fairPlayPoints,
    fair_play_complete: fairPlayComplete
  };
}

function draw(homeId, awayId) {
  return {
    home_team_id: homeId,
    away_team_id: awayId,
    home_score: 1,
    away_score: 1,
    status: 'FINISHED'
  };
}

test('calculates weighted Fair Play points using competition card values', () => {
  expect(getFairPlayPoints({
    home_fair_play_yellow_only: 1,
    home_fair_play_second_yellow_red: 1,
    home_fair_play_direct_red: 1,
    home_fair_play_yellow_direct_red: 1
  }, 'home')).toBe(13);
});

test('uses fewer Fair Play points only after overall and head-to-head ties', () => {
  const teams = [
    team('team-more-cards', 3),
    team('team-fewer-cards', 1)
  ];

  expect(rankGroupStandings(teams, [draw('team-more-cards', 'team-fewer-cards')])
    .map(item => item.team_id))
    .toEqual(['team-fewer-cards', 'team-more-cards']);
});

test('head-to-head ranking takes precedence over Fair Play points', () => {
  const teams = [
    team('team-more-cards', 20),
    team('team-fewer-cards', 0)
  ];
  const headToHead = {
    home_team_id: 'team-more-cards',
    away_team_id: 'team-fewer-cards',
    home_score: 2,
    away_score: 1,
    status: 'FINISHED'
  };

  expect(rankGroupStandings(teams, [headToHead]).map(item => item.team_id))
    .toEqual(['team-more-cards', 'team-fewer-cards']);
});

test('does not use Fair Play to break a tie when card records are incomplete', () => {
  const teams = [
    team('team-incomplete', 0, false),
    team('team-complete', 8, true)
  ];

  expect(rankGroupStandings(teams, [draw('team-incomplete', 'team-complete')])
    .map(item => item.team_id))
    .toEqual(['team-incomplete', 'team-complete']);
});

test('does not treat missing or invalid card counts as zero', () => {
  expect(getFairPlayPoints({
    home_fair_play_yellow_only: 0,
    home_fair_play_second_yellow_red: 0,
    home_fair_play_direct_red: 0
  }, 'home')).toBeNull();
  expect(getFairPlayPoints({
    home_fair_play_yellow_only: -1,
    home_fair_play_second_yellow_red: 0,
    home_fair_play_direct_red: 0,
    home_fair_play_yellow_direct_red: 0
  }, 'home')).toBeNull();
});
