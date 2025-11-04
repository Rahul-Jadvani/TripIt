import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
        // Customize link rendering to open in new tab
        a: ({ node, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
        ),
        // Customize code blocks
        code: ({ node, inline, className, children, ...props }: any) => {
          return inline ? (
            <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
              {children}
            </code>
          ) : (
            <code className={`block bg-muted p-2 rounded my-2 overflow-x-auto ${className}`} {...props}>
              {children}
            </code>
          );
        },
        // Customize blockquote
        blockquote: ({ node, ...props }) => (
          <blockquote className="border-l-4 border-primary pl-4 italic my-2" {...props} />
        ),
        // Customize lists
        ul: ({ node, ...props }) => <ul className="list-disc list-inside my-2" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-2" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
