import './Footer.css';

const Footer = () => {
  const container = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 20px'
  };

  const sectionTitle = {
    color: '#ffd966',
    marginBottom: 10,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.3px'
  };

  const text = {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0
  };

  return (
    <footer style={{ background: 'linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)', color: 'white', padding: '48px 0', marginTop: 60 }}>
      <div style={container}>
        <div className="ubakala-footer-grid">
          <div>
            <h4 style={sectionTitle}>About</h4>
            <p style={text}>
              Ubakala Football League promotes grassroots football by organising competitive, fair and
              community-focused competitions. We are committed to player development, sportsmanship and
              transparent administration.
            </p>
          </div>

          <div>
            <h4 style={sectionTitle}>Contact</h4>
            <p style={text}>Email: <a href="mailto:info@ubakalafl.com" style={{ color: '#bfe3ff' }}>info@ubakalafl.com</a></p>
            <p style={{ ...text, marginTop: 8 }}>Phone: <a href="tel:+2347085386110" style={{ color: '#bfe3ff' }}>+234 708 538 6110</a></p>
            <p style={{ ...text, marginTop: 8 }}>Office: Ubakala, Nigeria</p>
          </div>

          <div>
            <h4 style={sectionTitle}>Quick Links</h4>
            <p style={text}><a href="/" style={{ color: '#bfe3ff' }}>Home</a> &nbsp; | &nbsp; <a href="/standings" style={{ color: '#bfe3ff' }}>Standings</a></p>
            <p style={{ ...text, marginTop: 8 }}><a href="/results" style={{ color: '#bfe3ff' }}>Results</a> &nbsp; | &nbsp; <a href="/admin-login" style={{ color: '#bfe3ff' }}>Admin</a></p>
          </div>
        </div>

        <div className="ubakala-footer-bottom">
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>&copy; 2025 Ubakala Football League. All rights reserved.</p>

          <div className="ubakala-footer-right">
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Website produced by <strong style={{ color: '#bfe3ff' }}>Novatech Consult</strong></p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;