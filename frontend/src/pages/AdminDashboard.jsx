import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function getAuthHeaders() {
  const token = localStorage.getItem('access');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Session timeout handler (15 minutes of inactivity)
const SESSION_TIMEOUT = 15 * 60 * 1000;

export default function AdminDashboard() {
  const nav = useNavigate();
  const username = localStorage.getItem('username') || 'Unknown User';
  const access = localStorage.getItem('access');
  const [sessionWarning, setSessionWarning] = useState(false);
  const inactivityTimerRef = useRef(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user's role and permissions
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/league/user-roles/current_user/', {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role_profile?.role || 'user');
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      } finally {
        setLoading(false);
      }
    };

    if (access) {
      fetchUserRole();
    }
  }, [access]);

  // Security: Redirect to login if not authenticated
  useEffect(() => {
    if (!access) {
      nav('/admin');
    }
  }, [access, nav]);

  // Session timeout on inactivity
  const handleLogoutCb = useCallback(() => {
    // reuse nav inside callback
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('username');
    localStorage.removeItem('loginTime');
    nav('/admin');
  }, [nav]);

  useEffect(() => {
    const resetInactivityTimer = () => {
      // Clear previous timer
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      setSessionWarning(false);

      // Set new timer for 15 minutes of inactivity
      const timer = setTimeout(() => {
        setSessionWarning(true);
        // Auto logout after 2 more minutes of ignoring warning
        setTimeout(() => {
          handleLogoutCb();
        }, 2 * 60 * 1000);
      }, SESSION_TIMEOUT);

      inactivityTimerRef.current = timer;
    };

    // Track user activity (mouse, keyboard, scroll)
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    resetInactivityTimer();

    return () => {
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keypress', resetInactivityTimer);
      window.removeEventListener('scroll', resetInactivityTimer);
      window.removeEventListener('click', resetInactivityTimer);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [handleLogoutCb]);

  // Keep a simple wrapper to call the callback from buttons
  function handleLogout() {
    handleLogoutCb();
  }

  function extendSession() {
    setSessionWarning(false);
    // Reset inactivity timer by triggering activity
    window.dispatchEvent(new Event('mousemove'));
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return { bg: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)', textColor: '#333', label: '👑 Admin' };
      case 'moderator':
        return { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', textColor: 'white', label: '📋 Moderator' };
      default:
        return { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', textColor: 'white', label: '👤 User' };
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '60vh', padding: '20px' }}>
      <h2>Admin Dashboard</h2>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Link to="/upload-teams" style={{ marginRight: '8px', color: '#667eea', fontWeight: '600', textDecoration: 'none' }}>📤 Upload Teams</Link>
        <Link to="/add-team-manual" style={{ marginRight: '8px', color: '#667eea', fontWeight: '600', textDecoration: 'none' }}>➕ Add Team (Manual)</Link>
        <button onClick={handleLogout} style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
          cursor: 'pointer',
          marginLeft: 'auto',
          transition: 'all 0.3s ease'
        }} onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
        }} onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }}>🚪 Logout</button>
      </div>
      {/* Session Warning Modal */}
      {sessionWarning && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          zIndex: 10000,
          textAlign: 'center',
          minWidth: '350px',
          border: '3px solid #f59e0b'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏰</div>
          <h3 style={{ color: '#d97706', marginBottom: '12px' }}>Session Expiring Soon</h3>
          <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.5' }}>
            Your session will expire due to inactivity. Click "Extend Session" to continue.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={extendSession} style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }} onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}>
              ✓ Extend Session
            </button>
            <button onClick={handleLogout} style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }} onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}>
              🚪 Logout
            </button>
          </div>
        </div>
      )}
      {/* Overlay for session warning */}
      {sessionWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999
        }} />
      )}
      {/* Username and Role display at bottom right */}
      <div style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        background: 'rgba(30,60,114,0.95)',
        color: 'white',
        padding: '12px 18px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        zIndex: 9999,
        minWidth: '220px'
      }}>
        <div style={{ marginBottom: '8px' }}>👤 {username}</div>
        {!loading && userRole && (
          <div style={{
            background: getRoleBadgeColor(userRole).bg,
            color: getRoleBadgeColor(userRole).textColor,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '700',
            textAlign: 'center',
            width: 'fit-content'
          }}>
            {getRoleBadgeColor(userRole).label}
          </div>
        )}
      </div>
    </div>
  );
}

