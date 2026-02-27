'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownHighlight {
  text: string;
  weight?: 1 | 2 | 3;
  reason?: string;
}

interface MarkdownProps {
  content: string;
  className?: string;
  dark?: boolean;
  highlights?: MarkdownHighlight[];
  showOnlyHighlights?: boolean;
}

type NormalizedHighlight = {
  text: string;
  weight: 1 | 2 | 3;
  reason?: string;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function getWeightClass(weight: 1 | 2 | 3, dark: boolean) {
  if (dark) {
    if (weight === 3) return 'bg-yellow-300/45 text-gray-100';
    if (weight === 2) return 'bg-yellow-300/30 text-gray-100';
    return 'bg-yellow-300/20 text-gray-100';
  }

  if (weight === 3) return 'bg-yellow-200/90 text-gray-900';
  if (weight === 2) return 'bg-yellow-200/70 text-gray-900';
  return 'bg-yellow-200/55 text-gray-800';
}

function sanitizeHighlights(highlights: MarkdownHighlight[] | undefined) {
  if (!Array.isArray(highlights)) return [] as NormalizedHighlight[];
  const seen = new Set<string>();
  const result: NormalizedHighlight[] = [];

  for (const highlight of highlights) {
    const text = typeof highlight.text === 'string' ? normalizeText(highlight.text) : '';
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);

    const weight = highlight.weight === 3 ? 3 : highlight.weight === 1 ? 1 : 2;
    const reason = typeof highlight.reason === 'string' ? highlight.reason.trim() : undefined;
    result.push({ text, weight, reason });
    if (result.length >= 5) break;
  }

  return result;
}

function highlightTextNode(
  text: string,
  highlights: NormalizedHighlight[],
  dark: boolean,
  keyPrefix: string
): React.ReactNode {
  if (!text || highlights.length === 0) return text;

  const normalizedHighlights = highlights
    .map((highlight) => ({ ...highlight, normalized: normalizeText(highlight.text) }))
    .filter((highlight) => highlight.normalized.length > 0)
    .sort((a, b) => b.normalized.length - a.normalized.length);

  if (normalizedHighlights.length === 0) return text;

  const output: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let bestMatch:
      | {
          index: number;
          text: string;
          weight: 1 | 2 | 3;
          reason?: string;
        }
      | undefined;

    for (const highlight of normalizedHighlights) {
      const index = text.indexOf(highlight.text, cursor);
      if (index === -1) continue;

      if (!bestMatch || index < bestMatch.index) {
        bestMatch = {
          index,
          text: highlight.text,
          weight: highlight.weight,
          reason: highlight.reason,
        };
      }

      if (bestMatch && bestMatch.index === cursor) break;
    }

    if (!bestMatch) {
      output.push(text.slice(cursor));
      break;
    }

    if (bestMatch.index > cursor) {
      output.push(text.slice(cursor, bestMatch.index));
    }

    const highlightedText = text.slice(bestMatch.index, bestMatch.index + bestMatch.text.length);
    output.push(
      <mark
        key={`${keyPrefix}-${bestMatch.index}`}
        className={`rounded px-1 py-0.5 ${getWeightClass(bestMatch.weight, dark)}`}
        title={bestMatch.reason || '핵심 문장'}
      >
        {highlightedText}
      </mark>
    );

    cursor = bestMatch.index + bestMatch.text.length;
  }

  if (output.length === 1 && typeof output[0] === 'string') {
    return output[0];
  }

  return output;
}

function transformNode(
  node: React.ReactNode,
  highlights: NormalizedHighlight[],
  dark: boolean,
  path: string
): React.ReactNode {
  if (typeof node === 'string') {
    return highlightTextNode(node, highlights, dark, path);
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => transformNode(child, highlights, dark, `${path}-${index}`));
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<any>;
    if (typeof element.type === 'string' && (element.type === 'code' || element.type === 'pre')) {
      return element;
    }

    const children = transformNode(element.props.children, highlights, dark, `${path}-c`);
    return React.cloneElement(element, { ...element.props, children });
  }

  return node;
}

