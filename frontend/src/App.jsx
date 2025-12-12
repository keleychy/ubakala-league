import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import Bracket from './pages/Bracket';
import Standings from './pages/Standings';
import News from './pages/News';
import History from './pages/History';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UploadTeams from './pages/UploadTeams';
import ManualTeamForm from './pages/ManualTeamForm';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import GroupManager from './pages/GroupManager';
// 1. IMPORT THE ANALYTICS COMPONENT
import { Analytics } from '@vercel/analytics/react';


export default function App() {
  return (
    // 2. Wrap the entire return structure in a React Fragment (<>...</>)
    <>
      {/* 3. PLACE THE ANALYTICS COMPONENT HERE */}
      <Analytics />

      <BrowserRouter>
        <ErrorBoundary>
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}>
            <Header />
            <main style={{
              flex: 1,
              padding: '0'
            }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/results" element={<Results />} />
                <Route path="/bracket" element={<Bracket />} />
                <Route path="/standings" element={<Standings />} />
                <Route path="/news" element={<News />} />
                <Route path="/history" element={<History />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/upload-teams" element={<UploadTeams />} />
                <Route path="/add-team-manual" element={<ManualTeamForm />} />
                <Route path="/group-manager" element={<GroupManager />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ErrorBoundary>
      </BrowserRouter>
    </>
  );
}