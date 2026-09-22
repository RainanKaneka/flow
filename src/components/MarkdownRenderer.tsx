'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUser = false }) => {
  // Remove blocos de ação técnica da IA que são renderizados em cards dedicados
  const cleanContent = isUser ? content : content.replace(/```flow-action[\s\S]*?```/g, '').trim();

  if (isUser) {
    return <span>{content}</span>;
  }

  return (
    <div
      className="markdown-content"
      style={{
        fontSize: '0.92rem',
        lineHeight: '1.65',
        color: 'var(--text-primary)',
        wordBreak: 'break-word',
      }}
    >
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                marginTop: '12px',
                marginBottom: '6px',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                marginTop: '10px',
                marginBottom: '5px',
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              style={{
                fontSize: '0.96rem',
                fontWeight: 600,
                marginTop: '8px',
                marginBottom: '4px',
                color: 'var(--text-primary)',
              }}
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p
              style={{
                margin: '0 0 8px 0',
                lineHeight: '1.6',
              }}
              {...props}
            />
          ),
          strong: ({ node, ...props }) => (
            <strong
              style={{
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul
              style={{
                paddingLeft: '20px',
                margin: '6px 0 10px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              style={{
                paddingLeft: '20px',
                margin: '6px 0 10px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li
              style={{
                lineHeight: '1.5',
              }}
              {...props}
            />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const isInline = !className && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    color: '#818cf8',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontSize: '0.85em',
                    fontFamily: 'monospace',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  overflowX: 'auto',
                  fontSize: '0.84rem',
                  fontFamily: 'monospace',
                  margin: '8px 0',
                }}
              >
                <code {...props}>{children}</code>
              </pre>
            );
          },
          blockquote: ({ node, ...props }) => (
            <blockquote
              style={{
                borderLeft: '3px solid var(--accent-primary)',
                paddingLeft: '12px',
                margin: '8px 0',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
              }}
              {...props}
            />
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};
