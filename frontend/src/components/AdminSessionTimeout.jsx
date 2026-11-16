import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOutAdmin } from '../api/firebaseAuth';
import {
  getAdminLastActivity,
  recordAdminActivity
} from '../utils/adminSession';
import '../pages/LeaguePolish.css';

const IDLE_TIMEOUT = 15 * 60 * 1000;
const WARNING_TIMEOUT = 2 * 60 * 1000;

export default function AdminSessionTimeout({ children }) {
  const navigate = useNavigate();
  const [sessionWarning, setSessionWarning] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState('');
  const timeoutRef = useRef(null);
  const lastMouseActivityRef = useRef(0);
  const lastActivityRef = useRef(null);

  const endSession = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setExpired(true);
    setSessionWarning(false);
    try {
      await signOutAdmin();
      navigate('/admin', { replace: true });
    } catch (signOutError) {
      setError(signOutError.message || 'Unable to end the administrator session.');
    }
  }, [navigate]);

  const scheduleTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (lastActivityRef.current === null) return;

    const warningAt = lastActivityRef.current + IDLE_TIMEOUT;
    const expiresAt = warningAt + WARNING_TIMEOUT;
    const now = Date.now();
    if (now >= expiresAt) {
      endSession();
      return;
    }

    setSessionWarning(now >= warningAt);
    timeoutRef.current = setTimeout(() => {
      if (Date.now() >= expiresAt) {
        endSession();
        return;
      }
      setSessionWarning(true);
      timeoutRef.current = setTimeout(
        endSession,
        Math.max(0, expiresAt - Date.now())
      );
    }, Math.max(0, warningAt - now));
  }, [endSession]);

  const recordActivity = useCallback(event => {
    const now = Date.now();
    if (
      event?.type === 'mousemove' &&
      now - lastMouseActivityRef.current < 1000
    ) return;
    if (event?.type === 'mousemove') lastMouseActivityRef.current = now;

    try {
      lastActivityRef.current = recordAdminActivity(now);
      setSessionWarning(false);
      scheduleTimeout();
    } catch {
      setError('Administrator session security could not be maintained. Sign in again.');
      setExpired(true);
    }
  }, [endSession, scheduleTimeout]);

  const verifyElapsedTime = useCallback(() => {
    try {
      const lastActivity = getAdminLastActivity();
      if (lastActivity !== null) lastActivityRef.current = lastActivity;
      scheduleTimeout();
    } catch {
      setError('Administrator session security could not be verified. Sign in again.');
      setExpired(true);
    }
  }, [endSession, scheduleTimeout]);

  useEffect(() => {
    try {
      const savedActivity = getAdminLastActivity();
      lastActivityRef.current = savedActivity === null
        ? recordAdminActivity()
        : savedActivity;
      scheduleTimeout();
    } catch {
      setError('Administrator session security could not be verified. Sign in again.');
      setExpired(true);
    }

    const activityEvents = [
      'click',
      'keydown',
      'mousemove',
      'pointerdown',
      'scroll',
      'touchstart'
    ];
    activityEvents.forEach(eventName =>
      window.addEventListener(eventName, recordActivity, { passive: true })
    );
    const checkOnResume = () => {
      if (document.visibilityState === 'visible') verifyElapsedTime();
    };
    document.addEventListener('visibilitychange', checkOnResume);
    window.addEventListener('focus', checkOnResume);
    window.addEventListener('storage', verifyElapsedTime);

    return () => {
      activityEvents.forEach(eventName =>
        window.removeEventListener(eventName, recordActivity)
      );
      document.removeEventListener('visibilitychange', checkOnResume);
      window.removeEventListener('focus', checkOnResume);
      window.removeEventListener('storage', verifyElapsedTime);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [endSession, recordActivity, scheduleTimeout, verifyElapsedTime]);

  if (expired) {
    return (
      <div className="league-page-empty" role="alert">
        <p>Your administrator session has expired.</p>
        {error && <p className="league-page-status league-page-status--error">{error}</p>}
        <button type="button" onClick={endSession}>Sign out</button>
      </div>
    );
  }

  return (
    <>
      {children}
      {sessionWarning && (
        <>
          <div className="league-session-overlay" />
          <section
            className="league-session-warning"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="session-warning-title"
          >
            <h2 id="session-warning-title">Session Expiring Soon</h2>
            <p>Your session will end due to inactivity. Continue to stay signed in.</p>
            <div>
              <button type="button" onClick={() => recordActivity()}>
                Continue session
              </button>
              <button type="button" className="league-button-danger" onClick={endSession}>
                Logout
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}
