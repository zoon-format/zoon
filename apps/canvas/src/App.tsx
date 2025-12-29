import React from 'react';
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import './index.css';
import { HomePage } from './pages/HomePage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { SpecPage } from './pages/SpecPage';
import { DocsPage } from './pages/DocsPage';

export default function App() {

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <div className="app-container">
      <nav className="nav">
        <div className="brand">
          <Link to="/" className="flex items-center gap-2 text-inherit no-underline">          
          ZOON
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="nav-items desktop-only">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>Overview</NavLink>
          <NavLink to="/docs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Docs</NavLink>
          <NavLink to="/playground" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Playground</NavLink>
          <NavLink to="/spec" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Specification</NavLink>
          <a href="https://github.com/zoon-format/zoon" className="nav-item" target="_blank" rel="noopener">GitHub</a>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Mobile Menu Overlay */}
        <div className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-header">
            <span className="brand">ZOON</span>
            <button 
              className="mobile-menu-close" 
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="mobile-nav-items">
            <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} end>Overview</NavLink>
            <NavLink to="/docs" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>Docs</NavLink>
            <NavLink to="/playground" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>Playground</NavLink>
            <NavLink to="/spec" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>Specification</NavLink>
            <a href="https://github.com/zoon-format/zoon" className="mobile-nav-item" target="_blank" rel="noopener">GitHub</a>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/spec" element={<SpecPage />} />
      </Routes>

      <footer className="footer">
        <p>© 2025-{new Date().getFullYear()} Carsen Klock. Released under MIT License.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
          <a href="https://github.com/zoon-format/zoon" target="_blank" rel="noopener">GitHub</a> · 
          <a href="https://npmjs.com/package/@zoon-format/zoon" target="_blank" rel="noopener">NPM</a> · 
          <a href="https://pypi.org/project/zoon-format/" target="_blank" rel="noopener">PyPI</a> · 
          <Link to="/spec">Specification</Link>
        </p>
      </footer>
    </div>
  );
}
