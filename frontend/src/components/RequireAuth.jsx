import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { callAdminApi } from '../api/adminApi';
import { getFirebaseAuth } from '../api/firebaseClient';
import { signOutAdmin } from '../api/firebaseAuth';

function normalizeRole(role) {
  return String(role || '').toLowerCase().replace(/[\s_-]+/g, '');
}

export default function RequireAuth({ children, allowedRoles = [] }) {
  const [state, setState] = useState({ status: 'loading', profile: null, error: '' });

  useEffect(() => {
    let active = true;
    let unsubscribe;

    try {
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), async user => {
        if (!active) return;
        if (!user) {
          setState({ status: 'unauthenticated', profile: null, error: '' });
          return;
        }

        try {
          const profile = await callAdminApi('admin.me');
          const role = normalizeRole(profile?.role);
          const allowed = role === 'admin' ||
            allowedRoles.map(normalizeRole).includes(role);
          if (!allowed) {
            await signOutAdmin();
            if (active) {
              setState({
                status: 'forbidden',
                profile: null,
                error: 'Your account does not have permission to access this page.'
              });
            }
            return;
          }
          if (active) setState({ status: 'authorized', profile, error: '' });
        } catch (error) {
          await signOutAdmin().catch(() => {});
          if (active) {
            setState({
              status: 'error',
              profile: null,
              error: error.message || 'Unable to verify administrator access.'
            });
          }
        }
      }, error => {
        if (active) {
          setState({
            status: 'error',
            profile: null,
            error: error.message || 'Unable to initialize administrator access.'
          });
        }
      });
    } catch (error) {
      setState({
        status: 'error',
        profile: null,
        error: error.message || 'Firebase authentication is not configured.'
      });
    }

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [allowedRoles]);

  if (state.status === 'loading') {
    return <div className="league-page-empty">Checking administrator access...</div>;
  }
  if (state.status === 'unauthenticated') {
    return <Navigate to="/admin" replace />;
  }
  if (state.status === 'forbidden') {
    return <Navigate to="/" replace state={{ authError: state.error }} />;
  }
  if (state.status === 'error') {
    return (
      <div className="league-polish-page">
        <main className="league-polish-content">
          <div className="league-page-status league-page-status--error" role="alert">
            {state.error}
          </div>
          <Link to="/admin">Return to administrator login</Link>
        </main>
      </div>
    );
  }
  return children;
}
