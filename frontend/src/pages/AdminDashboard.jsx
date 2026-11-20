import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { callAdminApi } from '../api/adminApi';
import { signOutAdmin } from '../api/firebaseAuth';
import './LeaguePolish.css';

export default function AdminDashboard() {
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [supportClickCount, setSupportClickCount] = useState(null);
  const [supportClickError, setSupportClickError] = useState('');
  const [supportCountLoadAttempt, setSupportCountLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    callAdminApi('admin.me')
      .then(data => {
        if (active) setProfile(data);
      })
      .catch(async authError => {
        if (!active) return;
        setError(authError.message || 'Unable to verify administrator access.');
        await signOutAdmin().catch(() => {});
        nav('/admin', { replace: true });
      });
    return () => {
      active = false;
    };
  }, [nav]);

  const handleLogout = async () => {
    await signOutAdmin();
    nav('/admin', { replace: true });
  };

  const handleLogoutWithError = () => {
    handleLogout().catch(logoutError => {
      setError(logoutError.message || 'Unable to end the administrator session.');
    });
  };

  const role = String(profile?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isAdmin = role === 'admin';
  const canEditResults = isAdmin || role === 'resultseditor';
  const canManageNews = isAdmin || role === 'newsuser';

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    setSupportClickError('');
    callAdminApi('admin.support.clickCount')
      .then(data => {
        if (active) setSupportClickCount(data.click_count);
      })
      .catch(countError => {
        if (active) {
          setSupportClickError(
            countError.message || 'Unable to load the Support button click count.'
          );
        }
      });
    return () => {
      active = false;
    };
  }, [isAdmin, supportCountLoadAttempt]);

  return (
    <div className="league-polish-page">
      <main className="league-polish-content">
        <header className="league-page-header league-dashboard-header">
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">Administration</div>
            <h1 className="league-page-title">Admin Dashboard</h1>
            <p className="league-page-subtitle">Manage site content, results and teams.</p>
          </div>
          <div className="league-dashboard-user">
            <div>
              <div style={{ fontWeight: 700 }}>{profile?.email || 'Verifying account...'}</div>
              <div style={{ color: 'rgba(235, 242, 251, .75)', fontSize: 12 }}>
                {profile?.role || ''}
              </div>
            </div>
            <button type="button" className="league-button-danger" onClick={handleLogoutWithError}>
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="league-page-status league-page-status--error" role="alert">
            {error}
          </div>
        )}

        <div className="league-dashboard-grid">
          {isAdmin && (
            <article className="league-dashboard-card" aria-labelledby="support-click-count-title">
              <div>
                <div className="league-dashboard-card__title" id="support-click-count-title">
                  Homepage Support clicks
                </div>
                <div className="league-dashboard-card__description">
                  {supportClickCount === null && !supportClickError
                    ? 'Loading count...'
                    : supportClickError
                      ? supportClickError
                      : `${supportClickCount} total button clicks`}
                </div>
              </div>
              {supportClickError && (
                <button
                  type="button"
                  className="league-button-secondary"
                  onClick={() => setSupportCountLoadAttempt(attempt => attempt + 1)}
                >
                  Retry
                </button>
              )}
            </article>
          )}

          {canEditResults && (
            <Link to="/results-editor" className="league-dashboard-link">
              <div className="league-dashboard-card">
                <div>
                  <div className="league-dashboard-card__title">Results Editor</div>
                  <div className="league-dashboard-card__description">Update scores, periods and final results.</div>
                </div>
                <div style={{ marginTop: 16, color: 'var(--league-blue)', fontSize: 12, fontWeight: 700 }}>
                  Open results editor <span aria-hidden="true">→</span>
                </div>
              </div>
            </Link>
          )}

          {canManageNews && (
            <Link to="/news-uploader" className="league-dashboard-link">
              <div className="league-dashboard-card">
                <div>
                  <div className="league-dashboard-card__title">News Manager</div>
                  <div className="league-dashboard-card__description">Create, edit and publish announcements.</div>
                </div>
                <div style={{ marginTop: 16, color: 'var(--league-blue)', fontSize: 12, fontWeight: 700 }}>
                  Open news manager <span aria-hidden="true">→</span>
                </div>
              </div>
            </Link>
          )}

          {isAdmin && (
            <>
              <Link to="/upload-teams" className="league-dashboard-link">
                <div className="league-dashboard-card">
                  <div>
                    <div className="league-dashboard-card__title">Upload Teams</div>
                    <div className="league-dashboard-card__description">Import teams from the competition Excel format.</div>
                  </div>
                </div>
              </Link>

              <Link to="/add-team-manual" className="league-dashboard-link">
                <div className="league-dashboard-card">
                  <div>
                    <div className="league-dashboard-card__title">Add Team</div>
                    <div className="league-dashboard-card__description">Create and assign a team to a season group.</div>
                  </div>
                </div>
              </Link>

              <Link to="/group-manager" className="league-dashboard-link">
                <div className="league-dashboard-card">
                  <div>
                    <div className="league-dashboard-card__title">Group Manager</div>
                    <div className="league-dashboard-card__description">Move teams between competition groups.</div>
                  </div>
                </div>
              </Link>

              <Link to="/admin-predictions" className="league-dashboard-link">
                <div className="league-dashboard-card">
                  <div>
                    <div className="league-dashboard-card__title">Predictions Centre</div>
                    <div className="league-dashboard-card__description">Manage predictors, settings and prediction settlements.</div>
                  </div>
                </div>
              </Link>
            </>
          )}
        </div>
      </main>

    </div>
  );
}
