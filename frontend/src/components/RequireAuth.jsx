import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children, allowedGroups = null }) {
    const access = localStorage.getItem('access');
    if (!access) return <Navigate to="/admin" replace />;
    if (allowedGroups && Array.isArray(allowedGroups)) {
        const groups = JSON.parse(localStorage.getItem('groups') || '[]');
        const allowed = allowedGroups.some(g => groups.includes(g));
        if (!allowed) return <Navigate to="/" replace />; // forbidden -> home
    }
    return children;
}
