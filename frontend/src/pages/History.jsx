import React from 'react';
import './LeaguePolish.css';

const History = () => {
  const historicalData = [
    {
      year: '2025',
      title: 'Current Season',
      description: 'Ubakala Football League Season 2025 - 3 categories (Senior Boys, Junior Boys, Girls) with group stage and knockout rounds.',
      status: 'ongoing'
    },
    {
      year: '2024',
      title: 'Season 2024 ',
      description: 'Successfully concluded the 2024 season with exciting finals across all three categories.',
      status: 'completed'
    },
    {
      year: '2023',
      title: 'Season 2023',
      description: 'Successfully concluded the 2023 season with exciting finals across all three categories.',
      status: 'completed'
    }
  ];

  return (
    <div className="league-polish-page">
      <main className="league-polish-content">
        <header className="league-page-header">
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">Our competition</div>
            <h1 className="league-page-title">League History</h1>
            <p className="league-page-subtitle">A record of seasons, milestones and community football.</p>
          </div>
        </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {historicalData.map((item, idx) => (
          <div
            key={idx}
            className="league-page-card league-history-card"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div style={{
                fontSize: 'clamp(30px, 5vw, 44px)',
                fontWeight: 800,
                color: item.status === 'ongoing' ? 'var(--league-blue)' : '#9aa8b8',
                minWidth: 78,
                textAlign: 'center'
              }}>
                {item.year}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{
                    color: 'var(--league-navy)',
                    fontSize: 20,
                    fontWeight: 750,
                    margin: 0
                  }}>
                    {item.title}
                  </h3>
                  {item.status === 'ongoing' && (
                    <span style={{
                      background: '#edf3fa',
                      color: 'var(--league-blue)',
                      padding: '5px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      🔄 Ongoing
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span style={{
                      background: '#eef7f0',
                      color: '#317347',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '1px solid #cee6d4'
                    }}>
                      ✓ Completed
                    </span>
                  )}
                </div>
                <p style={{
                  color: 'var(--league-muted)',
                  lineHeight: '1.6',
                  fontSize: '14px',
                  margin: '0'
                }}>
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline decoration */}
      <div style={{
        marginTop: '40px',
        padding: '30px',
        background: '#fff',
        borderRadius: 14,
        textAlign: 'center',
        border: '1px solid var(--league-border)',
        boxShadow: '0 5px 18px rgba(20, 43, 75, .055)'
      }}>
        <h3 style={{ color: 'var(--league-navy)', marginBottom: 12 }}>League Milestones</h3>
        <p style={{ color: 'var(--league-muted)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          From 2023 to present, Ubakala Football League has grown to become a premier community sports competition with 12 participating teams and hundreds of spectators.
        </p>
      </div>
      </main>
    </div>
  );
};

export default History;