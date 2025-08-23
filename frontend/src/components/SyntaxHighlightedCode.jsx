import React, { memo, useEffect, useRef } from 'react';
import hljs from 'highlight.js';

const SyntaxHighlightedCode = memo(({ language, code }) => {
    const codeRef = useRef(null);

    useEffect(() => {
        if (codeRef.current) {
            hljs.highlightElement(codeRef.current);
        }
    }, [code, language]);

    return (
        <pre className="font-mono text-sm whitespace-pre">
            <code 
                ref={codeRef} 
                className={language ? `language-${language}` : ''}
            >
                {code || ''}
            </code>
        </pre>
    );
});

export default SyntaxHighlightedCode;