import React, { useState, useEffect, useMemo } from 'react';
import { Zoon } from '@zoon-format/zoon';
import { encode as encodeToon } from '@toon-format/toon';
import { encode as encodeZon } from 'zon-format';
import { encodingForModel } from 'js-tiktoken';
import { PRESETS } from '../data';

export function PlaygroundPage() {
  const [inputJson, setInputJson] = useState(PRESETS["E-Commerce"]);
  const [outputs, setOutputs] = useState({ zoon: '', toon: '', zon: '', json: '' });
  const [stats, setStats] = useState({ json: 0, zoon: 0, toon: 0, zon: 0 });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const tokenizer = useMemo(() => {
    try { return encodingForModel('gpt-4o'); } catch { return null; }
  }, []);

  useEffect(() => {
    try {
      const data = JSON.parse(inputJson);
      setError(null);
      
      const jsonStr = JSON.stringify(data);
      const zoonStr = Zoon.encode(data);
      let toonStr = '', zonStr = '';
      
      try { toonStr = Array.isArray(data) ? encodeToon(data) : ''; } catch {}
      try { zonStr = encodeZon(data); } catch {}

      setOutputs({
        json: jsonStr,
        zoon: zoonStr,
        toon: toonStr || '(Not applicable for this structure)',
        zon: zonStr || '(Error encoding)'
      });

      const count = (s: string) => tokenizer?.encode(s).length || Math.ceil(s.length / 4);
      
      setStats({
        json: count(jsonStr),
        zoon: count(zoonStr),
        toon: toonStr ? count(toonStr) : 0,
        zon: zonStr ? count(zonStr) : 0
      });

    } catch {
      setError('Invalid JSON input');
    }
  }, [inputJson, tokenizer]);

  const savings = stats.json > 0 ? Math.round((1 - stats.zoon / stats.json) * 100) : 0;

  return (
    <main className="section" style={{ maxWidth: '1400px', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="section-title">Live Converter</h1>
        <p className="section-subtitle">
          Paste your JSON below to see instant ZOON conversion and token savings.<br/>
          Comparison metrics are calculated in real-time.
        </p>
      </div>

      <div className="glass-panel playground-wrapper">
        <div className="editor-window">
          <div className="window-header">
            <span className="window-title">Input JSON</span>
            <select 
              className="preset-select"
              value=""
              onChange={(e) => setInputJson(PRESETS[e.target.value])}
            >
              <option value="" disabled>Load Example...</option>
              {Object.keys(PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <textarea 
            className="code-area"
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            spellCheck={false}
            placeholder="// Paste any JSON array here..."
            style={{ minHeight: '400px' }}
          />
          {error && <div style={{ color: 'var(--error)', padding: '0 1.5rem 1rem', fontSize: '12px' }}>{error}</div>}
          <div className="window-stats">
            <span className="token-pill">{stats.json} tokens</span>
            <span className="format-label">Standard JSON</span>
          </div>
        </div>

        <div className="editor-window" style={{ background: 'rgba(168, 85, 247, 0.03)' }}>
          <div className="window-header">
            <span className="window-title" style={{ color: 'var(--accent)' }}>ZOON Output</span>
            <button 
              className="btn-secondary" 
              style={{ padding: '6px 14px', fontSize: '11px', height: 'auto', minHeight: 'unset' }}
              onClick={() => handleCopy(outputs.zoon, 'result')}
            >
              {copied === 'result' ? 'COPIED!' : 'COPY RESULT'}
            </button>
          </div>
          <textarea 
            className="code-area"
            value={outputs.zoon}
            readOnly
            style={{ color: 'var(--accent)', minHeight: '400px' }}
            placeholder="// ZOON output will appear here..."
          />
          <div className="window-stats" style={{ borderTop: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <span className="token-pill highlight">{stats.zoon} tokens</span>
            <span className="savings-badge">-{savings}% Savings</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 600 }}>Token Comparison</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>← Smaller = Better</span>
        </div>
        <div className="comparison-grid">
          {[
            { name: 'JSON', tokens: stats.json, color: '#64748b' },
            { name: 'TOON', tokens: stats.toon, color: '#f59e0b' },
            { name: 'ZON', tokens: stats.zon, color: '#06b6d4' },
            { name: 'ZOON', tokens: stats.zoon, color: '#a855f7' }
          ].map(f => {
            const hasTokens = f.tokens > 0;
            const width = hasTokens ? (f.tokens / stats.json) * 100 : 0;
            const isWinner = f.name === 'ZOON';
            const savingsVsJson = hasTokens && f.name !== 'JSON' ? Math.round((1 - f.tokens / stats.json) * 100) : 0;
            return (
              <div key={f.name} className="glass-panel" style={{ padding: '1.5rem', border: isWinner ? '1px solid rgba(168, 85, 247, 0.4)' : undefined, opacity: hasTokens ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ color: f.color }}>{f.name} {isWinner && '👑'}</span>
                  <span>{hasTokens ? `${f.tokens} tok` : 'N/A'} {savingsVsJson > 0 && <span style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>-{savingsVsJson}%</span>}</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${width}%`, 
                    height: '100%', 
                    background: isWinner ? 'var(--gradient-main)' : f.color,
                    boxShadow: isWinner ? '0 0 10px rgba(168, 85, 247, 0.5)' : 'none',
                    transition: 'width 0.5s ease-out'
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '0.5rem' }}>📦</span> The ZOON Ecosystem
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="ecosystem-item" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong style={{ color: '#a855f7' }}>@zoon-format/zoon</strong>
                <span className="token-pill">TS / JS</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>Core parser and stringifier. Zero dependencies, browser compatible.</p>
            </div>
            
            <div className="ecosystem-item" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong style={{ color: '#3b82f6' }}>zoon-format</strong>
                <span className="token-pill">Python</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>High-speed Python bindings. Native extension for max performance.</p>
            </div>

            <div className="ecosystem-item" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong style={{ color: '#f59e0b' }}>@zoon-format/cli</strong>
                <span className="token-pill">CLI</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>Command line tools for piping and file conversion.</p>
            </div>

            <div className="ecosystem-item" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong style={{ color: '#00ADD8' }}>zoon-go</strong>
                <span className="token-pill">Go</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>Native Go module with Marshal/Unmarshal API. Go 1.24.0+.</p>
            </div>

            <div className="ecosystem-item" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong style={{ color: '#DEA584' }}>zoon-rust</strong>
                <span className="token-pill">Rust</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>Rust crate with serde integration. encode/decode API.</p>
            </div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '0.5rem' }}>🚀</span> Integration Guide
          </h3>
          <div style={{ background: '#0f111a', padding: '1.25rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto' }}>
            <div style={{ color: '#64748b', marginBottom: '0.5rem' }}>// 1. TypeScript / Node.js</div>
            <div style={{ color: '#e2e8f0' }}>import {'{'} encode {'}'} from '@zoon-format/zoon';</div>
            <div style={{ color: '#e2e8f0', marginTop: '0.25rem' }}>const encoded = encode(data);</div>
            
            <div style={{ color: '#64748b', margin: '1.2rem 0 0.5rem' }}># 2. Python</div>
            <div style={{ color: '#e2e8f0' }}>import zoon</div>
            <div style={{ color: '#e2e8f0', marginTop: '0.25rem' }}>encoded = zoon.encode(data)</div>

            <div style={{ color: '#64748b', margin: '1.2rem 0 0.5rem' }}>// 3. Go</div>
            <div style={{ color: '#e2e8f0' }}>import "github.com/zoon-format/zoon-go"</div>
            <div style={{ color: '#e2e8f0', marginTop: '0.25rem' }}>encoded, _ := zoon.Marshal(data)</div>

            <div style={{ color: '#64748b', margin: '1.2rem 0 0.5rem' }}>// 4. Rust</div>
            <div style={{ color: '#e2e8f0' }}>use zoon::encode;</div>
            <div style={{ color: '#e2e8f0', marginTop: '0.25rem' }}>let encoded = encode(&data)?;</div>

            <div style={{ color: '#64748b', margin: '1.2rem 0 0.5rem' }}># 5. CLI Pipeline</div>
            <div style={{ color: '#a855f7' }}>$ cat large-log.json | zoon {'>'} compressed.zoon</div>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            💡 <strong>Pro Tip:</strong> ZOON detects structure automatically. No schemas required.
          </div>
        </div>
      </div>
    </main>
  );
}
