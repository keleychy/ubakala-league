import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import Bracket from './pages/Bracket';
import Standings from './pages/Standings';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import History from './pages/History';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import NewsUploader from './pages/NewsUploader';
import ResultsEditor from './pages/ResultsEditor';
import RequireAuth from './components/RequireAuth';
import UploadTeams from './pages/UploadTeams';
import ManualTeamForm from './pages/ManualTeamForm';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import GroupManager from './pages/GroupManager';

// 1. IMPORT ANALYTICS LIBRARIES
import { Analytics } from '@vercel/analytics/react';
import ReactGA from 'react-ga4';

// 2. INITIALIZE GOOGLE ANALYTICS
ReactGA.initialize("G-7BQMQZEQHM");

// 3. HELPER COMPONENT TO TRACK PAGE VIEWS
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname + location.search
    });
  }, [location]);

  return null; // This component doesn't render anything, it just "listens"
}

export default function App() {
  return (
    <>
      {/* Vercel Speed/Performance Analytics */}
      <Analytics />

      <BrowserRouter>
        {/* THIS IS THE ENGINE THAT SENDS DATA TO GOOGLE */}
        <AnalyticsTracker />

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
                <Route path="/news/:id" element={<NewsDetail />} />
                <Route path="/history" element={<History />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/news-uploader" element={<RequireAuth allowedGroups={["NewsUploader"]}><NewsUploader /></RequireAuth>} />
                <Route path="/results-editor" element={<RequireAuth allowedGroups={["ResultsEditor"]}><ResultsEditor /></RequireAuth>} />
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