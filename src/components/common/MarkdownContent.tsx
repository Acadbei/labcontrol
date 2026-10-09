'use client';

import React from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * MarkdownContent parser:
 * 1. Outputs structured Markdown (headings, lists, code, bold, links, dividers).
 * 2. Formats bold terms (**matn**) cleanly as <strong> without raw asterisks.
 * 3. Strictly bans italic (*matn* or _matn_) - strips italic syntax completely.
 * 4. Never displays asterisk characters (*) as literal/raw text in the interface.
 * 5. High-contrast colors: bold text is pitch-black in light mode, crisp white in dark mode.
 */
export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';

  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let bqBuffer: string[] = [];

  const flushBq = (keyPrefix: string) => {
    if (bqBuffer.length === 0) return;
    const currentBq = [...bqBuffer];
    bqBuffer = [];
    elements.push(
      <div
        key={`${keyPrefix}-bq`}
        className="my-3 border-l-4 border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/40 p-3 sm:p-3.5 rounded-r-2xl space-y-1.5 shadow-sm border border-cyan-200/80 dark:border-cyan-800/40 border-l-cyan-500 dark:border-l-cyan-400"
      >
        {currentBq.map((bql, bidx) => (
          <div key={bidx} className="leading-relaxed text-xs sm:text-sm text-slate-800 dark:text-slate-200">
            {renderInline(bql)}
          </div>
        ))}
      </div>
    );
  };

  const flushList = (keyPrefix: string) => {
    if (!listBuffer || listBuffer.items.length === 0) {
      listBuffer = null;
      return;
    }
    const currentList = listBuffer;
    listBuffer = null;

    if (currentList.type === 'ul') {
      elements.push(
        <ul key={`${keyPrefix}-ul`} className="my-1.5 space-y-1 list-none pl-0">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
              <span className="text-cyan-400 dark:text-cyan-400 font-bold mt-0.5 flex-shrink-0 select-none">•</span>
              <div className="flex-1 leading-relaxed">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`${keyPrefix}-ol`} className="my-1.5 space-y-1 list-none pl-0">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
              <span className="font-mono text-cyan-500 dark:text-cyan-400 font-bold text-[11px] sm:text-xs mt-0.5 flex-shrink-0 select-none">
                {idx + 1}.
              </span>
              <div className="flex-1 leading-relaxed">{renderInline(item)}</div>
            </li>
          ))}
        </ol>
      );
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Check for fenced code block toggle
    if (rawLine.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <div key={`code-${i}`} className="my-2.5 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            {codeLanguage && (
              <div className="px-3 py-1 bg-slate-900/90 border-b border-slate-800/80 text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                {codeLanguage}
              </div>
            )}
            <pre className="p-3 text-[11px] sm:text-xs font-mono text-cyan-300 dark:text-cyan-300 overflow-x-auto whitespace-pre">
              {codeBuffer.join('\n')}
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
        codeLanguage = '';
      } else {
        flushList(`flush-${i}`);
        inCodeBlock = true;
        codeLanguage = rawLine.trim().replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    const trimmed = rawLine.trim();

    // Blockquote: > text
    if (trimmed.startsWith('>')) {
      flushList(`flush-${i}`);
      const bqText = trimmed.replace(/^>\s?/, '');
      bqBuffer.push(bqText);
      continue;
    }

    // Any other line flushes blockquote
    flushBq(`flush-${i}`);

    // Empty line
    if (!trimmed) {
      flushList(`flush-${i}`);
      // Add subtle spacing between paragraphs
      if (elements.length > 0) {
        elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      }
      continue;
    }

    // Horizontal Rule (--- or *** or ___)
    if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
      flushList(`flush-${i}`);
      elements.push(<hr key={`hr-${i}`} className="my-2.5 border-slate-800 dark:border-slate-800" />);
      continue;
    }

    // Headings: ###, ##, #
    const h3Match = trimmed.match(/^###\s+(.*)/);
    if (h3Match) {
      flushList(`flush-${i}`);
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs sm:text-sm font-extrabold text-cyan-600 dark:text-cyan-400 mt-2.5 mb-1 tracking-wide flex items-center gap-1.5">
          {renderInline(h3Match[1])}
        </h4>
      );
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.*)/);
    if (h2Match) {
      flushList(`flush-${i}`);
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm sm:text-base font-extrabold text-cyan-600 dark:text-cyan-400 mt-3 mb-1.5 tracking-wide flex items-center gap-1.5">
          {renderInline(h2Match[1])}
        </h3>
      );
      continue;
    }

    const h1Match = trimmed.match(/^#\s+(.*)/);
    if (h1Match) {
      flushList(`flush-${i}`);
      elements.push(
        <h2 key={`h1-${i}`} className="text-base sm:text-lg font-extrabold text-cyan-600 dark:text-cyan-400 mt-3.5 mb-2 tracking-wide flex items-center gap-1.5">
          {renderInline(h1Match[1])}
        </h2>
      );
      continue;
    }

    // Unordered List Items: - item, * item, • item, + item
    const ulMatch = trimmed.match(/^[-*•+]\s+(.*)/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList(`flush-${i}`);
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(ulMatch[1]);
      continue;
    }

    // Ordered List Items: 1. item, 2. item
    const olMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList(`flush-${i}`);
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(olMatch[1]);
      continue;
    }

    // Normal paragraph line
    flushList(`flush-${i}`);
    elements.push(
      <p key={`p-${i}`} className="my-1 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-200">
        {renderInline(rawLine)}
      </p>
    );
  }

  // Flush remaining buffers if any
  flushBq('final');
  flushList('final');

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
}

