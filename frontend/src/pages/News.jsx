import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import './LeaguePolish.css';

const NEWS_PER_PAGE = 9;

function excerpt(text, length = 100) {
  if (!text) return '';
  const plainText = String(text).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plainText.length > length
    ? `${plainText.slice(0, length).trim()}…`
    : plainText;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const News = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    api.getNews().then((data) => {
      if (!mounted) return;
      setNewsItems(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch((err) => {
      if (!mounted) return;
      setError(err.message || 'Failed to load news');
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const pageCount = Math.ceil(newsItems.length / NEWS_PER_PAGE);
  const visibleNews = newsItems.slice(
    (currentPage - 1) * NEWS_PER_PAGE,
    currentPage * NEWS_PER_PAGE
  );

  return (
    <div className="league-polish-page">
      <main className="league-polish-content news-listing">
        <header className="league-page-header">
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">From the league</div>
            <h1 className="league-page-title">Latest News</h1>
            <p className="league-page-subtitle">
              Announcements, match reports and updates from the competition.
            </p>
          </div>
        </header>

        {loading && (
          <div className="league-page-empty" role="status">Loading news…</div>
        )}
        {error && (
          <div className="league-page-status league-page-status--error" role="alert">
            Error: {error}
          </div>
        )}

        {!loading && !error && newsItems.length > 0 && (
          <>
            <div className="news-card-grid">
            {visibleNews.map((item) => {
              const date = formatDate(item.published_at || item.created_at);
              return (
                <Link
                  key={item.id}
                  to={`/news/${item.id}`}
                  className="league-page-card league-news-card news-story-card"
                  aria-label={`Read ${item.title || 'news article'}`}
                >
                  <div className="news-story-image">
                    <img
                      src={item.image_url || '/favicon.ico'}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = '/favicon.ico';
                      }}
                    />
                  </div>
                  <div className="news-story-copy">
                    <div className="news-story-meta">
                      <span>{item.author || 'Ubakala Football League'}</span>
                      {date && <time dateTime={item.published_at || item.created_at}>{date}</time>}
                    </div>
                    <h2>{item.title || 'Untitled article'}</h2>
                    {item.subtitle && <p className="news-story-subtitle">{item.subtitle}</p>}
                    <p className="news-story-excerpt">
                      {excerpt(item.content || item.subtitle)}
                    </p>
                    <div className="news-story-footer">
                      <span className="news-story-views" aria-label={`${item.views || 0} views`}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M2.5 12s3.4-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.4 6.2-9.5 6.2S2.5 12 2.5 12Z" />
                          <circle cx="12" cy="12" r="2.7" />
                        </svg>
                        {item.views || 0} views
                      </span>
                      <span className="news-story-link">Read story <span aria-hidden="true">→</span></span>
                    </div>
                  </div>
                </Link>
              );
            })}
            </div>
            {pageCount > 1 && (
              <nav className="news-pagination" aria-label="News pages">
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {pageCount}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))}
                  disabled={currentPage === pageCount}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}

        {!loading && !error && newsItems.length === 0 && (
          <div className="league-page-empty news-list-empty">
            <h2>News and updates are on the way</h2>
            <p>Check back soon for the latest from Ubakala Football League.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default News;
