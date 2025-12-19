import React, { useEffect, useState } from 'react';
import { api } from '../api/api';

const News = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        {newsItems.length > 0 && newsItems.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.15)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                fontSize: '40px',
                minWidth: '50px',
                textAlign: 'center'
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px' }}>
                  <div>
                    <h3 style={{
                      color: '#1e3c72',
                      fontSize: '20px',
                      fontWeight: '700',
                      marginBottom: '8px'
                    }}>
                      {item.title}
                    </h3>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      marginBottom: '12px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {item.category}
                      </span>
                      <span style={{
                        color: '#999',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        🕐 {item.date}
                      </span>
                    </div>
                  </div>
                </div>
                <p style={{
                  color: '#555',
                  lineHeight: '1.6',
                  fontSize: '14px',
                  margin: '0'
                }}>
                  {item.content}
                </p>
              </div>
            </div>
          </div>
        ))}
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