/**
 * Inline markdown parser:
 * - Parses `inline code`
 * - Parses **bold text** into <strong className="font-extrabold text-slate-950 dark:text-white">
 * - Strictly strips *italic* markers without italicizing
 * - Completely strips any raw asterisk '*' characters
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return '';

  // Step 1: Normalize text to remove italic syntax (*word* or _word_) while preserving bold (**word**)
  // Replace triple asterisks (***text***) with double asterisks (**text**)
  let clean = text.replace(/\*\*\*([^*]+?)\*\*\*/g, '**$1**');

  // Strip single asterisks intended for italics: *text* -> text
  // Match single asterisk not followed or preceded by another asterisk
  clean = clean.replace(/(^|[^*])\*([^*\n]+?)\*([^*]|$)/g, '$1$2$3');

  // Step 2: Split by inline code blocks (`code`)
  const codeParts = clean.split(/(`[^`]+?`)/g);

  return codeParts.map((codeSegment, idx) => {
    if (codeSegment.startsWith('`') && codeSegment.endsWith('`') && codeSegment.length > 2) {
      const codeText = codeSegment.slice(1, -1);
      return (
        <code
          key={`code-inline-${idx}`}
          className="px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-950 font-mono text-[11px] text-cyan-600 dark:text-cyan-300 border border-slate-700/60 font-medium"
        >
          {codeText}
        </code>
      );
    }

    // Step 3: Parse **bold text**
    const boldParts = codeSegment.split(/(\*\*[^*]+?\*\*)/g);

    return (
      <React.Fragment key={`text-frag-${idx}`}>
        {boldParts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            const boldInner = part.slice(2, -2).replace(/\*/g, '').trim();
            return (
              <strong
                key={`bold-${pIdx}`}
                className="font-extrabold text-slate-900 dark:text-slate-200 transition-colors"
              >
                {boldInner}
              </strong>
            );
          }

          // Strip any residual raw asterisk symbols so no literal '*' ever shows up
          const stripped = part.replace(/\*/g, '');
          return <span key={`plain-${pIdx}`}>{stripped}</span>;
        })}
      </React.Fragment>
    );
  });
}
