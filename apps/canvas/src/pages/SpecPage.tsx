import React from 'react';
import '../spec.css';

const SPEC_SECTIONS = [
  {
    id: 'intro',
    title: '1. Introduction',
    content: (
      <>
        <p>
          Zero Overhead Object Notation (ZOON) is a token-optimized text format designed to minimize token consumption when transmitting structured data to Large Language Models (LLMs). ZOON achieves 40-60% token reduction compared to JSON by eliminating redundant syntax and using compact type markers.
        </p>
        <h4>Design Goals</h4>
        <ul>
          <li><strong>Minimize Token Count</strong>: Reduce context window consumption</li>
          <li><strong>Maintain Readability</strong>: Human-readable structure</li>
          <li><strong>Preserve Fidelity</strong>: Lossless round-trip with JSON</li>
          <li><strong>Support Nesting</strong>: Handle tables and nested objects</li>
        </ul>
      </>
    )
  },
  {
    id: 'terminology',
    title: '2. Terminology',
    content: (
      <>
        <ul>
          <li><strong>ZOON Document</strong>: A UTF-8 text string formatted according to this specification</li>
          <li><strong>Header</strong>: The first line of a Tabular format document, starting with <code>#</code></li>
          <li><strong>Body</strong>: All lines following the header containing data values</li>
          <li><strong>Row</strong>: A single line of space-delimited values in Tabular format</li>
          <li><strong>Primitive</strong>: A string, number, boolean, or null value</li>
          <li><strong>Object</strong>: An unordered collection of key-value pairs</li>
        </ul>
      </>
    )
  },
  {
    id: 'data-model',
    title: '3. Data Model',
    content: (
      <>
        <p>ZOON represents the JSON data model exactly (objects, arrays, strings, numbers, booleans, null).</p>
        <div className="spec-section">
          <h4>Numbers</h4>
          <ul>
            <li>Encoders MUST emit numbers without exponential notation</li>
            <li>No leading zeros except for 0.x decimals</li>
            <li>-0 normalizes to 0</li>
          </ul>
        </div>
        <div className="spec-section">
          <h4>Special Values</h4>
          <ul>
            <li>NaN, Infinity, undefined MUST be encoded as null</li>
          </ul>
        </div>
      </>
    )
  },
  {
    id: 'tabular',
    title: '4. Tabular Format',
    content: (
      <>
        <p>Used for arrays of uniform objects. The first row defines keys and types.</p>
        <pre className="code-block">{`# <field>:<type> <field>:<type> ...
<value> <value> ...
<value> <value> ...`}</pre>
        <h4>Example</h4>
        <pre className="code-block">{`# id:i+ name:s role=Admin|User active:b
Alice Admin 1
Bob User 0`}</pre>
      </>
    )
  },
  {
    id: 'indexed-enums',
    title: '5. Indexed Enums',
    content: (
      <>
        <p>When enum values are long or numerous, using numeric indices instead of literal values saves significant tokens.</p>
        <h4>Syntax</h4>
        <pre className="code-block">{`# field!option0|option1|option2
0
1
2`}</pre>
        <p>The <code>!</code> separator (instead of <code>=</code>) indicates that data rows use 0-based numeric indices.</p>
        <h4>Example</h4>
        <pre className="code-block">{`# role!user|assistant
0
1
0`}</pre>
        <p>This encodes <code>["user", "assistant", "user"]</code> using just the indices 0, 1, 0.</p>
      </>
    )
  },
  {
    id: 'aliases',
    title: '6. Header Aliases',
    content: (
      <>
        <p>For deeply nested objects, repeated path prefixes can be aliased to reduce tokens.</p>
        <pre className="code-block">{`%sp=services.postgres %sr=services.redis
# replica:s %sp.status:s %sp.ms:i %sr.status:s %sr.ms:i
gateway-1 up 167 up 203
gateway-2 up 1837 up 1819`}</pre>
      </>
    )
  },
  {
    id: 'hoisting',
    title: '7. Constant Value Hoisting',
    content: (
      <>
        <p>Fields with identical values across all rows can be hoisted to the header to avoid repetition.</p>
        <pre className="code-block">{`# @status=healthy @timestamp=2025-12-28 replica:s response_ms:i
gateway-1 167
gateway-2 1837`}</pre>
      </>
    )
  },
  {
    id: 'inline',
    title: '8. Inline Format',
    content: (
      <>
        <p>Encodes single objects with nested properties using space-separated key-value pairs.</p>
        <pre className="code-block">{`key:value key=string key:{nested}`}</pre>
        <h4>Nesting</h4>
        <pre className="code-block">{`server:{host=localhost port:3000 ssl:y} database:{driver=postgres}`}</pre>
      </>
    )
  },
  {
    id: 'types',
    title: '9. Type System',
    content: (
      <table className="spec-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>s</td><td>String</td><td>Text value, spaces replaced with _</td></tr>
          <tr><td>i</td><td>Integer</td><td>Whole number</td></tr>
          <tr><td>b</td><td>Boolean</td><td>1/0 (tabular) or y/n (inline)</td></tr>
          <tr><td>e</td><td>Enum</td><td>Defined via name=val1|val2, encoded as literal value</td></tr>
          <tr><td>i+</td><td>Auto-Inc</td><td>Sequential ID starting at 1, omitted from body</td></tr>
          <tr><td>a</td><td>Array</td><td>Encoded as [val1,val2,...]</td></tr>
        </tbody>
      </table>
    )
  },
  {
    id: 'encoding',
    title: '10. Encoding Rules',
    content: (
      <ul>
        <li><strong>Format Selection:</strong> Tabular for uniform arrays, Inline otherwise.</li>
        <li><strong>Enum Detection:</strong> Encoders SHOULD detect enums for low-cardinality strings.</li>
        <li><strong>Whitespace:</strong> No trailing spaces. Lines terminated with LF.</li>
        <li><strong>Key Ordering:</strong> Object keys MUST be emitted in encounter order.</li>
      </ul>
    )
  },
  {
    id: 'decoding',
    title: '11. Decoding Rules',
    content: (
      <>
        <h4>11.1 Format Detection</h4>
        <ul>
          <li>If first line starts with <code>#</code> → Tabular Format</li>
          <li>Otherwise → Inline Format</li>
        </ul>
        <h4>11.2 Token Parsing</h4>
        <ul>
          <li><code>true</code>/<code>false</code> (or <code>1</code>/<code>0</code> in typed cols) → boolean</li>
          <li><code>y</code>/<code>n</code> → boolean (inline)</li>
          <li><code>~</code> → null</li>
          <li>Numeric pattern → number</li>
          <li>Everything else → string (spaces restored)</li>
        </ul>
      </>
    )
  },
  {
    id: 'conformance',
    title: '12. Conformance',
    content: (
      <>
        <p>Conformant encoders MUST produce valid UTF-8, use LF, and preserve order. Decoders MUST accept both formats and handle all type markers.</p>
      </>
    )
  },
  {
    id: 'security',
    title: '13. Security Considerations',
    content: (
      <ul>
        <li>String escaping rules prevent injection attacks</li>
        <li>Encoders SHOULD limit input size</li>
        <li>Decoders SHOULD validate structure before processing</li>
      </ul>
    )
  },
  {
    id: 'comparison',
    title: '14. Comparison with Other Formats',
    content: (
      <table className="spec-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>JSON</th>
            <th>ZOON</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Key repetition</td><td>Every object</td><td>Once in header</td></tr>
          <tr><td>Boolean tokens</td><td>true/false (4-5 chars)</td><td>1/0 (1 char)</td></tr>
          <tr><td>Auto-increment</td><td>Explicit</td><td>Implicit i+</td></tr>
          <tr><td>Type Safety</td><td>None</td><td>Header schema</td></tr>
        </tbody>
      </table>
    )
  },
  {
    id: 'iana',
    title: '14. IANA Considerations',
    content: (
      <ul>
        <li><strong>Type name:</strong> text</li>
        <li><strong>Subtype name:</strong> ZOON (provisional)</li>
        <li><strong>File extension:</strong> .ZOON</li>
        <li><strong>MIME type:</strong> text/ZOON</li>
      </ul>
    )
  },
  {
    id: 'reference',
    title: '15. Reference Implementations',
    content: (
      <>
        <ul>
          <li><code>@zoon-format/zoon</code>: Core TypeScript library (<a href="https://npmjs.com/package/@zoon-format/zoon" target="_blank" rel="noopener">npm</a>)</li>
          <li><code>@zoon-format/cli</code>: Command-line interface</li>
          <li><code>zoon-format</code>: Python bindings (<a href="https://pypi.org/project/zoon-format/" target="_blank" rel="noopener">PyPI</a>)</li>
          <li><code>zoon-go</code>: Go bindings (<a href="https://github.com/zoon-format/zoon-go" target="_blank" rel="noopener">GitHub</a>)</li>
          <li><code>zoon-rust</code>: Rust bindings (<a href="https://crates.io/crates/zoon-format" target="_blank" rel="noopener">crates.io</a>)</li>
        </ul>
      </>
    )
  },
  {
    id: 'appendix',
    title: 'Appendix A: Examples',
    content: (
      <>
        <h4>A.1 Tabular Array</h4>
        <pre className="code-block">{`# id:i+ name:s role=Admin|User active:b
Alice Admin 1
Bob User 1
Carol User 0`}</pre>
        <h4>A.2 Nested Object</h4>
        <pre className="code-block">{`server:{host=localhost port:3000 ssl:y} database:{driver=postgres}`}</pre>
      </>
    )
  }
];

export function SpecPage() {
  return (
    <main className="section">
      <div className="spec-container glass-panel">
        <h2 className="spec-title">ZOON Specification</h2>
        <p className="spec-subtitle">Version 1.0 (Stable) · 2025-12-27</p>

        <div className="spec-toc">
          <h4>Table of Contents</h4>
          <ul>
            {SPEC_SECTIONS.map(s => (
              <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>
            ))}
          </ul>
        </div>

        {SPEC_SECTIONS.map(section => (
          <div key={section.id} id={section.id} className="spec-section">
            <h3>{section.title}</h3>
            {section.content}
          </div>
        ))}
      </div>
    </main>
  );
}
