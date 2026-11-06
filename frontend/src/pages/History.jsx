import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './LeaguePolish.css';

const historicalData = [
  {
    year: '2026',
    title: 'Current Season',
    description: 'Ubakala Football League Season 2026 - 4 categories (Senior Boys, Junior Boys, Girls, Intermediate) with group stage and knockout rounds.',
    status: 'ongoing'
  },
  {
    year: '2025',
    title: 'Season 2025',
    description: 'Browse archived results across the Senior Boys, Girls, and Junior Boys competitions.',
    status: 'completed',
    hasArchive: true
  },
  {
    year: '2024',
    title: 'Season 2024 ',
    description: 'Successfully concluded the 2024 season with exciting finals across all three categories.',
    status: 'completed'
  },
  {
    year: '2023',
    title: 'Season 2023',
    description: 'Successfully concluded the 2023 season with exciting finals across all three categories.',
    status: 'completed'
  }
];

const STAGE_ORDER = [
  'Group Stage',
  'Quarter-Finals',
  'Semi-Finals',
  'Third-Place Match',
  'Final'
];

function formatMatchDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function groupByMatchday(matches) {
  const grouped = new Map();
  matches.forEach(match => {
    const key = Number.isInteger(match.matchday) ? match.matchday : null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(match);
  });

  return [...grouped.entries()].sort(([first], [second]) => {
    if (first === null) return 1;
    if (second === null) return -1;
    return first - second;
  });
}

function groupByStage(matches) {
  const grouped = new Map(STAGE_ORDER.map(stage => [stage, []]));
  matches.forEach(match => {
    if (grouped.has(match.stage)) grouped.get(match.stage).push(match);
  });
  return [...grouped.entries()].filter(([, stageMatches]) => stageMatches.length > 0);
}

function MatchCard({ match }) {
  return (
    <article className="league-page-card history-match-card">
      <div className="history-match-meta">
        <span className="history-match-stage">{match.stage}</span>
        <time dateTime={match.date}>{formatMatchDate(match.date)}</time>
        {match.venue && <span>{match.venue}</span>}
      </div>
      <div className="history-match-scoreline">
        <span className="history-match-team">{match.home_team}</span>
        <strong className="history-match-score">
          {match.home_score} <span>–</span> {match.away_score}
        </strong>
        <span className="history-match-team history-match-team--away">{match.away_team}</span>
      </div>
      {match.penalty_home !== null && match.penalty_away !== null && (
        <div className="history-match-penalties">
          Penalties: {match.penalty_home}–{match.penalty_away}
        </div>
      )}
      {(match.awarded || match.void) && (
        <div className="history-match-flags">
          {match.awarded && <span>Awarded result</span>}
          {match.void && <span>Voided match</span>}
        </div>
      )}
    </article>
  );
}

