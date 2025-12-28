import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BENCHMARKS = [
  { name: 'ZOON', tokens: 6274, color: '#a855f7', isWinner: true },
  { name: 'ZON', tokens: 7840, color: '#06b6d4', isWinner: false },
  { name: 'TOON', tokens: 8630, color: '#f59e0b', isWinner: false },
  { name: 'JSON', tokens: 15685, color: '#64748b', isWinner: false },
];

const STATS = [
  { label: 'Token Reduction', value: 'Up to 60%', icon: '📉' },
  { label: 'vs TOON', value: '+17.2%', icon: '⚡' },
  { label: 'vs ZON', value: '+10.1%', icon: '🎯' },
  { label: 'Data Fidelity', value: '100%', icon: '💎' },
];

const USE_CASES = [
  { title: 'RAG Pipelines', desc: 'Fit 2x more documents in context windows', icon: '📚' },
  { title: 'Multi-Agent Systems', desc: 'Efficient inter-agent communication', icon: '🤖' },
  { title: 'Structured Outputs', desc: 'Type-safe LLM response validation', icon: '✅' },
  { title: 'Cost Optimization', desc: 'Cut API costs by up to 60%', icon: '💰' },
];

type JsPm = 'npm' | 'bun' | 'yarn';
type PyPm = 'pip' | 'uv';

const JS_COMMANDS: Record<JsPm, string> = {
  npm: 'npm install @zoon-format/zoon',
  bun: 'bun add @zoon-format/zoon',
  yarn: 'yarn add @zoon-format/zoon'
};

const PY_COMMANDS: Record<PyPm, string> = {
  pip: 'pip install zoon-format',
  uv: 'uv add zoon-format'
};

