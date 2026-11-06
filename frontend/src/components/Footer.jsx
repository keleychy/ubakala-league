
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="ubakala-footer">
      <div className="ubakala-footer-container">

        <div className="ubakala-footer-grid">

          {/* About */}
          <div className="ubakala-footer-section">
            <h4 className="ubakala-footer-title">
              About Us
            </h4>

            <div className="ubakala-footer-title-line"></div>

            <p className="ubakala-footer-text">
              Ubakala Football League promotes grassroots football
              by organising competitive, fair and community-focused
              competitions. We are committed to player development,
              sportsmanship and transparent administration.
            </p>
          </div>

          {/* Contact */}
          <div className="ubakala-footer-section">
            <h4 className="ubakala-footer-title">
              Contact
            </h4>

            <div className="ubakala-footer-title-line"></div>

            <div className="ubakala-footer-contact-item">
              <span className="ubakala-footer-label">Email</span>
              <a href="mailto:info@ubakalafl.com">
                info@ubakalafl.com
              </a>
            </div>

            <div className="ubakala-footer-contact-item">
              <span className="ubakala-footer-label">Phone</span>
              <a href="tel:+2347085386110">
                +234 708 538 6110
              </a>
            </div>

            <div className="ubakala-footer-contact-item">
              <span className="ubakala-footer-label">Office</span>
              <span>Ubakala, Nigeria</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="ubakala-footer-section">
            <h4 className="ubakala-footer-title">
              Quick Links
            </h4>

            <div className="ubakala-footer-title-line"></div>

            <div className="ubakala-footer-links">
              <Link to="/">Home</Link>
              <Link to="/results">Results</Link>
              <Link to="/standings">Standings</Link>
              <Link to="/admin">Admin</Link>
              <Link to="/rules-regulations">Rules &amp; Regulations</Link>
            </div>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="ubakala-footer-bottom">

          <p className="ubakala-footer-copyright">
            © {currentYear} Ubakala Football League.
            All rights reserved.
          </p>

          <p className="ubakala-footer-credit">
            Website produced by{' '}
            <strong>Novatech Consult</strong>
          </p>

        </div>

      </div>
    </footer>
  );
};

export default Footer;