function SeasonArchive({ archive, categoryId, onCategoryChange }) {
  const category = archive.categories.find(item => item.id === categoryId) || archive.categories[0];
  if (!category) return <p className="league-page-empty">No archived categories are available.</p>;

  const stageGroups = groupByStage(category.matches);

  return (
    <section className="history-archive" aria-label="2025 season results">
      <div className="history-archive-summary">
        <div>
          <span className="history-archive-kicker">Archived season</span>
          <h2>2025 Competition Results</h2>
        </div>
        <span className="history-match-count">{archive.total_matches} matches</span>
      </div>

      <div className="history-category-tabs" role="group" aria-label="Competition category">
        {archive.categories.map(item => (
          <button
            type="button"
            key={item.id}
            className={`history-category-tab${item.id === category.id ? ' is-active' : ''}`}
            aria-pressed={item.id === category.id}
            onClick={() => onCategoryChange(item.id)}
          >
            {item.name}
            <span>{item.matches.length}</span>
          </button>
        ))}
      </div>

      <div className="history-category-heading">
        <h3>{category.name}</h3>
        <span>{category.matches.length} results</span>
      </div>

      <p className="history-archive-note">{archive.note}</p>

      {stageGroups.map(([stage, matches]) => (
        <section className="history-matchday" key={stage}>
          <h4>{stage}</h4>
          {groupByMatchday(matches).map(([matchday, stageMatchdayMatches]) => (
            <div className="history-stage-matchday" key={matchday === null ? 'unassigned' : matchday}>
              <h5>{matchday === null ? 'Matchday not recorded' : `Matchday ${matchday}`}</h5>
              <div className="history-match-list">
                {stageMatchdayMatches.map((match, index) => (
                  <MatchCard key={`${match.date}-${match.home_team}-${match.away_team}-${index}`} match={match} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </section>
  );
}

const History = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const [archive, setArchive] = useState(null);
  const [activeCategory, setActiveCategory] = useState('senior-boys');
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const showArchive = year === '2025';

  const loadArchive = useCallback(async () => {
    setIsLoadingArchive(true);
    setArchiveError('');
    try {
      const response = await fetch('/archive/2025.json');
      if (!response.ok) {
        throw new Error(`Could not load the 2025 archive (${response.status}).`);
      }
      const data = await response.json();
      if (!Array.isArray(data.categories) || !data.categories.length) {
        throw new Error('The 2025 archive does not contain any categories.');
      }
      setArchive(data);
      setActiveCategory(data.categories[0].id);
    } catch (error) {
      setArchiveError(error.message || 'Could not load the 2025 archive.');
    } finally {
      setIsLoadingArchive(false);
    }
  }, []);

  useEffect(() => {
    if (showArchive && !archive) loadArchive();
  }, [showArchive, archive, loadArchive]);

  return (
    <div className="league-polish-page">
      <main className="league-polish-content">
        {showArchive ? (
          <>
            <header className="league-page-header history-archive-header">
              <div className="league-page-header__copy">
                <div className="league-page-eyebrow">Competition archive</div>
                <h1 className="league-page-title">2025 Season</h1>
                <p className="league-page-subtitle">
                  Browse preserved match results by competition category and recorded matchday.
                </p>
              </div>
              <button
                type="button"
                className="history-back-button"
                onClick={() => navigate('/history')}
              >
                Back to seasons
              </button>
            </header>

            {isLoadingArchive && <p className="league-page-empty" role="status">Loading 2025 archive…</p>}
            {archiveError && (
              <div className="history-archive-error" role="alert">
                <p>{archiveError}</p>
                <button type="button" onClick={loadArchive} disabled={isLoadingArchive}>Try again</button>
              </div>
            )}
            {archive && !isLoadingArchive && (
              <SeasonArchive
                archive={archive}
                categoryId={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            )}
          </>
        ) : (
          <>
            <header className="league-page-header">
              <div className="league-page-header__copy">
                <div className="league-page-eyebrow">Our competition</div>
                <h1 className="league-page-title">League History</h1>
                <p className="league-page-subtitle">A record of seasons, milestones and community football.</p>
              </div>
            </header>

            <div className="history-season-list">
              {historicalData.map(item => {
                const content = (
                  <>
                    <span className={`history-season-year${item.status === 'ongoing' ? ' is-current' : ''}`}>
                      {item.year}
                    </span>
                    <span className="history-season-copy">
                      <span className="history-season-title-row">
                        <strong>{item.title}</strong>
                        <span className={`history-season-status${item.status === 'ongoing' ? ' is-ongoing' : ''}`}>
                          {item.status === 'ongoing' ? 'Ongoing' : 'Completed'}
                        </span>
                      </span>
                      <span className="history-season-description">{item.description}</span>
                      {item.hasArchive && <span className="history-season-action">View archived results →</span>}
                    </span>
                  </>
                );

                return item.hasArchive ? (
                  <Link
                    key={item.year}
                    to="/history/2025"
                    className="league-page-card league-history-card history-season-card history-season-card--link"
                  >
                    {content}
                  </Link>
                ) : (
                  <article key={item.year} className="league-page-card league-history-card history-season-card">
                    {content}
                  </article>
                );
              })}
            </div>

            <section className="history-milestones">
              <h2>League Milestones</h2>
              <p>
                From 2023 to present, Ubakala Football League has grown into a community football competition
                with teams and supporters across the community.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default History;
