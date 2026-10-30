import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ShareBar from '../components/ShareBar';
import { api } from '../api/api';
import './LeaguePolish.css';

function formatDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (e) {
        return iso;
    }
}

export default function NewsDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        api.getNewsById(id).then((data) => {
            if (!mounted) return;
            setItem(data);
            setLoading(false);
        }).catch((err) => {
            if (!mounted) return;
            setError(err.message || 'Failed to load news');
            setLoading(false);
        });
        return () => { mounted = false; };
    }, [id]);

    if (loading) return <div className="league-polish-page"><main className="league-polish-content"><div className="league-page-empty">Loading news…</div></main></div>;
    if (error) return <div className="league-polish-page"><main className="league-polish-content"><div className="league-page-status league-page-status--error">Error: {error}</div></main></div>;
    if (!item) return <div className="league-polish-page"><main className="league-polish-content"><div className="league-page-empty">News article not found.</div></main></div>;

    const imgSrc = item.image_url && item.image_url.length ? item.image_url : '/favicon.ico';

    return (
        <div className="league-polish-page">
          <main className="league-polish-content">
            <button onClick={() => nav(-1)} className="league-button-secondary" style={{ marginBottom: 16 }}>← Back to news</button>

            <article className="league-page-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <header>
                    <style>{`
                        .news-header { display: flex; flex-direction: column; gap: 16px; }
                        @media(min-width: 720px) { .news-header { flex-direction: row; justify-content: space-between; align-items: center; } }
                        .news-meta { color: rgba(235, 242, 251, .78); font-size: 13px; margin-top: 12px; }
                        .news-subtitle { color: rgba(235, 242, 251, .86); font-size: 15px; margin-top: 8px; }
                        .news-title { color: #fff; margin: 0; font-size: clamp(25px, 3.2vw, 35px); line-height: 1.18; font-weight: 800; letter-spacing: -.5px; }
                    `}</style>

                    <div className="league-page-header" style={{ margin: 0, border: 0, borderRadius: 0 }}>
                        <div className="news-header" style={{ alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="league-page-eyebrow">From the league</div>
                                <h1 className="news-title">{item.title}</h1>
                                {item.subtitle && <div className="news-subtitle">{item.subtitle}</div>}
                                <div className="news-meta">
                                    {item.author || 'Unknown'}
                                    {item.created_at ? ` • Posted ${formatDate(item.created_at)}` : ''}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ background: 'rgba(255,255,255,.1)', padding: '6px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)' }}>
                                    <ShareBar url={window.location.href} title={item.title} />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Responsive layout: image above content on small screens, side-by-side on wide screens */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, padding: '24px clamp(18px, 4vw, 36px) 32px' }} className="news-grid">
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <img
                            src={imgSrc}
                            alt={item.title}
                            style={{
                                width: '100%',
                                maxWidth: 760,
                                height: 'auto',
                                maxHeight: 360,
                                objectFit: 'cover',
                                borderRadius: 16,
                                boxShadow: '0 6px 20px rgba(2,6,23,0.08)'
                            }}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/favicon.ico'; }}
                        />
                    </div>

                    <div style={{ color: '#052033', fontSize: 18, lineHeight: 1.8 }}>
                        <style>{`
                                        .news-content { overflow-wrap: break-word; word-break: break-word; white-space: pre-wrap; }
                                        .news-content img, .news-content video, .news-content iframe { max-width: 100%; height: auto; display: block; }
                                        .news-content p { margin-bottom: 1em; }
                                    `}</style>
                        <div className="news-content" style={{ maxWidth: '66ch', boxSizing: 'border-box', margin: '0 auto', color: '#0b1220' }} dangerouslySetInnerHTML={{ __html: item.content || '' }} />
                    </div>
                </div>
            </article>
          </main>
        </div>
    );
}