export default function Markdown({
  content,
  className = '',
  dark = false,
  highlights,
  showOnlyHighlights = false,
}: MarkdownProps) {
  const safeHighlights = sanitizeHighlights(highlights);

  const colors = dark
    ? {
        heading: 'text-white',
        text: 'text-gray-200',
        strong: 'text-white',
        code: 'bg-gray-700 text-yellow-300',
        pre: 'bg-gray-950 text-gray-100',
        blockquote: 'border-blue-400 bg-blue-900/30 text-gray-300',
        link: 'text-blue-400 hover:text-blue-300',
        table: 'border-gray-600',
        th: 'bg-gray-700 border-gray-600 text-gray-200',
        td: 'border-gray-600 text-gray-300',
      }
    : {
        heading: 'text-gray-900',
        text: 'text-gray-700',
        strong: 'text-gray-900',
        code: 'bg-gray-100 text-red-600',
        pre: 'bg-gray-900 text-gray-100',
        blockquote: 'border-blue-500 bg-blue-50 text-gray-700',
        link: 'text-blue-600 hover:text-blue-800',
        table: 'border-gray-300',
        th: 'bg-gray-100 border-gray-300 text-gray-900',
        td: 'border-gray-300 text-gray-700',
      };

  if (showOnlyHighlights) {
    return (
      <div className={`space-y-2 ${className}`}>
        {safeHighlights.length > 0 ? (
          safeHighlights.map((highlight, index) => (
            <div
              key={`${highlight.text}-${index}`}
              className={`rounded-lg px-3 py-2 leading-relaxed ${getWeightClass(highlight.weight, dark)}`}
            >
              <div>{highlight.text}</div>
              {highlight.reason && (
                <div className={`mt-1 text-xs ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{highlight.reason}</div>
              )}
            </div>
          ))
        ) : (
          <div className={`rounded-lg border px-3 py-2 text-sm ${dark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-500'}`}>
            추출된 핵심 문장이 없습니다. 원문 보기로 확인해주세요.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`markdown-content ${dark ? 'dark-math' : ''} ${className}`}>
      <style jsx global>{`
        .dark-math .katex { color: #e5e7eb; }
        .katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.5rem 0; }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className={`text-xl font-bold mt-4 mb-2 ${colors.heading}`}>{children}</h1>,
          h2: ({ children }) => <h2 className={`text-lg font-bold mt-4 mb-2 ${colors.heading}`}>{children}</h2>,
          h3: ({ children }) => <h3 className={`text-base font-bold mt-3 mb-2 ${colors.heading}`}>{children}</h3>,
          h4: ({ children }) => <h4 className={`text-sm font-bold mt-3 mb-1 ${colors.heading}`}>{children}</h4>,
          p: ({ children }) => (
            <p className={`my-2 leading-relaxed ${colors.text}`}>
              {transformNode(children, safeHighlights, dark, 'p')}
            </p>
          ),
          ul: ({ children }) => <ul className={`list-disc list-inside my-2 space-y-1 ${colors.text}`}>{children}</ul>,
          ol: ({ children }) => <ol className={`list-decimal list-inside my-2 space-y-1 ${colors.text}`}>{children}</ol>,
          li: ({ children }) => <li className="ml-2">{transformNode(children, safeHighlights, dark, 'li')}</li>,
          strong: ({ children }) => <strong className={`font-bold ${colors.strong}`}>{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ className: codeClassName, children }) => {
            const isInline = !codeClassName;
            return isInline ? (
              <code className={`${colors.code} px-1.5 py-0.5 rounded text-sm font-mono`}>{children}</code>
            ) : (
              <code className={`${codeClassName} block`}>{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className={`${colors.pre} p-4 rounded-lg overflow-x-auto my-3 text-sm`}>{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className={`border-l-4 ${colors.blockquote} py-2 px-4 my-3 italic`}>
              {transformNode(children, safeHighlights, dark, 'quote')}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} className={`${colors.link} underline`} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className={`min-w-full border-collapse border ${colors.table} text-sm`}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className={`border-b ${colors.table}`}>{children}</tr>,
          th: ({ children }) => <th className={`border ${colors.th} px-3 py-2 text-left font-semibold`}>{children}</th>,
          td: ({ children }) => <td className={`border ${colors.td} px-3 py-2`}>{children}</td>,
          hr: () => <hr className={`my-4 ${dark ? 'border-gray-600' : 'border-gray-300'}`} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
