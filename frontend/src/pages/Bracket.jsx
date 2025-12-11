import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api/api';
import './Bracket.css';

// Helper: group matches by matchday
const getMatchesByDay = (matches, md) => matches.filter(m => Number(m.matchday) === md || Number(m.matchday) === Number(md));

// Helper: detect placeholder team tokens like WINNER MD22, LOSER etc.
const isPlaceholder = (teamName) => {
    if (!teamName) return false;
    return /WINNER|LOSER/i.test(teamName);
};

export default function Bracket() {
    const [matches, setMatches] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState(null);
    const [category, setCategory] = useState('senior_boys');
    const containerRef = useRef(null);
    const boxRefs = useRef({});
    const svgRef = useRef(null);
    const [connectors, setConnectors] = useState([]);

    useEffect(() => {
        api.getSeasons(category).then((s) => { setSeasons(s); if (s && s.length) setSelectedSeason(s[0].id); else setSelectedSeason(null); }).catch(console.error);
    }, [category]);

    useEffect(() => {
        if (!selectedSeason) return;
        api.getMatches({ season: selectedSeason }).then((m) => setMatches(m || [])).catch(console.error);
    }, [selectedSeason]);

    // Build connectors once matches are loaded and on resize
    useEffect(() => {
        const build = () => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();

            // collect boxes positions
            const pos = {};
            Object.entries(boxRefs.current).forEach(([id, el]) => {
                if (!el) return;
                const r = el.getBoundingClientRect();
                pos[id] = {
                    x: r.left - rect.left + r.width / 2,
                    y: r.top - rect.top + r.height / 2,
                };
            });

            // helper to create path between centers (bezier)
            const createPath = (from, to) => {
                const dx = Math.max(40, (to.x - from.x) / 2);
                return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y} ${to.x - dx} ${to.y} ${to.x} ${to.y}`;
            };

            // Determine logical match groups
            const qf = [...getMatchesByDay(matches, 22), ...getMatchesByDay(matches, 23), ...getMatchesByDay(matches, 24), ...getMatchesByDay(matches, 25)];
            const sf = [...getMatchesByDay(matches, 26), ...getMatchesByDay(matches, 27)];
            const third = [...getMatchesByDay(matches, 28)];
            const fin = [...getMatchesByDay(matches, 29)];

            const conns = [];

            // connect QF -> SF: [0,1] -> SF0, [2,3] -> SF1
            if (qf.length >= 4 && sf.length >= 2) {
                conns.push({ from: qf[0]?.id, to: sf[0]?.id });
                conns.push({ from: qf[1]?.id, to: sf[0]?.id });
                conns.push({ from: qf[2]?.id, to: sf[1]?.id });
                conns.push({ from: qf[3]?.id, to: sf[1]?.id });
            } else {
                // fallback: connect in-order
                for (let i = 0; i < sf.length; i++) {
                    const sources = qf.slice(i * 2, i * 2 + 2);
                    sources.forEach((s) => conns.push({ from: s?.id, to: sf[i]?.id }));
                }
            }

            // connect SF -> Final
            if (sf.length >= 2 && fin.length >= 1) {
                conns.push({ from: sf[0]?.id, to: fin[0]?.id });
                conns.push({ from: sf[1]?.id, to: fin[0]?.id });
            } else {
                sf.forEach(s => conns.push({ from: s?.id, to: fin[0]?.id }));
            }

            // connect SF -> Third place (losers) if present
            if (third.length >= 1 && sf.length >= 2) {
                conns.push({ from: sf[0]?.id, to: third[0]?.id });
                conns.push({ from: sf[1]?.id, to: third[0]?.id });
            }

            // build path strings if positions are available
            const finalConns = conns.map((c, idx) => {
                const fromPos = pos[c.from];
                const toPos = pos[c.to];
                const path = (fromPos && toPos) ? createPath(fromPos, toPos) : '';
                // reveal if source has a decisive winner
                const src = matches.find(m => String(m.id) === String(c.from));
                const revealed = src && src.home_score !== null && src.away_score !== null && src.home_score !== src.away_score;
                return { id: `conn-${idx}`, from: c.from, to: c.to, d: path, revealed };
            }).filter(c => c.d);

            setConnectors(finalConns);
        };

        // small timeout to allow DOM to render
        const t = setTimeout(build, 80);
        window.addEventListener('resize', build);
        return () => { clearTimeout(t); window.removeEventListener('resize', build); };
    }, [matches]);

    // After connectors render, set stroke lengths for animation
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
                // ignore
            }
        });
    }, [connectors]);

    // Hide connectors after they finish drawing (so they point the path then disappear)
    const hideTimeoutsRef = useRef({});
    useEffect(() => {
        const svgEl = svgRef.current;
        if (!svgEl) return;

        connectors.forEach((c) => {
            if (!c.revealed) return;
            // if already scheduled, skip
            if (hideTimeoutsRef.current[c.id]) return;

            // schedule hide after 1.2s (allow draw animation to finish)
            const t = setTimeout(() => {
                const path = svgEl.querySelector(`#${c.id}`);
                if (path) {
                    try {
                        const len = path.getTotalLength();
                        // animate stroke back and fade out
                        path.style.transition = 'stroke-dashoffset 650ms ease, opacity 650ms ease';
                        path.style.strokeDashoffset = String(len);
                        path.style.opacity = '0';
                    } catch (e) {
                        // ignore
                    }
                }
                // remove connector from state after fade completes
                setTimeout(() => {
                    setConnectors((prev) => prev.filter(x => x.id !== c.id));
                    delete hideTimeoutsRef.current[c.id];
                }, 700);
            }, 1200);

            hideTimeoutsRef.current[c.id] = t;
        });

        return () => {
            // clear any scheduled timeouts on cleanup
            Object.values(hideTimeoutsRef.current).forEach((id) => clearTimeout(id));
            hideTimeoutsRef.current = {};
        };
    }, [connectors]);

    const stageMatches = (mds) => {
        const arr = [];
        if (Array.isArray(mds)) {
            mds.forEach(md => arr.push(...getMatchesByDay(matches, md)));
        } else arr.push(...getMatchesByDay(matches, mds));
        return arr;
    };

    const renderBox = (m) => (
        <div key={m.id} className="br-match" ref={(el) => { boxRefs.current[m.id] = el; }}>
            <div className="br-team br-home">
                {(() => {
                    const name = typeof m.home_team === 'object' ? m.home_team.name : m.home_team;
                    if (isPlaceholder(name)) {
                        // build friendly label
                        const digits = (name.match(/(\d{1,3})/) || [null])[0];
                        const num = digits ? parseInt(digits, 10) : null;
                        const qfMap = { 22: 'A', 23: 'B', 24: 'C', 25: 'D' };
                        const sfMap = { 26: 'A', 27: 'B' };
                        let stageLabel = null; let slot = '';
                        if (num && qfMap[num]) { stageLabel = 'Quarterfinal'; slot = ` ${qfMap[num]}`; }
                        else if (num && sfMap[num]) { stageLabel = 'Semifinal'; slot = ` ${sfMap[num]}`; }
                        else if (num === 28) stageLabel = 'Third Place';
                        else if (num === 29) stageLabel = 'Final';
                        const descriptor = /WINNER/i.test(name) ? 'Winner' : (/LOSER/i.test(name) ? 'Loser' : 'TBD');
                        return (<span className="placeholder-pill">{descriptor} — {stageLabel ? `${stageLabel}${slot}` : 'Knockout'}</span>);
                    }
                    return name;
                })()} <span className="score">{m.home_score ?? '-'}</span>
            </div>
            <div className="br-team br-away">
                {(() => {
                    const name = typeof m.away_team === 'object' ? m.away_team.name : m.away_team;
                    if (isPlaceholder(name)) {
                        const digits = (name.match(/(\d{1,3})/) || [null])[0];
                        const num = digits ? parseInt(digits, 10) : null;
                        const qfMap = { 22: 'A', 23: 'B', 24: 'C', 25: 'D' };
                        const sfMap = { 26: 'A', 27: 'B' };
                        let stageLabel = null; let slot = '';
                        if (num && qfMap[num]) { stageLabel = 'Quarterfinal'; slot = ` ${qfMap[num]}`; }
                        else if (num && sfMap[num]) { stageLabel = 'Semifinal'; slot = ` ${sfMap[num]}`; }
                        else if (num === 28) stageLabel = 'Third Place';
                        else if (num === 29) stageLabel = 'Final';
                        const descriptor = /WINNER/i.test(name) ? 'Winner' : (/LOSER/i.test(name) ? 'Loser' : 'TBD');
                        return (<span className="placeholder-pill">{descriptor} — {stageLabel ? `${stageLabel}${slot}` : 'Knockout'}</span>);
                    }
                    return name;
                })()} <span className="score">{m.away_score ?? '-'}</span>
            </div>
        </div>
    );

    const qf = stageMatches([22, 23, 24, 25]);
    const sf = stageMatches([26, 27]);
    const third = stageMatches(28);
    const fin = stageMatches(29);

    return (
        <div className="bracket-root" style={{ padding: 24 }}>
            <div className="bracket-header">
                <h2>🔗 Tournament Bracket</h2>
                <div>
                    <label style={{ fontWeight: 700, color: '#1e3c72', marginRight: 10 }}>Category:</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, marginRight: 12 }}>
                        <option value="senior_boys">Senior Boys</option>
                        <option value="girls">Girls</option>
                        <option value="junior_boys">Junior Boys</option>
                    </select>

                    <label style={{ fontWeight: 700, color: '#1e3c72', marginRight: 10 }}>Season:</label>
                    <select value={selectedSeason || ''} onChange={(e) => setSelectedSeason(parseInt(e.target.value))} style={{ padding: '6px 10px', borderRadius: 8 }}>
                        {seasons.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                </div>
            </div>

            <div className="bracket-canvas" ref={containerRef}>
                <div className="col col-qf">
                    <h4>Quarterfinals</h4>
                    {qf.map(renderBox)}
                </div>

                <div className="col col-sf">
                    <h4>Semifinals</h4>
                    {sf.map(renderBox)}
                    <h4 style={{ marginTop: 18 }}>Third Place</h4>
                    {third.map(renderBox)}
                </div>

                <div className="col col-final">
                    <h4>Final</h4>
                    {fin.map(renderBox)}
                </div>

                <svg className="bracket-svg" ref={svgRef} xmlns="http://www.w3.org/2000/svg">
                    {connectors.map(c => (
                        <path key={c.id} id={c.id} d={c.d} className={`connector ${c.revealed ? 'revealed' : ''}`} stroke="#3b82f6" strokeWidth={3} fill="none" strokeLinecap="round" />
                    ))}
                </svg>
            </div>

            <p style={{ marginTop: 12, color: '#21e90bff',  }}>Animated connectors draw in when a match result is decided.</p>
        </div>
    );
}
