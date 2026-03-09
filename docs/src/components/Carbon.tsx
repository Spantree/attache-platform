import React from 'react';

const langMap: Record<string, string> = {
  json: 'application/json',
  yaml: 'text/x-yaml',
  yml: 'text/x-yaml',
  bash: 'application/x-sh',
  shell: 'application/x-sh',
  sh: 'application/x-sh',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'application/typescript',
  ts: 'application/typescript',
  python: 'python',
  py: 'python',
  markdown: 'text/x-markdown',
  md: 'text/x-markdown',
  text: 'text',
  '': 'text',
};

interface CarbonProps {
  children: string;
  lang?: string;
  title?: string;
}

export default function Carbon({ children, lang = 'text', title }: CarbonProps) {
  const code = typeof children === 'string' ? children.trim() : String(children).trim();
  const carbonLang = langMap[lang] || 'text';
  const lineCount = code.split('\n').length;
  const height = Math.max(150, Math.min(600, lineCount * 24 + 80));

  const params = new URLSearchParams({
    bg: 'rgba(0,0,0,0)', t: 'dracula', wt: 'none', l: carbonLang,
    width: '680', ds: 'false', dsyoff: '0px', dsblur: '0px',
    wc: 'true', wa: 'false', pv: '0px', ph: '0px', ln: 'false',
    fl: '1', fm: 'Fira Code', fs: '14px', lh: '150%',
    si: 'false', es: '2x', wm: 'false', code: code,
  });

  const url = `https://carbon.now.sh/embed?${params.toString()}`;

  return (
    <iframe
      src={url}
      title={title || 'Code snippet'}
      style={{ width: '100%', height: `${height}px`, border: 0, overflow: 'hidden' }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
