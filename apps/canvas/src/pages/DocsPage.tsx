import { useState, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-toml';
import './docs.css';

type DocSection = 'getting-started' | 'installation' | 'api' | 'examples' | 'comparison' | 'publishing';

const sections: { id: DocSection; title: string; icon: string }[] = [
  { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
  { id: 'installation', title: 'Installation', icon: '📦' },
  { id: 'api', title: 'API Reference', icon: '📚' },
  { id: 'examples', title: 'Examples', icon: '💡' },
  { id: 'comparison', title: 'Format Comparison', icon: '📊' },
];

export function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Prism.highlightAll();
  }, [activeSection]);

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="docs-container">
      <aside className="docs-sidebar">
        <div className="docs-search">
          <input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <nav className="docs-nav">
          {filteredSections.map(section => (
            <button
              key={section.id}
              className={`docs-nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="docs-nav-icon">{section.icon}</span>
              {section.title}
            </button>
          ))}
        </nav>
      </aside>

      <article className="docs-content">
        {activeSection === 'getting-started' && <GettingStartedSection />}
        {activeSection === 'installation' && <InstallationSection />}
        {activeSection === 'api' && <ApiSection />}
        {activeSection === 'examples' && <ExamplesSection />}
        {activeSection === 'comparison' && <ComparisonSection />}
      </article>
    </main>
  );
}

function GettingStartedSection() {
  return (
    <div className="docs-section">
      <h1>Getting Started with ZOON</h1>
      <p className="docs-intro">
        ZOON (Zero Overhead Object Notation) is a token-optimized text format designed to 
        minimize token consumption when transmitting structured data to Large Language Models (LLMs).
        Achieve <strong>40-60% token reduction</strong> compared to JSON.
      </p>

      <div className="docs-alert docs-alert-tip">
        <strong>Why ZOON?</strong> LLM tokens cost money. ZOON dramatically reduces your API costs 
        while maintaining 100% accuracy and lossless data transmission.
      </div>

      <h2>Key Features</h2>
      <ul className="docs-features">
        <li><strong>100% LLM Accuracy</strong> – Achieves perfect retrieval with self-explanatory structure</li>
        <li><strong>40-60% Token Reduction</strong> – Significantly cheaper than JSON for LLM workflows</li>
        <li><strong>JSON Compatible</strong> – Encodes same objects, arrays, and primitives with lossless round-trips</li>
        <li><strong>Two Encoding Modes</strong> – Tabular format for arrays, Inline format for objects</li>
        <li><strong>Auto-Increment IDs</strong> – Sequential IDs are omitted from output (i+ type)</li>
        <li><strong>Smart Enum Detection</strong> – Low-cardinality strings compressed automatically</li>
        <li><strong>Multi-Language Support</strong> – TypeScript, Python, Go, and Rust implementations</li>
      </ul>

      <h2>Quick Example</h2>
      <div className="docs-code-block">
        <div className="docs-code-header">JSON (27 tokens)</div>
        <pre>{`[{"id":1,"name":"Alice","role":"admin"},{"id":2,"name":"Bob","role":"user"}]`}</pre>
      </div>
      <div className="docs-code-block">
        <div className="docs-code-header">ZOON (14 tokens) – 48% savings</div>
        <pre>{`# id:i+ name:s role=admin|user
Alice admin
Bob user`}</pre>
      </div>

      <h2>When to Use ZOON</h2>
      <div className="docs-grid">
        <div className="docs-card docs-card-good">
          <h4>✅ Use ZOON when:</h4>
          <ul>
            <li>Sending structured data to LLMs (ChatGPT, Claude, Gemini)</li>
            <li>Arrays contain uniform objects with repeated keys</li>
            <li>Token costs or context limits are a concern</li>
            <li>Deterministic, compact output is desired</li>
          </ul>
        </div>
        <div className="docs-card docs-card-bad">
          <h4>❌ Not intended for:</h4>
          <ul>
            <li>General API communication (use JSON)</li>
            <li>Maximum compression needs (use binary formats)</li>
            <li>Simple flat data (use CSV)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function InstallationSection() {
  return (
    <div className="docs-section">
      <h1>Installation</h1>
      
      <h2>TypeScript / JavaScript</h2>
      <div className="docs-code-block">
        <div className="docs-code-header">npm / bun / yarn</div>
        <pre className="language-bash"><code>{`npm install @zoon-format/zoon
# or
bun add @zoon-format/zoon
# or
yarn add @zoon-format/zoon`}</code></pre>
      </div>
      <div className="docs-code-block">
        <div className="docs-code-header">Usage</div>
        <pre className="language-typescript"><code>{`import { encode, decode } from '@zoon-format/zoon';

const data = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' }
];

const encoded = encode(data);
console.log(encoded);
// # id:i+ name:s role=admin|user
// Alice admin
// Bob user

const decoded = decode(encoded);
// Identical to original - lossless!`}</code></pre>
      </div>

      <h2>Python</h2>
      <div className="docs-code-block">
        <div className="docs-code-header">pip / uv</div>
        <pre className="language-bash"><code>{`pip install zoon-format
# or
uv add zoon-format`}</code></pre>
      </div>
      <div className="docs-code-block">
        <div className="docs-code-header">Usage</div>
        <pre className="language-python"><code>{`import zoon

data = [
    {"id": 1, "name": "Alice", "role": "admin"},
    {"id": 2, "name": "Bob", "role": "user"}
]

encoded = zoon.encode(data)
decoded = zoon.decode(encoded)`}</code></pre>
      </div>

      <h2>Go</h2>
      <div className="docs-code-block">
        <div className="docs-code-header">go get</div>
        <pre className="language-bash"><code>{`go get github.com/zoon-format/zoon-go`}</code></pre>
      </div>
      <div className="docs-code-block">
        <div className="docs-code-header">Usage</div>
        <pre className="language-go"><code>{`import zoon "github.com/zoon-format/zoon-go"

type User struct {
    ID   int    \`zoon:"id"\`
    Name string \`zoon:"name"\`
    Role string \`zoon:"role"\`
}

users := []User{{1, "Alice", "admin"}, {2, "Bob", "user"}}
encoded, _ := zoon.Marshal(users)

var decoded []User
zoon.Unmarshal(encoded, &decoded)`}</code></pre>
      </div>

      <h2>Rust</h2>
      <div className="docs-code-block">
        <div className="docs-code-header">Cargo.toml</div>
        <pre className="language-toml"><code>{`[dependencies]
zoon = "0.1"`}</code></pre>
      </div>
      <div className="docs-code-block">
        <div className="docs-code-header">Usage</div>
        <pre className="language-rust"><code>{`use zoon::{encode, decode};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct User {
    id: i32,
    name: String,
    role: String,
}

let users = vec![
    User { id: 1, name: "Alice".into(), role: "admin".into() },
];

let encoded = encode(&users)?;
let decoded: Vec<User> = decode(&encoded)?;`}</code></pre>
      </div>
    </div>
  );
}

function ApiSection() {
  return (
    <div className="docs-section">
      <h1>API Reference</h1>

      <h2>encode(input, options?)</h2>
      <p>Encodes a JavaScript value into ZOON format string.</p>
      <div className="docs-table">
        <table>
          <thead>
            <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>input</td><td>unknown</td><td>Any JavaScript value (objects, arrays, primitives)</td></tr>
            <tr><td>options.schema</td><td>ZoonSchema</td><td>Optional custom schema</td></tr>
            <tr><td>options.inferEnums</td><td>boolean</td><td>Auto-detect enum columns (default: true)</td></tr>
            <tr><td>options.enumThreshold</td><td>number</td><td>Max unique values for enum detection (default: 10)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>decode(zoonString)</h2>
      <p>Decodes a ZOON formatted string back into JavaScript objects.</p>
      <div className="docs-table">
        <table>
          <thead>
            <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>zoonString</td><td>string</td><td>ZOON formatted string to decode</td></tr>
            <tr><td>returns</td><td>DataRow[]</td><td>Array of decoded objects</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Type Markers</h2>
      <div className="docs-table">
        <table>
          <thead>
            <tr><th>Marker</th><th>Type</th><th>Example</th></tr>
          </thead>
          <tbody>
            <tr><td>:s</td><td>String</td><td>name:s</td></tr>
            <tr><td>:i</td><td>Integer</td><td>count:i</td></tr>
            <tr><td>:i+</td><td>Auto-increment</td><td>id:i+</td></tr>
            <tr><td>:b</td><td>Boolean</td><td>active:b (values: 1/0)</td></tr>
            <tr><td>=x|y|z</td><td>Enum</td><td>status=pending|done</td></tr>
            <tr><td>:~</td><td>Null</td><td>value is ~</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExamplesSection() {
  return (
    <div className="docs-section">
      <h1>Examples</h1>

      <h2>Tabular Format (Arrays)</h2>
      <p>Best for arrays of uniform objects. Uses header-based schema with row compression.</p>
      <div className="docs-code-block">
        <pre>{`const employees = [
  { id: 1, name: 'Alice', department: 'Engineering', active: true },
  { id: 2, name: 'Bob', department: 'Engineering', active: true },
  { id: 3, name: 'Carol', department: 'Sales', active: false }
];

encode(employees);
// # id:i+ name:s department=Engineering|Sales active:b
// Alice Engineering 1
// Bob Engineering 1
// Carol Sales 0`}</pre>
      </div>

      <h2>Inline Format (Single Objects)</h2>
      <p>Best for configuration objects and nested structures.</p>
      <div className="docs-code-block">
        <pre>{`const config = {
  server: { host: 'localhost', port: 3000, ssl: true },
  database: { driver: 'postgres', host: 'db.example.com', port: 5432 }
};

encode(config);
// server:{host=localhost port:3000 ssl:y} database:{driver=postgres host=db.example.com port:5432}`}</pre>
      </div>

      <h2>Handling Nulls</h2>
      <div className="docs-code-block">
        <pre>{`const data = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: null }
];

encode(data);
// # name:s email:s
// Alice alice@example.com
// Bob ~`}</pre>
      </div>
    </div>
  );
}

function ComparisonSection() {
  return (
    <div className="docs-section">
      <h1>Format Comparison</h1>
      <p>Benchmark results from real-world LLM accuracy testing.</p>

      <div className="docs-table">
        <table>
          <thead>
            <tr><th>Format</th><th>Tokens</th><th>Accuracy</th><th>Savings vs JSON</th></tr>
          </thead>
          <tbody>
            <tr className="docs-row-winner"><td><strong>ZOON</strong></td><td>1573</td><td>100%</td><td><strong>45%</strong></td></tr>
            <tr><td>ZON</td><td>1702</td><td>100%</td><td>40%</td></tr>
            <tr><td>TOON</td><td>1706</td><td>100%</td><td>40%</td></tr>
            <tr><td>JSON</td><td>2863</td><td>100%</td><td>—</td></tr>
          </tbody>
        </table>
      </div>

      <div className="docs-alert docs-alert-info">
        Tested with Grok-4 on 75 rows across 3 datasets (employees, products, orders) with 30 questions.
      </div>

      <h2>ZOON vs Other Formats</h2>
      <div className="docs-grid">
        <div className="docs-card">
          <h4>vs JSON</h4>
          <p>45% fewer tokens. Same data model, lossless round-trips.</p>
        </div>
        <div className="docs-card">
          <h4>vs ZON</h4>
          <p>8% fewer tokens. Simpler syntax with auto-increment support.</p>
        </div>
        <div className="docs-card">
          <h4>vs TOON</h4>
          <p>8% fewer tokens. Space delimiters more efficient than pipes.</p>
        </div>
        <div className="docs-card">
          <h4>vs CSV</h4>
          <p>Supports nested objects, nulls, booleans, and type information.</p>
        </div>
      </div>
    </div>
  );
}