export function HomePage() {
  const navigate = useNavigate();
  const [animatedSavings, setAnimatedSavings] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [jsPm, setJsPm] = useState<JsPm>('npm');
  const [pyPm, setPyPm] = useState<PyPm>('pip');

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    const target = 60.0;
    const duration = 2000;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setAnimatedSavings(Number((progress * target).toFixed(1)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="hero-glow"></div>
        <div className="badge animate-pulse" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem' }}>⚡</span>
          <span>v1.0</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ color: '#a855f7' }}>TS</span>
          <span style={{ color: '#3b82f6' }}>Python</span>
          <span style={{ color: '#00ADD8' }}>Go</span>
          <span style={{ color: '#DEA584' }}>Rust</span>
        </div>
        <h1 className="headline animate-slide-up">
          Built for<br />
          <span>the AI Era</span>
        </h1>
        <p className="subheadline animate-fade-in">
          The most token-efficient data format for large language models.
          ZOON delivers <strong>up to {animatedSavings}% reduction</strong> while maintaining perfect accuracy.
        </p>
        <div className="cta-group animate-fade-in">
          <button className="btn btn-primary" onClick={() => navigate('/playground')}>
            🚀 Try Playground
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/spec')}>
            📄 Read Specification
          </button>
        </div>

        <div className="stats-row animate-slide-up">
          {STATS.map((s, i) => (
            <div key={i} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          <h2 className="section-title" style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '2rem' }}>
            See the Difference
          </h2>
          <div className="demo-compare">
            <div className="demo-code">
              <div style={{ marginBottom: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>JSON</span>
                <span className="token-pill">164 tokens</span>
              </div>
              {`[
  { "id": 1, "name": "Alice", "role": "admin" },
  { "id": 2, "name": "Bob", "role": "user" },
  { "id": 3, "name": "Carol", "role": "user" }
]`}
            </div>
            <div className="demo-arrow animate-pulse">→</div>
            <div className="demo-code highlight">
              <div style={{ marginBottom: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--accent)' }}>ZOON</span>
                <span className="token-pill highlight">87 tokens 🏆</span>
              </div>
              {`# id:i+ name:s role=admin|user
Alice admin
Bob user
Carol user`}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--accent)', fontWeight: 600 }}>
            ↓ 47% reduction (up to 60% on larger datasets) ↓
          </div>
        </div>

        <div className="glass-panel chart-container">
          <div className="chart-header">
            <div>
              <h2 className="section-title">Why Choose ZOON?</h2>
              <p style={{ color: 'var(--text-dim)' }}>Token Usage Comparison · Best Case Scenarios</p>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>← Fewer tokens = Better</div>
          </div>
          
          {BENCHMARKS.map((b, i) => {
            const maxTokens = BENCHMARKS[BENCHMARKS.length - 1].tokens;
            const barWidth = (b.tokens / maxTokens) * 100;
            return (
              <div key={i} className="chart-row animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="chart-label" style={{ color: b.color, fontWeight: b.isWinner ? 700 : 500 }}>
                  {b.name} {b.isWinner && '👑'}
                </div>
                <div className="colored-bar">
                  <div 
                    className="colored-bar-fill animate-grow"
                    style={{ 
                      width: `${barWidth}%`, 
                      background: `linear-gradient(90deg, ${b.color}dd, ${b.color}99)`,
                      boxShadow: b.isWinner ? `0 0 20px ${b.color}66` : 'none'
                    }}
                  ></div>
                </div>
                <div className="chart-stats">
                  <span style={{ color: b.color }}>{b.tokens.toLocaleString()} tok</span>
                  <span style={{ color: b.isWinner ? 'var(--accent)' : 'var(--text-dim)' }}>
                    {b.isWinner ? 'Best' : `+${Math.round((b.tokens - BENCHMARKS[0].tokens) / BENCHMARKS[0].tokens * 100)}%`}
                  </span>
                </div>
              </div>
            );
          })}
          
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>Maximum Savings</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Compared to JSON on optimized datasets (IoT, Logs)</div>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                -60.0%
              </div>
            </div>
          </div>
        </div>

        <h2 className="section-title" style={{ textAlign: 'center', marginTop: '4rem' }}>Perfect For</h2>
        <div className="use-cases-grid">
          {USE_CASES.map((uc, i) => (
            <div key={i} className="glass-panel use-case-card animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="use-case-icon">{uc.icon}</span>
              <h3>{uc.title}</h3>
              <p>{uc.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid-features">
          <div className="glass-panel feature-card">
            <div className="icon-box">⚡</div>
            <h3 className="feature-title">Token-Efficient Architecture</h3>
            <p className="feature-desc">
              Achieves up to 60% token reduction using header aliases (`%a=foo.bar`) 
              and constant hoisting (`@field=val`) to eliminate all redundancy.
            </p>
          </div>
          <div className="glass-panel feature-card">
            <div className="icon-box">🛡️</div>
            <h3 className="feature-title">Runtime Guardrails</h3>
            <p className="feature-desc">
              Validate LLM outputs against strict schemas with zero overhead. 
              Type-safe, reliable, and built for production critical paths.
            </p>
          </div>
          <div className="glass-panel feature-card">
            <div className="icon-box">💎</div>
            <h3 className="feature-title">100% Lossless</h3>
            <p className="feature-desc">
              Unlike other compact formats, ZOON preserves all data fidelity including types, 
              nulls, and nested structures via advanced unflattening.
            </p>
          </div>
          <div className="glass-panel feature-card">
            <div className="icon-box">🚀</div>
            <h3 className="feature-title">Dual-Mode Encoding</h3>
            <p className="feature-desc">
              Switches intelligently between tabular format for arrays and inline format for 
              objects, covering 100% of JSON use cases.
            </p>
          </div>
        </div>

        <div className="install-section">
          <div className="install-block">
            <div className="install-header">
              <h3>JavaScript / TypeScript</h3>
              <div className="pm-tabs">
                {(['npm', 'bun', 'yarn'] as JsPm[]).map(pm => (
                  <button 
                    key={pm} 
                    className={`pm-tab ${jsPm === pm ? 'active' : ''}`}
                    onClick={() => setJsPm(pm)}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>
            <div className="install-cmd" onClick={() => handleCopy(JS_COMMANDS[jsPm], 'js')}>
              {JS_COMMANDS[jsPm]} <span>{copied === 'js' ? '✅' : '📋'}</span>
            </div>
          </div>
          <div className="install-block">
            <div className="install-header">
              <h3>Python</h3>
              <div className="pm-tabs">
                {(['pip', 'uv'] as PyPm[]).map(pm => (
                  <button 
                    key={pm} 
                    className={`pm-tab ${pyPm === pm ? 'active' : ''}`}
                    onClick={() => setPyPm(pm)}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>
            <div className="install-cmd" onClick={() => handleCopy(PY_COMMANDS[pyPm], 'py')}>
              {PY_COMMANDS[pyPm]} <span>{copied === 'py' ? '✅' : '📋'}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
