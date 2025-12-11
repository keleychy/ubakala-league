const Footer = () => {
  return (
    <footer style={{
      background: 'linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)',
      color: 'white',
      padding: '40px 20px',
      marginTop: '60px',
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '30px',
          marginBottom: '30px',
          textAlign: 'left'
        }}>
          <div>
            <h4 style={{ color: '#ffd700', marginBottom: '12px', fontSize: '16px', fontWeight: '700' }}>
              ⚽ About
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', lineHeight: '1.6', margin: '0' }}>
              Ubakala Football League unites communities through the beautiful game, fostering teamwork and excellence.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#ffd700', marginBottom: '12px', fontSize: '16px', fontWeight: '700' }}>
              📞 Contact
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', margin: '0 0 4px 0' }}>
              Email: info@ubakalafl.com
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', margin: '0' }}>
              Phone: +234 XXX XXX XXXX
            </p>
          </div>
          <div>
            <h4 style={{ color: '#ffd700', marginBottom: '12px', fontSize: '16px', fontWeight: '700' }}>
              🌐 Follow Us
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', margin: '0' }}>
              📘 Facebook | 🐦 Twitter | 📷 Instagram
            </p>
          </div>
        </div>
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          paddingTop: '20px'
        }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', margin: '0' }}>
            &copy; 2025 Ubakala Football League. All rights reserved. | Privacy Policy | Terms of Service
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;