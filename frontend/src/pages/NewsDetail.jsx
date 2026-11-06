import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShareBar from '../components/ShareBar';
import { api } from '../api/api';
import { getNewsViewerId } from '../utils/newsViewer';
import './LeaguePolish.css';

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function NewsDetail() {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewError, setViewError] = useState('');

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
        setViewError('');
        api.getNewsById(id).then((data) => {
            if (!mounted) return;
            setItem(data);
            setLoading(false);
            if (data) {
                Promise.resolve().then(() => api.recordNewsView(id, getNewsViewerId())).then((result) => {
                    if (mounted) {
                        setItem(current => current ? { ...current, views: result.views } : current);
                    }
                }).catch((viewRequestError) => {
                    if (mounted) {
                        setViewError(viewRequestError.message || 'Unable to update article views.');
                    }
                });
            }
        }).catch((err) => {
            if (!mounted) return;
            setError(err.message || 'Failed to load news');
            setLoading(false);
        });
        return () => { mounted = false; };
    }, [id]);

    if (loading) {
        return (
            <div className="league-polish-page">
                <main className="league-polish-content news-detail-page">
                    <div className="league-page-empty" role="status">Loading article…</div>
                </main>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="league-polish-page">
                <main className="league-polish-content news-detail-page">
                    {error ? (
                        <div className="league-page-status league-page-status--error" role="alert">
                            Error: {error}
                        </div>
                    ) : (
                        <div className="league-page-empty">News article not found.</div>
                    )}
                    <Link to="/news" className="news-back-link">← Back to news</Link>
                </main>
            </div>
        );
    }

    const date = formatDate(item.published_at || item.created_at);
    const paragraphs = String(item.content || '').split(/\r?\n(?:[ \t]*\r?\n)+/);

    return (
        <div className="league-polish-page">
            <main className="league-polish-content news-detail-page">
                <Link to="/news" className="news-back-link">← All news</Link>

                <article className="news-article">
                    <header className="news-article-header">
                        <div className="league-page-eyebrow">From the league</div>
                        <h1>{item.title || 'Untitled article'}</h1>
                        {item.subtitle && <p className="news-article-subtitle">{item.subtitle}</p>}
                        <div className="news-article-byline">
                            <span>{item.author || 'Ubakala Football League'}</span>
                            {date && <time dateTime={item.published_at || item.created_at}>{date}</time>}
                            <span className="news-article-views" aria-label={`${item.views || 0} views`}>
                                {item.views || 0} views
                            </span>
                        </div>
                        {viewError && (
                            <p className="news-view-error" role="status">{viewError}</p>
                        )}
                        <div className="news-article-share">
                            <ShareBar url={window.location.href} title={item.title} />
                        </div>
                    </header>

                    {item.image_url && (
                        <figure className="news-article-figure">
                            <img
                                src={item.image_url}
                                alt={item.title || ''}
                                onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = '/favicon.ico';
                                }}
                            />
                        </figure>
                    )}

                    <div className="news-article-content">
                        <div
                            className="news-article-body"
                        >
                            {paragraphs.map((paragraph, index) => (
                                <p key={index}>{paragraph}</p>
                            ))}
                        </div>
                    </div>
                </article>
            </main>
        </div>
    );
}
