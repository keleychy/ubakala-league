const FAIR_PLAY_CARDS = [
  ['yellow_only', 1],
  ['second_yellow_red', 3],
  ['direct_red', 4],
  ['yellow_direct_red', 5]
];

function splitTies(teams, compare) {
  const sorted = [...teams].sort(compare);
  return sorted.reduce((groups, team) => {
    const current = groups[groups.length - 1];
    if (!current || compare(current[0], team) !== 0) {
      groups.push([team]);
    } else {
      current.push(team);
    }
    return groups;
  }, []);
}

function awardedWinnerId(match) {
  const status = String(match.status || '').trim().toUpperCase();
  if (status !== 'AWARDED') return '';
  return String(match.awarded_winner_team_id || match.awarded_to || '');
}

function compareHeadToHead(left, right) {
  return right.head_to_head_points - left.head_to_head_points ||
    right.head_to_head_goal_difference - left.head_to_head_goal_difference ||
    right.head_to_head_goals_for - left.head_to_head_goals_for;
}

export function getFairPlayPoints(match, side) {
  const counts = FAIR_PLAY_CARDS.map(([cardType]) => {
    const value = match[`${side}_fair_play_${cardType}`];
    if (value === '' || value === null || value === undefined) return null;
    const count = Number(value);
    return Number.isInteger(count) && count >= 0 ? count : null;
  });
  if (counts.some(count => count === null)) return null;
  return FAIR_PLAY_CARDS.reduce(
    (total, [, penalty], index) => total + counts[index] * penalty,
    0
  );
}

export function rankGroupStandings(teams, completedMatches) {
  const compareOverall = (left, right) =>
    right.points - left.points ||
    right.goal_diff - left.goal_diff ||
    right.goals_for - left.goals_for;

  const resolveHeadToHeadTies = tiedTeams => {
    const tiedTeamIds = new Set(tiedTeams.map(team => String(team.team_id)));
    const miniTable = new Map(
      tiedTeams.map(team => [
        String(team.team_id),
        { points: 0, goals_for: 0, goals_against: 0 }
      ])
    );

    completedMatches.forEach(match => {
      const homeId = String(match.home_team_id);
      const awayId = String(match.away_team_id);
      if (!tiedTeamIds.has(homeId) || !tiedTeamIds.has(awayId)) return;

      const home = miniTable.get(homeId);
      const away = miniTable.get(awayId);
      const homeScore = Number(match.home_score);
      const awayScore = Number(match.away_score);
      home.goals_for += homeScore;
      home.goals_against += awayScore;
      away.goals_for += awayScore;
      away.goals_against += homeScore;

      if (awardedWinnerId(match) === homeId) {
        home.points += 3;
      } else if (awardedWinnerId(match) === awayId) {
        away.points += 3;
      } else if (homeScore > awayScore) {
        home.points += 3;
      } else if (homeScore < awayScore) {
        away.points += 3;
      } else {
        home.points += 1;
        away.points += 1;
      }
    });

    const miniRanked = tiedTeams.map(team => {
      const stats = miniTable.get(String(team.team_id));
      return {
        ...team,
        head_to_head_points: stats.points,
        head_to_head_goal_difference: stats.goals_for - stats.goals_against,
        head_to_head_goals_for: stats.goals_for
      };
    });
    const partitions = splitTies(miniRanked, compareHeadToHead);
    if (partitions.length === 1) return [tiedTeams];
    return partitions.flatMap(partition =>
      partition.length > 1 ? resolveHeadToHeadTies(partition) : [partition]
    );
  };

  return splitTies(teams, compareOverall).flatMap(overallGroup => {
    const headToHeadGroups = overallGroup.length > 1
      ? resolveHeadToHeadTies(overallGroup)
      : [overallGroup];

    return headToHeadGroups.flatMap(headToHeadGroup => {
      if (
        headToHeadGroup.length < 2 ||
        !headToHeadGroup.every(team => team.fair_play_complete)
      ) {
        return headToHeadGroup;
      }
      return splitTies(
        headToHeadGroup,
        (left, right) => left.fair_play_points - right.fair_play_points
      ).flat();
    });
  });
}
