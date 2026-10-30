
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../api/api';
import './Bracket.css';
import './Results.css';
import usePolling from '../utils/usePolling';
import {
    getMatchStageLabel,
    getMatchesForStage,
    PUBLIC_CATEGORIES
} from '../utils/competition';

// Detect placeholder team tokens like WINNER MD22, LOSER, etc.
const isPlaceholder = (teamName) => {
    if (!teamName) return false;
    return /WINNER|LOSER/i.test(teamName);
};

const renderBracketTeam = (teamValue, match) => {
    const name = typeof teamValue === 'object' ? teamValue?.name : teamValue;

    if (!name) {
        return <span className="br-tbd">— TBD —</span>;
    }

    if (!isPlaceholder(name)) return name;

    const descriptor = /WINNER/i.test(name)
        ? 'Winner'
        : (/LOSER/i.test(name) ? 'Loser' : 'TBD');

    return (
        <span className="placeholder-pill">
            {descriptor} — {getMatchStageLabel(match)}
        </span>
    );
};

export default function Bracket() {
    const [matches, setMatches] = useState([]);
    const [flashMap, setFlashMap] = useState({});
    const prevMatchesRef = useRef({});
    const timeoutRef = useRef(null);
    const FLASH_DURATION = 800;

    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState(null);
    const [seasonsLoading, setSeasonsLoading] = useState(true);
    const [matchesLoading, setMatchesLoading] = useState(true);
    const [category, setCategory] = useState('senior_boys');
    const [seasonsLoadedOnce, setSeasonsLoadedOnce] = useState(false);
    const [matchesLoadedOnce, setMatchesLoadedOnce] = useState(false);

    const containerRef = useRef(null);
    const boxRefs = useRef({});
    const svgRef = useRef(null);
    const [connectors, setConnectors] = useState([]);

    // Poll seasons so the dropdown stays current.
    const fetchSeasons = useCallback(async () => {
        if (!seasonsLoadedOnce) setSeasonsLoading(true);

        try {
            const s = await api.getSeasons(category);

            setSeasons(s || []);

            if (s && s.length) {
                setSelectedSeason(prev => prev || String(s[0].id));
            } else {
                setSelectedSeason(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (!seasonsLoadedOnce) setSeasonsLoading(false);
            setSeasonsLoadedOnce(true);
        }
    }, [category, seasonsLoadedOnce]);

    usePolling(fetchSeasons, {
        minInterval: 7000,
        maxInterval: 12000,
        immediate: true
    });

    // Refresh seasons and clear matches when category changes.
    useEffect(() => {
        setSeasonsLoadedOnce(false);
        setSeasons([]);
        setSelectedSeason(null);
        setMatches([]);
        setMatchesLoadedOnce(false);

        fetchSeasons();
    }, [category, fetchSeasons]);

    const fetchMatchesForSeason = useCallback(async () => {
        if (!selectedSeason) return;

        if (!matchesLoadedOnce) setMatchesLoading(true);

        try {
            const m = await api.getMatches({ season: selectedSeason });

            // Detect score changes for the score flash animation.
            const prev = prevMatchesRef.current || {};
            const diffs = {};

            (m || []).forEach((mm) => {
                const old = prev[mm.id];
                if (!old) return;

                const changed = {};

                if (mm.home_score !== old.home_score) changed.home = true;
                if (mm.away_score !== old.away_score) changed.away = true;

                if (Object.keys(changed).length > 0) {
                    diffs[mm.id] = changed;
                }
            });

            if (Object.keys(diffs).length === 0) {
                setMatches(m || []);
            } else {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                setFlashMap(diffs);

                timeoutRef.current = setTimeout(() => {
                    setMatches(m || []);
                    setFlashMap({});
                    timeoutRef.current = null;
                }, FLASH_DURATION);
            }

            prevMatchesRef.current = (m || []).reduce((acc, mm) => {
                acc[mm.id] = mm;
                return acc;
            }, {});
        } catch (e) {
            console.error(e);
        } finally {
            if (!matchesLoadedOnce) setMatchesLoading(false);
            setMatchesLoadedOnce(true);
        }
    }, [selectedSeason, matchesLoadedOnce]);

    usePolling(fetchMatchesForSeason, {
        minInterval: 5000,
        maxInterval: 10000,
        immediate: true
    });

    // Fetch matches immediately when the selected season changes.
    useEffect(() => {
        if (!selectedSeason) return;

        setMatchesLoadedOnce(false);
        setMatches([]);
        fetchMatchesForSeason();
    }, [selectedSeason, fetchMatchesForSeason]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Build bracket connectors after rendering and on resize.
    useEffect(() => {
        const build = () => {
            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const pos = {};

            Object.entries(boxRefs.current).forEach(([id, el]) => {
                if (!el) return;

                const r = el.getBoundingClientRect();

                pos[id] = {
                    x: r.left - rect.left + r.width / 2,
                    y: r.top - rect.top + r.height / 2,
                };
            });

            const createPath = (from, to) => {
                const dx = Math.max(40, (to.x - from.x) / 2);

                return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y} ${to.x - dx} ${to.y} ${to.x} ${to.y}`;
            };

            const qf = getMatchesForStage(matches, 'QF');
            const sf = getMatchesForStage(matches, 'SF');
            const third = getMatchesForStage(matches, 'THIRD_PLACE');
            const fin = getMatchesForStage(matches, 'FINAL');

            const conns = [];

            // Quarterfinals to semifinals.
            if (qf.length >= 4 && sf.length >= 2) {
                conns.push({ from: qf[0]?.id, to: sf[0]?.id });
                conns.push({ from: qf[1]?.id, to: sf[0]?.id });
                conns.push({ from: qf[2]?.id, to: sf[1]?.id });
                conns.push({ from: qf[3]?.id, to: sf[1]?.id });
            } else {
                for (let i = 0; i < sf.length; i++) {
                    const sources = qf.slice(i * 2, i * 2 + 2);
                    sources.forEach((s) => {
                        conns.push({ from: s?.id, to: sf[i]?.id });
                    });
                }
            }

            // Semifinals to final.
            if (sf.length >= 2 && fin.length >= 1) {
                conns.push({ from: sf[0]?.id, to: fin[0]?.id });
                conns.push({ from: sf[1]?.id, to: fin[0]?.id });
            } else {
                sf.forEach(s => {
                    conns.push({ from: s?.id, to: fin[0]?.id });
                });
            }

            // Semifinals to third-place match.
            if (third.length >= 1 && sf.length >= 2) {
                conns.push({ from: sf[0]?.id, to: third[0]?.id });
                conns.push({ from: sf[1]?.id, to: third[0]?.id });
            }

            const finalConns = conns.map((c, idx) => {
                const fromPos = pos[c.from];
                const toPos = pos[c.to];

                const path = (fromPos && toPos)
                    ? createPath(fromPos, toPos)
                    : '';

                const src = matches.find(
                    m => String(m.id) === String(c.from)
                );

                const revealed = src &&
                    src.home_score !== null &&
                    src.away_score !== null &&
                    src.home_score !== src.away_score;

                return {
                    id: `conn-${idx}`,
                    from: c.from,
                    to: c.to,
                    d: path,
                    revealed
                };
            }).filter(c => c.d);

            setConnectors(finalConns);
        };

        const t = setTimeout(build, 80);

        window.addEventListener('resize', build);

        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', build);
        };
    }, [matches]);

    // Set SVG stroke lengths for the connector animation.
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        connectors.forEach((c) => {
            const path = svg.querySelector(`#${c.id}`);
            if (!path) return;

            try {
                const len = path.getTotalLength();

                path.style.strokeDasharray = len;
                path.style.strokeDashoffset = c.revealed ? '0' : String(len);
                path.style.transition = 'stroke-dashoffset 900ms ease';
            } catch (e) {
                // Ignore SVG measurement errors.
            }
        });
    }, [connectors]);

    // Hide connectors after they finish drawing.
    const hideTimeoutsRef = useRef({});

    useEffect(() => {
        const svgEl = svgRef.current;
        if (!svgEl) return;

        connectors.forEach((c) => {
            if (!c.revealed) return;
            if (hideTimeoutsRef.current[c.id]) return;

            const t = setTimeout(() => {
                const path = svgEl.querySelector(`#${c.id}`);

                if (path) {
                    try {
                        const len = path.getTotalLength();

                        path.style.transition =
                            'stroke-dashoffset 650ms ease, opacity 650ms ease';

                        path.style.strokeDashoffset = String(len);
                        path.style.opacity = '0';
                    } catch (e) {
                        // Ignore SVG measurement errors.
                    }
                }

                setTimeout(() => {
                    setConnectors(prev =>
                        prev.filter(x => x.id !== c.id)
                    );

                    delete hideTimeoutsRef.current[c.id];
                }, 700);
            }, 1200);

            hideTimeoutsRef.current[c.id] = t;
        });

        return () => {
            Object.values(hideTimeoutsRef.current).forEach(
                id => clearTimeout(id)
            );

            hideTimeoutsRef.current = {};
        };
    }, [connectors]);

    const stageMatches = stage => getMatchesForStage(matches, stage);

    const renderBox = (m) => (
        <div
            key={m.id}
            className="br-match"
            ref={(el) => {
                boxRefs.current[m.id] = el;
            }}
        >
            <div className="br-team br-home">
                <span className="br-team-name">
                    {renderBracketTeam(m.home_team, m)}
                </span>

                <span className={`score ${flashMap[m.id]?.home ? 'score-flash' : ''}`}>
                    {m.home_score ?? '-'}
                </span>
            </div>

            <div className="br-match-divider">
                <span>VS</span>
            </div>

            <div className="br-team br-away">
                <span className="br-team-name">
                    {renderBracketTeam(m.away_team, m)}
                </span>

                <span className={`score ${flashMap[m.id]?.away ? 'score-flash' : ''}`}>
                    {m.away_score ?? '-'}
                </span>
            </div>
        </div>
    );

    const qf = stageMatches('QF');
    const sf = stageMatches('SF');
    const third = stageMatches('THIRD_PLACE');
    const fin = stageMatches('FINAL');
    const special = stageMatches('SPECIAL');

    return (
        <div className="bracket-root">
            <div className="bracket-header">
                <div className="bracket-heading">
                    <span className="bracket-eyebrow">
                        Competition Overview
                    </span>

                    <h2>Tournament Bracket</h2>

                    <p>
                        Follow the knockout stages and match progression
                        throughout the competition.
                    </p>
                </div>

                <div className="bracket-toolbar">
                    <div className="bracket-control">
                        <label htmlFor="bracket-category">
                            Category
                        </label>

                        <select
                            id="bracket-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {PUBLIC_CATEGORIES.map(item => (
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bracket-control">
                        <label htmlFor="bracket-season">
                            Season
                        </label>

                        {seasonsLoading ? (
                            <div className="bracket-select-loading">
                                Loading seasons
                                <span className="loading-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </span>
                            </div>
                        ) : (
                            <select
                                id="bracket-season"
                                value={selectedSeason || ''}
                                onChange={(e) => setSelectedSeason(e.target.value)}
                                disabled={!seasons.length}
                            >
                                {seasons.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {(!seasons || seasons.length === 0) ? (
                <div className="bracket-empty">
                    <div className="bracket-empty-icon">—</div>
                    <h3>No season available</h3>
                    <p>
                        No seasons were found for the selected category.
                        Select another category or add a season in the admin panel.
                    </p>
                </div>
            ) : matchesLoading ? (
                <div className="bracket-loading">
                    <div className="bracket-loader"></div>
                    <h3>Loading tournament bracket</h3>
                    <p>Please wait while the match information is retrieved.</p>
                </div>
            ) : (
                <div className="bracket-canvas" ref={containerRef}>
                    <div className="bracket-column col-qf">
                        <div className="bracket-stage-heading">
                            <span className="bracket-stage-number">01</span>
                            <h4>Quarterfinals</h4>
                        </div>

                        {qf.length ? (
                            qf.map(renderBox)
                        ) : (
                            <div className="bracket-stage-empty">
                                No quarterfinal matches
                            </div>
                        )}
                    </div>

                    <div className="bracket-column col-sf">
                        <div className="bracket-stage-heading">
                            <span className="bracket-stage-number">02</span>
                            <h4>Semifinals</h4>
                        </div>

                        {sf.length ? (
                            sf.map(renderBox)
                        ) : (
                            <div className="bracket-stage-empty">
                                No semifinal matches
                            </div>
                        )}

                        {third.length > 0 && (
                            <>
                                <div className="bracket-stage-heading bracket-secondary-heading">
                                    <span className="bracket-stage-number">03</span>
                                    <h4>Third Place</h4>
                                </div>

                                {third.map(renderBox)}
                            </>
                        )}
                    </div>

                    <div className="bracket-column col-final">
                        <div className="bracket-stage-heading">
                            <span className="bracket-stage-number">04</span>
                            <h4>Final</h4>
                        </div>

                        {fin.length ? (
                            fin.map(renderBox)
                        ) : (
                            <div className="bracket-stage-empty">
                                Final match pending
                            </div>
                        )}

                        {special.length > 0 && (
                            <>
                                <div className="bracket-stage-heading bracket-secondary-heading">
                                    <span className="bracket-stage-number">05</span>
                                    <h4>Special</h4>
                                </div>

                                {special.map(renderBox)}
                            </>
                        )}
                    </div>

                    <svg
                        className="bracket-svg"
                        ref={svgRef}
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {connectors.map(c => (
                            <path
                                key={c.id}
                                id={c.id}
                                d={c.d}
                                className={`connector ${c.revealed ? 'revealed' : ''}`}
                                stroke="#d6a83d"
                                strokeWidth={3}
                                fill="none"
                                strokeLinecap="round"
                            />
                        ))}
                    </svg>
                </div>
            )}

            <div className="bracket-footer-note">
                <span className="bracket-live-indicator"></span>
                Match information refreshes automatically. Animated connectors
                indicate progression when a match result is decided.
            </div>
        </div>
    );
}
