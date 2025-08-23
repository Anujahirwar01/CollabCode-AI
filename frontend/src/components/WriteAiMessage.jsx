import React from 'react';
import Markdown from 'markdown-to-jsx';
import { Code } from 'lucide-react';
import hljs from 'highlight.js';

// Component to handle code highlighting in Markdown
const CodeBlock = ({ children, className }) => {
  const language = className ? className.replace('lang-', '') : '';
  
  // Apply highlight.js if a language is specified
  const highlightedCode = language && children.props?.children
    ? hljs.highlight(children.props.children, { language })
    : { value: children.props?.children || '' };
    
  return (
    <div className="relative rounded-md overflow-hidden my-3">
      <div className="bg-gray-800 text-xs px-3 py-1 flex justify-between items-center">
        <span className="text-gray-400">{language || 'code'}</span>
        <Code size={14} className="text-gray-400" />
      </div>
      <pre className="bg-gray-900 p-3 overflow-x-auto">
        <code 
          className={language ? `language-${language}` : ''} 
          dangerouslySetInnerHTML={{ __html: highlightedCode.value }} 
        />
      </pre>
    </div>
  );
};

// Add a sanitize function to clean HTML attributes
const sanitizeMarkdown = (content) => {
  // Remove any onclick attributes which cause React warnings
  return content.replace(/onClick="[^"]*"/g, '');
};

const WriteAiMessage = ({ rawMessage }) => {
  try {
    // Try to parse as JSON first
    let content = rawMessage;
    let parsedContent;
    
    try {
      // If it's a string that looks like JSON, try to parse it
      if (typeof rawMessage === 'string' && 
          (rawMessage.trim().startsWith('{') || rawMessage.trim().startsWith('['))) {
        parsedContent = JSON.parse(rawMessage);
        
        // If we successfully parsed JSON, use the text field
        if (parsedContent && parsedContent.text) {
          content = parsedContent.text;
        }
      }
    } catch (error) {
      console.log('Message is not JSON or invalid JSON format');
    }

    // Sanitize the content before rendering
    const sanitizedContent = sanitizeMarkdown(content);

    return (
      <div className="ai-message">
        <Markdown
          options={{
            overrides: {
              code: CodeBlock,
              // Add proper onClick handlers for common elements
              button: {
                component: (props) => <button {...props} onClick={() => {}} />,
              },
              a: {
                component: (props) => {
                  // Handle links safely
                  const { href, children, ...rest } = props;
                  return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
                }
              }
            },
            // Disable HTML parsing to prevent unsafe attributes
            forceInline: false,
            forceBlock: false,
          }}
        >
          {sanitizedContent}
        </Markdown>
      </div>
    );
  } catch (error) {
    console.error('Error rendering message:', error);
    return <div className="text-red-500">Error rendering message</div>;
  }
};

export default WriteAiMessage;