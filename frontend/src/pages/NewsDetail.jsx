import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ShareBar from '../components/ShareBar';
import { api } from '../api/api';

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

    if (loading) return <div style={{ padding: 40 }}>Loading…</div>;
    if (error) return <div style={{ padding: 40, color: '#b91c1c' }}>Error: {error}</div>;
    if (!item) return <div style={{ padding: 40 }}>Not found</div>;

    const imgSrc = item.image_url && item.image_url.length ? item.image_url : '/favicon.ico';

    return (
        <div style={{ padding: '40px 20px', maxWidth: 1100, margin: '0 auto' }}>
            <button onClick={() => nav(-1)} style={{ marginBottom: 16, background: 'transparent', border: 'none', color: '#1e3c72', cursor: 'pointer' }}>← Back</button>

            <article style={{ background: '#fbfdff', padding: 28, borderRadius: 20, border: '1px solid rgba(15,23,42,0.04)', boxShadow: '0 8px 30px rgba(2,6,23,0.04)' }}>
                <header>
                    <style>{`
                        .news-header { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
                        @media(min-width: 720px) { .news-header { flex-direction: row; justify-content: space-between; align-items: flex-start; } }
                        .news-meta { color: #516272; font-size: 14px; }
                        .news-subtitle { color: #667085; font-size: 15px; margin-bottom: 0; }
                        .news-title { color: #0b1220; margin: 0 0 6px; font-size: 28px; line-height: 1.12; font-weight: 700; }
                    `}</style>

                    <div style={{ borderRadius: 18, padding: 16, background: '#ffffff', border: '1px solid rgba(15,23,42,0.03)', boxShadow: '0 6px 22px rgba(2,6,23,0.04)' }}>
                        <div className="news-header" style={{ alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h1 className="news-title">{item.title}</h1>
                                {item.subtitle && <div className="news-subtitle">{item.subtitle}</div>}
                                <div className="news-meta">{item.author || 'Unknown'} • {formatDate(item.published_at)}</div>
                            </div>

                            <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center' }}>
                                <div style={{ background: '#f1f5f9', padding: '6px 8px', borderRadius: 12, border: '1px solid rgba(2,6,23,0.04)' }}>
                                    <ShareBar url={window.location.href} title={item.title} />
                                </div>
                            </div>
                        </div>
                        <div style={{ height: 1, background: 'rgba(15,23,42,0.04)', marginTop: 16, borderRadius: 1 }} />
                    </div>
                </header>

                {/* Responsive layout: image above content on small screens, side-by-side on wide screens */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="news-grid">
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
        </div>
    );
}
