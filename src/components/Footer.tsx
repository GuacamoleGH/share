import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="site-container footer-content">
        <div>
          GuacamoleGH Share &middot; Ecosistema Homelab Privado
        </div>
        <div className="footer-links">
          <a
            href="https://github.com/GuacamoleGH"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            GitHub
          </a>
          <span>&middot;</span>
          <a href="/admin" className="footer-link">
            Panel Admin
          </a>
        </div>
      </div>
    </footer>
  );
};
