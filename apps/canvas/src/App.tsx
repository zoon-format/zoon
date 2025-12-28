import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import './index.css';
import { HomePage } from './pages/HomePage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { SpecPage } from './pages/SpecPage';
import { DocsPage } from './pages/DocsPage';

export default function App() {

  return (
    <div className="app-container">
      <nav className="nav">
        <div className="brand">
          <Link to="/" className="flex items-center gap-2 text-inherit no-underline">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="paint0_linear" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A855F7"/>
                <stop offset="1" stopColor="#06B6D4"/>
              </linearGradient>
            </defs>
          </svg>
          ZOON
          </Link>
        </div>
        <div className="nav-items">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>Overview</NavLink>
          <NavLink to="/docs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Docs</NavLink>
          <NavLink to="/playground" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Playground</NavLink>
          <NavLink to="/spec" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Specification</NavLink>
          <a href="https://github.com/zoon-format/zoon" className="nav-item" target="_blank" rel="noopener">GitHub</a>
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
