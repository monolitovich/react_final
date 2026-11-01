import React from 'react';
import { Link } from 'react-router-dom';

// подвал сайта
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <p>© 2026 SoundWave Music. Все права защищены.</p>
        <div className="footer-links">
          <Link to="/about">О компании</Link>
          <Link to="/help">Помощь и контакты</Link>
        </div>
      </div>
    </footer>
  );
}