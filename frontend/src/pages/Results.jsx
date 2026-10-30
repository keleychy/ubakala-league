
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/api';
import usePolling from '../utils/usePolling';
import {
  formatMatchSchedule,
  getMatchPeriodLabel,
  getMatchStatusCode,
  getMatchStatusLabel,
  getMatchStageLabel
} from '../utils/competition';

const FLASH_DURATION = 800;

const styles = `
  .results-page {
    --rs-primary: #173b70;
    --rs-primary-dark: #102b50;
    --rs-accent: #d6a83d;
    --rs-text: #263449;
    --rs-muted: #718096;
    --rs-border: #e6ebf2;
    --rs-background: #f5f7fb;
    min-height: 100vh;
    padding: 38px 22px 64px;
    background: var(--rs-background);
    color: var(--rs-text);
  }

  .results-container {
    max-width: 1250px;
    margin: 0 auto;
  }

  .results-heading {
    position: relative;
    overflow: hidden;
    margin-bottom: 25px;
    padding: 27px 30px 28px;
    border: 1px solid rgba(214, 168, 61, .55);
    border-left: 5px solid var(--rs-accent);
    border-radius: 16px;
    background: linear-gradient(115deg, #102b50 0%, #173b70 58%, #245286 100%);
    box-shadow: 0 12px 28px rgba(16, 43, 80, .14);
  }

  .results-eyebrow {
    display: inline-flex;
    align-items: center;
    margin-bottom: 11px;
    padding: 6px 10px;
    border: 1px solid rgba(240, 208, 132, .35);
    border-radius: 999px;
    background: rgba(214, 168, 61, .13);
    color: #f0d084;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.6px;
    text-transform: uppercase;
  }

  .results-title {
    margin: 0;
    color: #fff;
    font-size: clamp(28px, 3.5vw, 38px);
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1.15;
  }

  .results-subtitle {
    margin: 9px 0 0;
    color: rgba(235, 242, 251, .82);
    font-size: 14px;
    line-height: 1.5;
  }

  .results-filter-panel {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
    padding: 20px;
    margin-bottom: 25px;
    background: #fff;
    border: 1px solid var(--rs-border);
    border-radius: 14px;
    box-shadow: 0 3px 14px rgba(20, 43, 75, .035);
  }

  .results-filter {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 190px;
    flex: 1;
  }

  .results-filter label {
    color: #526176;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .8px;
    text-transform: uppercase;
  }

  .results-filter select {
    width: 100%;
    min-height: 44px;
    padding: 0 38px 0 13px;
    border: 1px solid #dce3ed;
    border-radius: 8px;
    background: #fbfcfe;
    color: var(--rs-primary-dark);
    font-size: 14px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  .results-filter select:focus {
    border-color: #5276a7;
    box-shadow: 0 0 0 3px rgba(82, 118, 167, .12);
  }

  .results-section-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin: 27px 0 16px;
  }

  .results-section-title {
    margin: 0;
    color: var(--rs-primary-dark);
    font-size: 17px;
    font-weight: 800;
  }

  .results-section-caption {
    margin: 5px 0 0;
    color: var(--rs-muted);
    font-size: 12px;
  }

  .results-count {
    display: inline-flex;
    align-items: center;
    min-height: 31px;
    padding: 0 11px;
    border: 1px solid #dce5f0;
    border-radius: 7px;
    background: #fff;
    color: var(--rs-primary);
    font-size: 11px;
    font-weight: 800;
  }

  .results-live-indicator {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #c33c3c;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .8px;
  }

  .results-live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #d64545;
    box-shadow: 0 0 0 4px rgba(214, 69, 69, .12);
    animation: resultsPulse 1.4s infinite;
  }

  @keyframes resultsPulse {
    50% { opacity: .45; }
  }

  .results-stage {
    margin-bottom: 25px;
  }

  .results-stage-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 17px;
    margin-bottom: 13px;
    border: 1px solid var(--rs-border);
    border-left: 4px solid var(--rs-accent);
    border-radius: 9px;
    background: #fff;
  }

  .results-stage-heading h3 {
    margin: 0;
    color: var(--rs-primary-dark);
    font-size: 14px;
    font-weight: 800;
  }

  .results-stage-count {
    color: #8793a4;
    font-size: 10px;
    font-weight: 800;
  }

  .results-match-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 430px), 1fr));
    gap: 15px;
  }

  .results-match-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--rs-border);
    border-radius: 13px;
    background: #fff;
    box-shadow: 0 3px 14px rgba(20, 43, 75, .04);
    transition: box-shadow .2s ease, transform .2s ease;
  }

  .results-match-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(20, 43, 75, .08);
  }

  .results-match-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-bottom: 1px solid #edf0f4;
    background: #fafbfd;
  }

  .results-match-meta-left {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
    color: #77869a;
    font-size: 10px;
    font-weight: 700;
  }

  .results-match-meta-right {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .results-status {
    display: inline-flex;
    align-items: center;
    min-height: 23px;
    padding: 0 8px;
    border-radius: 5px;
    background: #edf2f8;
    color: #526176;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .5px;
    text-transform: uppercase;
  }

  .results-status.completed {
    background: #e9f6ef;
    color: #16804b;
  }

  .results-status.live {
    background: #fff0f0;
    color: #c33c3c;
  }

  .results-status.awarded {
    background: #fff6e5;
    color: #956819;
  }

  .results-status.void {
    background: #f1f2f4;
    color: #697586;
  }

  .results-status.postponed,
  .results-status.abandoned {
    background: #fff4e5;
    color: #8a5a16;
  }

  .results-status.cancelled {
    background: #fcecec;
    color: #a63b3b;
  }

  .results-status.scheduled {
    background: #edf2f8;
    color: #526176;
  }

  .results-period {
    display: inline-flex;
    align-items: center;
    min-height: 23px;
    padding: 0 8px;
    border: 1px solid #dce5f0;
    border-radius: 5px;
    background: #f4f7fb;
    color: #526176;
    font-size: 9px;
    font-weight: 800;
  }

  .results-match-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 21px 17px;
  }

  .results-team {
    min-width: 0;
    color: #263b57;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .results-team.home {
    text-align: right;
  }

  .results-team.away {
    text-align: left;
  }

  .results-score-area {
    min-width: 92px;
    text-align: center;
  }

  .results-score {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 9px;
    color: var(--rs-primary-dark);
    font-size: 25px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .results-score-separator {
    color: #9aa6b5;
    font-size: 18px;
    font-weight: 500;
  }

  .results-pending {
    color: #9aa6b5;
    font-size: 12px;
    font-weight: 800;
  }

  .results-penalties {
    margin-top: 9px;
    color: #7b8797;
    font-size: 10px;
    font-weight: 700;
  }

  .results-original-score {
    margin-top: 7px;
    color: #8a94a3;
    font-size: 10px;
  }

  .results-match-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    padding: 11px 16px;
    border-top: 1px solid #edf0f4;
    color: #8490a0;
    font-size: 10px;
  }

  .results-match-venue {
    overflow-wrap: anywhere;
  }

  .results-awarded-info {
    padding: 10px 16px;
    border-top: 1px solid #f1e2bd;
    background: #fffaf0;
    color: #89651e;
    font-size: 11px;
    line-height: 1.5;
  }

  .results-flash {
    animation: resultsFlash ${FLASH_DURATION}ms ease-in-out;
  }

  @keyframes resultsFlash {
    0%, 50% { background: #fff1bf; }
    100% { background: transparent; }
  }

  .results-bracket {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
    gap: 14px;
    margin-bottom: 27px;
  }

  .results-bracket-card {
    overflow: hidden;
    border: 1px solid var(--rs-border);
    border-radius: 11px;
    background: #fff;
  }

  .results-bracket-title {
    padding: 11px 13px;
    border-bottom: 1px solid var(--rs-border);
    background: #f7f9fc;
    color: var(--rs-primary-dark);
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .results-bracket-team {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 11px 13px;
    color: #40516a;
    font-size: 11px;
    font-weight: 700;
  }

  .results-bracket-team + .results-bracket-team {
    border-top: 1px solid #edf0f4;
  }

  .results-bracket-team.winner {
    background: #fffbef;
    color: #8c681d;
  }

  .results-bracket-score {
    color: var(--rs-primary-dark);
    font-size: 13px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }

  .results-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 11px;
    padding: 40px 15px;
    color: #536780;
    font-size: 13px;
    font-weight: 600;
  }

  .results-spinner {
    width: 19px;
    height: 19px;
    border: 2px solid #dbe3ed;
    border-top-color: var(--rs-primary);
    border-radius: 50%;
    animation: resultsSpin .7s linear infinite;
  }

  @keyframes resultsSpin {
    to { transform: rotate(360deg); }
  }

  .results-state {
    padding: 54px 20px;
    border: 1px solid var(--rs-border);
    border-radius: 13px;
    background: #fff;
    text-align: center;
  }

  .results-state-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    margin-bottom: 15px;
    border-radius: 16px;
    background: #edf2f8;
    color: var(--rs-primary);
    font-size: 22px;
    font-weight: 800;
  }

  .results-state h3 {
    margin: 0 0 7px;
    color: var(--rs-primary-dark);
    font-size: 16px;
    font-weight: 800;
  }

  .results-state p {
    max-width: 440px;
    margin: 0 auto;
    color: var(--rs-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .results-error {
    padding: 13px 15px;
    margin: 15px 0;
    border: 1px solid #f0c4c4;
    border-radius: 9px;
    background: #fff4f4;
    color: #b42323;
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 650px) {
    .results-page {
      padding: 27px 13px 45px;
    }

    .results-heading {
      margin-bottom: 22px;
      padding: 22px 19px 23px;
    }

    .results-title {
      font-size: 29px;
    }

    .results-filter-panel {
      gap: 13px;
      padding: 15px;
    }

    .results-filter {
      min-width: 100%;
    }

    .results-match-list {
      grid-template-columns: minmax(0, 1fr);
      gap: 13px;
    }

    .results-match-body {
      gap: 7px;
      padding: 19px 11px;
    }

    .results-team {
      font-size: 11px;
    }

    .results-score-area {
      min-width: 76px;
    }

    .results-score {
      gap: 6px;
      font-size: 22px;
    }

    .results-match-meta,
    .results-match-footer {
      padding-left: 12px;
      padding-right: 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .results-page *,
    .results-page *::before,
    .results-page *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;

/* Handles both direct arrays and common API response wrappers. */
const extractList = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.matches)) return data.matches;
  if (Array.isArray(data?.seasons)) return data.seasons;

  return [];
};

const getSeasonId = (season) => {
  if (season && typeof season === 'object') {
    return season.id ?? season.pk ?? null;
  }

  return season ?? null;
};

const getMatchSeasonId = (match) => {
  return (
    getSeasonId(match?.season) ??
    match?.season_id ??
    match?.seasonId ??
    null
  );
};

const getTeamName = (team) => {
  if (!team) return 'TBC';

  if (typeof team === 'object') {
    return (
      team.name ??
      team.team?.name ??
      team.team_name ??
      'TBC'
    );
  }

  return String(team);
};

const isPlaceholder = (team) => {
  const name = getTeamName(team).trim().toUpperCase();

  return (
    name.startsWith('WINNER') ||
    name.startsWith('LOSER') ||
    name === 'TBC' ||
    name === 'TBD'
  );
};

const formatPlaceholder = (team) => {
  const name = getTeamName(team);

  if (!isPlaceholder(team)) return name;

  const match = name.match(/^(WINNER|LOSER)[\s_-]*(.*)$/i);

  if (!match) return name;

  const type = match[1].toUpperCase();
  const reference = match[2].replace(/[_-]/g, ' ').trim();

  return reference ? `${type} OF ${reference}` : type;
};

const getStageName = (match) => {
  return getMatchStageLabel(match) || match?.stage || 'Other Matches';
};

const getMatchDate = (match) => {
  return (
    match?.actual_start ||
    match?.match_date ||
    match?.scheduled_at ||
    null
  );
};

const isMatchAwarded = (match) => getMatchStatusCode(match) === 'AWARDED';

const isMatchVoid = (match) => getMatchStatusCode(match) === 'VOID';

const getAwardedName = (match) => {
  const awardedTo = match?.awarded_to ?? match?.awarded_winner_team_id;

  if (!awardedTo) return '';

  if (typeof awardedTo === 'object') {
    return awardedTo.name || awardedTo.team_name || '';
  }

  if (String(awardedTo) === String(match?.home_team_id ?? match?.home_team?.id)) {
    return getTeamName(match.home_team_name ?? match.home_team);
  }
  if (String(awardedTo) === String(match?.away_team_id ?? match?.away_team?.id)) {
    return getTeamName(match.away_team_name ?? match.away_team);
  }

  return String(awardedTo);
};

const Results = () => {
  const [matches, setMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flashMap, setFlashMap] = useState({});

  const prevMatchesRef = useRef({});
  const timeoutRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  /* Load available seasons. */
  useEffect(() => {
    let cancelled = false;

    const loadSeasons = async () => {
      try {
        const data = await api.getSeasons();

        if (cancelled) return;

        const seasonList = extractList(data);
        setSeasons(seasonList);

        if (seasonList.length > 0) {
          const firstSeasonId = getSeasonId(seasonList[0]);

          setSelectedSeason(
            firstSeasonId !== null && firstSeasonId !== undefined
              ? String(firstSeasonId)
              : ''
          );
        } else {
          setSelectedSeason('');
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load seasons:', err);
          setError(err?.message || 'Failed to load seasons');
          setLoading(false);
        }
      }
    };

    loadSeasons();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Fetch matches and detect score/team changes. */
  const fetchScores = async () => {
    try {
      const data = await api.getMatches();
      const incoming = extractList(data);

      const nextPrevious = {};
      const changedScores = {};
      const resolvedTeams = {};

      incoming.forEach((match) => {
        const id = match?.id;

        if (id === undefined || id === null) return;

        const previous = prevMatchesRef.current[id];

        if (previous) {
          const scoreChanged =
            previous.home_score !== match.home_score ||
            previous.away_score !== match.away_score;

          if (scoreChanged) {
            changedScores[id] = true;
          }

          const previousHome = getTeamName(previous.home_team);
          const previousAway = getTeamName(previous.away_team);
          const currentHome = getTeamName(match.home_team);
          const currentAway = getTeamName(match.away_team);

          if (
            (isPlaceholder(previous.home_team) &&
              !isPlaceholder(match.home_team)) ||
            (isPlaceholder(previous.away_team) &&
              !isPlaceholder(match.away_team)) ||
            (previousHome !== currentHome &&
              !isPlaceholder(match.home_team)) ||
            (previousAway !== currentAway &&
              !isPlaceholder(match.away_team))
          ) {
            resolvedTeams[id] = true;
          }
        }

        nextPrevious[id] = match;
      });

      if (Object.keys(changedScores).length > 0) {
        setFlashMap(changedScores);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setFlashMap({});
          timeoutRef.current = null;
        }, FLASH_DURATION);
      }

      if (Object.keys(resolvedTeams).length > 0) {
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }

        highlightTimeoutRef.current = setTimeout(() => {
          highlightTimeoutRef.current = null;
        }, 2500);
      }

      prevMatchesRef.current = nextPrevious;

      setMatches(incoming);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch match results:', err);
      setError(err?.message || 'Unable to load match results');
      setLoading(false);
    }
  };

  usePolling(fetchScores, {
    minInterval: 5000,
    maxInterval: 10000,
    immediate: true
  });

  /* Clear pending timers when the page unmounts. */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  /* Filter and sort matches by selected season. */
  const filteredMatches = useMemo(() => {
    let result = matches;

    if (selectedSeason) {
      result = result.filter((match) => {
        const seasonId = getMatchSeasonId(match);

        return (
          seasonId !== null &&
          seasonId !== undefined &&
          String(seasonId) === String(selectedSeason)
        );
      });
    }

    return [...result].sort((a, b) => {
      const dateA = getMatchDate(a)
        ? new Date(getMatchDate(a)).getTime()
        : 0;

      const dateB = getMatchDate(b)
        ? new Date(getMatchDate(b)).getTime()
        : 0;

      return dateB - dateA;
    });
  }, [matches, selectedSeason]);

  /* Group fixtures by competition stage. */
  const groupedMatches = useMemo(() => {
    const groups = {};

    filteredMatches.forEach((match) => {
      const stage = getStageName(match);

      if (!groups[stage]) {
        groups[stage] = [];
      }

      groups[stage].push(match);
    });

    const stageOrder = [
      'Final',
      'Special',
      'Third Place',
      'Semifinals',
      'Quarterfinals',
      'Group Stage'
    ];

    return Object.entries(groups).sort(([a], [b]) => {
      const ai = stageOrder.findIndex(
        (stage) => stage.toLowerCase() === a.toLowerCase()
      );

      const bi = stageOrder.findIndex(
        (stage) => stage.toLowerCase() === b.toLowerCase()
      );

      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;

      return ai - bi;
    });
  }, [filteredMatches]);

  /* Identify knockout matches for the overview. */
  const bracketStages = [
    {
      label: 'Semi-final 1',
      keys: ['SF1', 'Semi Final 1', 'Semifinal 1']
    },
    {
      label: 'Semi-final 2',
      keys: ['SF2', 'Semi Final 2', 'Semifinal 2']
    },
    {
      label: 'Third Place',
      keys: ['Third Place', '3rd Place']
    },
    {
      label: 'Special Match',
      keys: ['Special']
    },
    {
      label: 'Final',
      keys: ['Final']
    }
  ];

  const bracketMatches = bracketStages
    .map((stage) => {
      const match = filteredMatches.find((item) => {
        const label = String(
          item?.stage ||
          item?.round ||
          item?.match_name ||
          ''
        ).toLowerCase();

        return stage.keys.some(
          (key) => label === key.toLowerCase()
        );
      });

      return { ...stage, match };
    })
    .filter((item) => item.match);

  /* Render an individual knockout result. */
  const renderBracket = (match, label) => {
    const hasScores =
      match?.home_score !== null &&
      match?.home_score !== undefined &&
      match?.away_score !== null &&
      match?.away_score !== undefined;

    const homeWinner =
      hasScores &&
      Number(match.home_score) > Number(match.away_score);

    const awayWinner =
      hasScores &&
      Number(match.away_score) > Number(match.home_score);

    return (
      <div className="results-bracket-card" key={match.id}>
        <div className="results-bracket-title">{label}</div>

        <div className={`results-bracket-team ${homeWinner ? 'winner' : ''}`}>
          <span>{formatPlaceholder(match.home_team)}</span>

          <span className="results-bracket-score">
            {hasScores ? match.home_score : '—'}
          </span>
        </div>

        <div className={`results-bracket-team ${awayWinner ? 'winner' : ''}`}>
          <span>{formatPlaceholder(match.away_team)}</span>

          <span className="results-bracket-score">
            {hasScores ? match.away_score : '—'}
          </span>
        </div>
      </div>
    );
  };

  /* Render an individual match card. */
  const renderMatch = (match) => {
    const hasScores =
      match?.home_score !== null &&
      match?.home_score !== undefined &&
      match?.away_score !== null &&
      match?.away_score !== undefined;

    const statusCode = getMatchStatusCode(match);
    const status = getMatchStatusLabel(match);
    const period = statusCode === 'LIVE' ? getMatchPeriodLabel(match) : null;
    const matchDate = getMatchDate(match);

    const homeName = formatPlaceholder(match.home_team);
    const awayName = formatPlaceholder(match.away_team);

    const homePenalty =
      match?.home_penalty_score ?? match?.home_penalties;

    const awayPenalty =
      match?.away_penalty_score ?? match?.away_penalties;

    const hasPenalties =
      homePenalty !== null &&
      homePenalty !== undefined &&
      awayPenalty !== null &&
      awayPenalty !== undefined;

    const originalHome = match?.official_home_score ?? match?.original_home_score;
    const originalAway = match?.official_away_score ?? match?.original_away_score;

    const hasOriginalScore =
      originalHome !== null &&
      originalHome !== undefined &&
      originalAway !== null &&
      originalAway !== undefined;

    const flash = Boolean(flashMap[match.id]);
    const awardedName = getAwardedName(match);

    return (
      <article className="results-match-card" key={match.id}>
        <div className="results-match-meta">
          <div className="results-match-meta-left">
            {match?.matchday !== null &&
              match?.matchday !== undefined && (
                <span>Matchday {match.matchday}</span>
              )}

            {match?.match_number && (
              <span>Match {match.match_number}</span>
            )}
          </div>

          <div className="results-match-meta-right">
            {statusCode === 'LIVE' && (
              <span className="results-live-indicator">
                <span className="results-live-dot" />
                LIVE
              </span>
            )}

            {period && <span className="results-period">{period}</span>}

            <span
              className={`results-status ${statusCode ? statusCode.toLowerCase() : ''
                } ${statusCode === 'LIVE'
                  ? 'live'
                  : statusCode === 'FINISHED'
                    ? 'completed'
                    : statusCode === 'AWARDED'
                      ? 'awarded'
                      : statusCode === 'VOID'
                        ? 'void'
                        : ''
                }`}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="results-match-body">
          <div className="results-team home" title={homeName}>
            {homeName}
          </div>

          <div className="results-score-area">
            {hasScores ? (
              <div className={`results-score ${flash ? 'results-flash' : ''}`}>
                <span>{match.home_score}</span>
                <span className="results-score-separator">:</span>
                <span>{match.away_score}</span>
              </div>
            ) : (
              <div className="results-pending">VS</div>
            )}

            {hasPenalties && (
              <div className="results-penalties">
                Penalties: {homePenalty} - {awayPenalty}
              </div>
            )}

            {hasOriginalScore && isMatchAwarded(match) && (
              <div className="results-original-score">
                Original score: {originalHome} - {originalAway}
              </div>
            )}
          </div>

          <div className="results-team away" title={awayName}>
            {awayName}
          </div>
        </div>

        {isMatchAwarded(match) && (
          <div className="results-awarded-info">
            <strong>Match awarded.</strong>
            {(match?.award_reason || match?.awarded_reason) &&
              ` ${match.award_reason || match.awarded_reason}`}
            {awardedName && ` Awarded to: ${awardedName}.`}
          </div>
        )}

        {isMatchVoid(match) && (
          <div className="results-awarded-info">
            This fixture has been declared void.
            {(match?.void_reason || match?.notes) &&
              ` ${match.void_reason || match.notes}`}
          </div>
        )}

        <div className="results-match-footer">
          <span>
            {matchDate
              ? formatMatchSchedule(match)
              : 'Schedule pending'}
          </span>

          <span className="results-match-venue">
            {match?.venue || match?.location || ''}
          </span>
        </div>
      </article>
    );
  };

  const selectedSeasonName =
    seasons.find(
      (season) =>
        String(getSeasonId(season)) === String(selectedSeason)
    )?.name || '';

  return (
    <div className="results-page">
      <style>{styles}</style>

      <main className="results-container">
        <header className="results-heading">
          <div className="results-eyebrow">
            Competition Overview
          </div>

          <h1 className="results-title">
            Match Results
          </h1>

          <p className="results-subtitle">
            Live scores, completed fixtures and match updates.
          </p>
        </header>

        <section
          className="results-filter-panel"
          aria-label="Results filters"
        >
          <div className="results-filter">
            <label htmlFor="results-season">Season</label>

            <select
              id="results-season"
              value={selectedSeason}
              onChange={(event) => setSelectedSeason(event.target.value)}
              disabled={!seasons.length}
            >
              {!seasons.length && (
                <option value="">No season available</option>
              )}

              {seasons.map((season, index) => {
                const seasonId = getSeasonId(season);

                return (
                  <option
                    key={seasonId ?? index}
                    value={seasonId ?? ''}
                  >
                    {season.name || season.title || `Season ${index + 1}`}
                  </option>
                );
              })}
            </select>
          </div>
        </section>

        {error && (
          <div className="results-error" role="alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="results-loading" role="status">
            <span className="results-spinner" />
            <span>Loading match results...</span>
          </div>
        )}

        {!loading && (
          <>
            <div className="results-section-top">
              <div>
                <h2 className="results-section-title">
                  {selectedSeasonName || 'Competition Fixtures'}
                </h2>

                <p className="results-section-caption">
                  Match scores, fixtures and competition progress.
                </p>
              </div>

              <span className="results-count">
                {filteredMatches.length} MATCH
                {filteredMatches.length === 1 ? '' : 'ES'}
              </span>
            </div>

            {bracketMatches.length > 0 && (
              <section aria-label="Knockout results">
                <div className="results-section-top">
                  <div>
                    <h2 className="results-section-title">
                      Knockout Overview
                    </h2>

                    <p className="results-section-caption">
                      Semi-finals and final-stage fixtures.
                    </p>
                  </div>
                </div>

                <div className="results-bracket">
                  {bracketMatches.map((item) =>
                    renderBracket(item.match, item.label)
                  )}
                </div>
              </section>
            )}

            {filteredMatches.length === 0 ? (
              <div className="results-state">
                <div className="results-state-icon" aria-hidden="true">
                  —
                </div>

                <h3>No match results available</h3>

                <p>
                  There are currently no fixtures or results to display
                  for this season.
                </p>
              </div>
            ) : (
              <div>
                {groupedMatches.map(([stage, stageMatches]) => (
                  <section className="results-stage" key={stage}>
                    <div className="results-stage-heading">
                      <h3>{stage}</h3>

                      <span className="results-stage-count">
                        {stageMatches.length} MATCH
                        {stageMatches.length === 1 ? '' : 'ES'}
                      </span>
                    </div>

                    <div className="results-match-list">
                      {stageMatches.map(renderMatch)}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Results;
