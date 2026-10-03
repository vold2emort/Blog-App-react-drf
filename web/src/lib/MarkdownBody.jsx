import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

/**
 * Post bodies and comments are user-supplied Markdown. rehype-sanitize strips
 * raw HTML, so a post can never smuggle a script tag through.
 */
export default function MarkdownBody({ children, className = "prose" }) {
  return (
    <div className={className}>
      <Markdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer noopener" />
          ),
          // The post title is the page's only <h1>, so body headings start one
          // level below it instead of producing a second <h1>.
          h1: ({ node, ...props }) => <h2 {...props} />,
          h2: ({ node, ...props }) => <h3 {...props} />,
          h3: ({ node, ...props }) => <h4 {...props} />,
          h4: ({ node, ...props }) => <h5 {...props} />,
          h5: ({ node, ...props }) => <h6 {...props} />,
        }}
      >
        {children ?? ""}
      </Markdown>
    </div>
  );
}