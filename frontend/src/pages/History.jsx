import React from 'react';

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
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ color: '#1e3c72', marginBottom: '30px' }}>📜 League History</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {historicalData.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: 'white',
              border: '3px solid ' + (item.status === 'ongoing' ? '#667eea' : '#ccc'),
              borderRadius: '12px',
              padding: '24px',
              boxShadow: item.status === 'ongoing' ? '0 8px 24px rgba(102, 126, 234, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease',
              position: 'relative',
              left: idx % 2 === 0 ? '0' : '0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.2)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = item.status === 'ongoing' ? '0 8px 24px rgba(102, 126, 234, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
              <div style={{
                fontSize: '48px',
                fontWeight: '800',
                color: item.status === 'ongoing' ? '#667eea' : '#ccc',
                minWidth: '80px',
                textAlign: 'center'
              }}>
                {item.year}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{
                    color: '#1e3c72',
                    fontSize: '22px',
                    fontWeight: '700',
                    margin: '0'
                  }}>
                    {item.title}
                  </h3>
                  {item.status === 'ongoing' && (
                    <span style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      🔄 Ongoing
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span style={{
                      background: '#dcfce7',
                      color: '#16a34a',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '1px solid #86efac'
                    }}>
                      ✓ Completed
                    </span>
                  )}
                </div>
                <p style={{
                  color: '#666',
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
        background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
        borderRadius: '12px',
        textAlign: 'center',
        border: '2px solid #e0e7ff'
      }}>
        <h3 style={{ color: '#1e3c72', marginBottom: '12px' }}>⚽ League Milestones</h3>
        <p style={{ color: '#666', fontSize: '14px', margin: '0' }}>
          From 2023 to present, Ubakala Football League has grown to become a premier community sports competition with 12 participating teams and hundreds of spectators.
        </p>
      </div>
    </div>
  );
};

export default History;