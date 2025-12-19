import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (e) {
    return iso;
  }
}

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
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ color: '#1e3c72', marginBottom: '30px' }}>📰 Latest News</h2>

      {loading && (
        <div style={{ marginBottom: '20px', color: '#555' }}>Loading news…</div>
      )}
      {error && (
        <div style={{ marginBottom: '20px', color: '#b91c1c', fontWeight: 600 }}>Error: {error}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {newsItems.length > 0 && newsItems.map((item) => {
          // placeholder image when none provided: use project favicon for consistent fallback
          const imgSrc = item.image_url && item.image_url.length ? item.image_url : '/favicon.ico';
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/news/${item.id}`)}
              style={{
                background: 'white',
                border: '2px solid #667eea',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <img
                  src={imgSrc}
                  alt={item.title}
                  style={{ width: 110, height: 70, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/favicon.ico'; }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#1e3c72', fontSize: 18 }}>{item.title}</h3>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{item.subtitle || excerpt(item.content, 120)}</div>
                    </div>
                    <div style={{ color: '#999', fontSize: 12, marginLeft: 12 }}>{item.author || 'Unknown'}</div>
                  </div>
                  <div style={{ marginTop: 8, color: '#555', fontSize: 14 }}>{excerpt(item.content, 180)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder for empty state */}
      {!loading && newsItems.length === 0 && (
        <div style={{
          marginTop: '40px',
          padding: '40px',
          background: '#f8f9ff',
          borderRadius: '12px',
          textAlign: 'center',
          border: '2px dashed #667eea'
        }}>
          <p style={{ color: '#999', fontSize: '14px' }}>
            More updates coming soon! Stay tuned for the latest news about Ubakala Football League.
          </p>
        </div>
      )}
    </div>
  );
};

export default News;