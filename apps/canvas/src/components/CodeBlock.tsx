import { useEffect, useRef } from 'react';
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

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language = 'text', title }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <div className="code-block">
      {title && <div className="code-block-header">{title}</div>}
      <pre className={`language-${language}`}>
        <code ref={codeRef} className={`language-${language}`}>
          {code.trim()}
        </code>
      </pre>
    </div>
  );
}

export function detectLanguage(code: string): string {
  if (code.includes('import ') && (code.includes(' from ') || code.includes('{'))) {
    if (code.includes(': ') && (code.includes('string') || code.includes('number') || code.includes('<'))) {
      return 'typescript';
    }
    return 'javascript';
  }
  if (code.includes('def ') || code.includes('import zoon') || code.includes('python')) {
    return 'python';
  }
  if (code.includes('func ') || code.includes('package ') || code.includes('zoon.Marshal')) {
    return 'go';
  }
  if (code.includes('fn ') || code.includes('use ') || code.includes('let ') && code.includes('->')) {
    return 'rust';
  }
  if (code.startsWith('npm ') || code.startsWith('bun ') || code.startsWith('pip ') || code.startsWith('cargo ') || code.startsWith('go ')) {
    return 'bash';
  }
  if (code.startsWith('{') && code.includes('"')) {
    return 'json';
  }
  if (code.startsWith('#') && code.includes(':')) {
    return 'text';
  }
  return 'text';
}
