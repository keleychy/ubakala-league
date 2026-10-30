import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import './LeaguePolish.css';

function excerpt(text, length = 120) {
  if (!text) return '';
  const oneLine = text.split(/\r?\n/)[0];
  return oneLine.length > length ? oneLine.slice(0, length).trim() + '…' : oneLine;
}

const News = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    api.getNews().then((data) => {
      if (!mounted) return;
      // Expect data as array of news objects
      setNewsItems(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch((err) => {
      if (!mounted) return;
      setError(err.message || 'Failed to load news');
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="league-polish-page">
      <main className="league-polish-content">
        <header className="league-page-header">
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">From the league</div>
            <h1 className="league-page-title">Latest News</h1>
            <p className="league-page-subtitle">Announcements, match reports and updates from the competition.</p>
          </div>
        </header>

      {loading && (
        <div className="league-page-empty">Loading news…</div>
      )}
      {error && (
        <div className="league-page-status league-page-status--error">Error: {error}</div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {newsItems.length > 0 && newsItems.map((item) => {
          // placeholder image when none provided: use project favicon for consistent fallback
          const imgSrc = item.image_url && item.image_url.length ? item.image_url : '/favicon.ico';
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/news/${item.id}`)}
              className="league-page-card league-news-card"
              style={{
                cursor: 'pointer',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <img
                  src={imgSrc}
                  alt={item.title}
                  style={{ width: 130, height: 88, objectFit: 'cover', borderRadius: 9, flexShrink: 0 }}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/favicon.ico'; }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                    <div>
                      <h2 style={{ margin: '0 0 5px', color: 'var(--league-navy)', fontSize: 18 }}>{item.title}</h2>
                      <div style={{ color: 'var(--league-muted)', fontSize: 13 }}>{item.subtitle || excerpt(item.content, 120)}</div>
                    </div>
                    <div style={{ color: 'var(--league-muted)', fontSize: 12, marginLeft: 12, whiteSpace: 'nowrap' }}>{item.author || 'Unknown'}</div>
                  </div>
                  <div style={{ marginTop: 10, color: 'var(--league-ink)', fontSize: 14, lineHeight: 1.6 }}>{excerpt(item.content, 180)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder for empty state */}
      {!loading && newsItems.length === 0 && (
        <div className="league-page-empty">
          <p style={{ color: 'inherit', fontSize: 14, margin: 0 }}>
            More updates coming soon! Stay tuned for the latest news about Ubakala Football League.
          </p>
        </div>
      )}
      </main>
    </div>
  );
};

export default News;