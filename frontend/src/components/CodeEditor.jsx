import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play,
    Save,
    Download,
    Terminal,
    FileText,
    Settings,
    Sparkles,
    Bug
} from 'lucide-react';
import axios from '../config/axios';

const CodeEditor = ({
    currentFilePath,
    currentFileContent,
    onCodeChange,
    onSaveFile,
    webContainer,
    onRunProject
}) => {
    const [code, setCode] = useState(currentFileContent || '');
    const [output, setOutput] = useState('');
    const [showOutput, setShowOutput] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [fontSize, setFontSize] = useState(14);
    const [showSettings, setShowSettings] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    const textareaRef = useRef(null);
    const outputRef = useRef(null);

    // Update code when file changes
    useEffect(() => {
        setCode(currentFileContent || '');
    }, [currentFileContent, currentFilePath]);

    // Generate line numbers
    const lines = code.split('\n');
    const lineNumbers = lines.map((_, index) => index + 1);

    // Handle code changes with proper formatting
    const handleCodeChange = useCallback((e) => {
        const newCode = e.target.value;
        setCode(newCode);
        onCodeChange && onCodeChange(currentFilePath, newCode);
    }, [currentFilePath, onCodeChange]);

    // Handle key down events for better editing
    const handleKeyDown = (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            handleSave();
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const spaces = '  '; // 2 spaces for indentation

            if (start === end) {
                // Simple tab insertion
                const newValue = code.substring(0, start) + spaces + code.substring(end);
                setCode(newValue);
                onCodeChange && onCodeChange(currentFilePath, newValue);
                setTimeout(() => {
                    e.target.selectionStart = e.target.selectionEnd = start + spaces.length;
                }, 0);
            } else {
                // Multi-line indentation
                const selectedText = code.substring(start, end);
                const lines = selectedText.split('\n');
                const indentedLines = e.shiftKey
                    ? lines.map(line => line.startsWith('  ') ? line.substring(2) : line)
                    : lines.map(line => spaces + line);
                const newSelectedText = indentedLines.join('\n');
                const newValue = code.substring(0, start) + newSelectedText + code.substring(end);
                setCode(newValue);
                onCodeChange && onCodeChange(currentFilePath, newValue);
            }
        }

        if (e.key === 'Enter') {
            // Auto-indentation
            const textarea = e.target;
            const start = textarea.selectionStart;
            const lineStart = code.lastIndexOf('\n', start - 1) + 1;
            const currentLine = code.substring(lineStart, start);
            const indent = currentLine.match(/^\s*/)[0];

            // Add extra indent for opening braces
            const extraIndent = currentLine.trim().endsWith('{') ? '  ' : '';

            setTimeout(() => {
                const newIndent = '\n' + indent + extraIndent;
                const newStart = start + newIndent.length;
                const newValue = code.substring(0, start) + newIndent + code.substring(start);
                setCode(newValue);
                onCodeChange && onCodeChange(currentFilePath, newValue);
                textarea.selectionStart = textarea.selectionEnd = newStart;
            }, 0);
        }
    };

    // Save file
    const handleSave = useCallback(() => {
        if (currentFilePath) {
            onSaveFile && onSaveFile(currentFilePath);
            setOutput(prev => prev + `\n✅ Saved ${currentFilePath}`);
        }
    }, [currentFilePath, onSaveFile]);

    // Download file
    const handleDownload = useCallback(() => {
        if (!currentFilePath || !code) return;

        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFilePath.split('/').pop();
        a.click();
        URL.revokeObjectURL(url);
    }, [currentFilePath, code]);

    // Get file language
    const getLanguage = useCallback(() => {
        if (!currentFilePath) return 'text';
        const ext = currentFilePath.split('.').pop()?.toLowerCase();
        const langMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown'
        };
        return langMap[ext] || 'text';
    }, [currentFilePath]);

    // Execute code with better handling
    const executeCode = async () => {
        if (!webContainer) {
            setOutput('❌ WebContainer not available');
            setShowOutput(true);
            return;
        }

        setIsExecuting(true);
        setOutput(`🚀 Executing ${currentFilePath}...\n`);
        setShowOutput(true);

        try {
            // Save file first
            if (onSaveFile) {
                onSaveFile(currentFilePath, code);
                await new Promise(resolve => setTimeout(resolve, 300)); // Wait for save
            }

            const language = getLanguage();
            let command, args;

            if (language === 'python') {
                command = 'python';
                args = [currentFilePath];
            } else if (language === 'javascript') {
                command = 'node';
                args = [currentFilePath];
            } else if (language === 'html') {
                // For HTML, just indicate it's ready to preview
                setOutput('📄 HTML file saved. Open in browser to view.');
                setIsExecuting(false);
                return;
            } else if (language === 'css') {
                setOutput('🎨 CSS file saved. Link it to an HTML file to see styles.');
                setIsExecuting(false);
                return;
            } else if (language === 'json') {
                // Validate JSON
                try {
                    JSON.parse(code);
                    setOutput('✅ Valid JSON format');
                } catch (error) {
                    setOutput(`❌ JSON Error: ${error.message}`);
                }
                setIsExecuting(false);
                return;
            } else {
                setOutput(`❌ File type '${language}' is not executable`);
                setIsExecuting(false);
                return;
            }

            // Create and run the process
            const process = await webContainer.spawn(command, args);

            let outputText = '';
            let errorText = '';

            // Handle stdout
            const reader = process.output.getReader();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = new TextDecoder().decode(value);
                    outputText += text;
                    setOutput(prev => prev + text);

                    // Auto-scroll output
                    if (outputRef.current) {
                        outputRef.current.scrollTop = outputRef.current.scrollHeight;
                    }
                }
            } finally {
                reader.releaseLock();
            }

            const exitCode = await process.exit;

            if (exitCode === 0) {
                setOutput(prev => prev + '\n✅ Execution completed successfully');
            } else {
                setOutput(prev => prev + `\n❌ Process exited with code ${exitCode}`);
            }

        } catch (error) {
            console.error('Execution error:', error);
            setOutput(prev => prev + `\n❌ Error: ${error.message}`);
        } finally {
            setIsExecuting(false);
        }
    };

    // AI assistance
    const getAiHelp = async () => {
        if (!aiPrompt.trim()) return;

        setAiLoading(true);
        try {
            const response = await axios.post('/ai/help', {
                code: code,
                prompt: aiPrompt,
                language: getLanguage()
            });

            setOutput(prev => prev + `\n🤖 AI: ${response.data.response}\n`);
            setAiPrompt('');
        } catch (error) {
            setOutput(prev => prev + `\n❌ AI Error: ${error.message}\n`);
        } finally {
            setAiLoading(false);
        }
    };

    // Debug code
    const debugCode = async () => {
        setAiLoading(true);
        try {
            const response = await axios.post('/ai/debug', {
                code: code,
                language: getLanguage()
            });

            setOutput(prev => prev + `\n🐛 Debug: ${response.data.response}\n`);
            setShowOutput(true);
        } catch (error) {
            setOutput(prev => prev + `\n❌ Debug Error: ${error.message}\n`);
        } finally {
            setAiLoading(false);
        }
    };

    if (!currentFilePath) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] text-gray-400">
                <div className="text-center">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Choose a file to begin editing</p>
                    <p className="text-sm mt-2">Select a file from the explorer or create a new one</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-[#1e1e1e] text-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-[#2d2d30] border-b border-[#3e3e42]">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        title="Save (Ctrl+S)"
                    >
                        <Save size={14} />
                        Save
                    </button>

                    <button
                        onClick={executeCode}
                        disabled={isExecuting}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-sm"
                        title="Run Code"
                    >
                        <Play size={14} />
                        {isExecuting ? 'Running...' : 'Run'}
                    </button>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                        title="Download File"
                    >
                        <Download size={14} />
                        Download
                    </button>

                    <button
                        onClick={() => setShowOutput(!showOutput)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                        title="Toggle Output"
                    >
                        <Terminal size={14} />
                        Output
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={debugCode}
                        disabled={aiLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded text-sm"
                        title="Debug Code"
                    >
                        <Bug size={14} />
                        Debug
                    </button>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-1 px-2 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                        title="Settings"
                    >
                        <Settings size={14} />
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="p-3 bg-[#252526] border-b border-[#3e3e42]">
                    <div className="flex items-center gap-4">
                        <label className="text-sm">
                            Font Size:
                            <input
                                type="range"
                                min="10"
                                max="24"
                                value={fontSize}
                                onChange={(e) => setFontSize(e.target.value)}
                                className="ml-2 w-20"
                            />
                            <span className="ml-2">{fontSize}px</span>
                        </label>
                    </div>
                </div>
            )}

            {/* Main Editor Area */}
            <div className="flex-1 flex">
                {/* Code Editor */}
                <div className="flex-1 flex flex-col">
                    <div className="p-3 bg-[#252526] border-b border-[#3e3e42] text-sm text-gray-300">
                        <span className="font-mono">{currentFilePath}</span>
                        <span className="ml-4 text-blue-400">{getLanguage()}</span>
                    </div>

                    <div className="flex-1 relative flex">
                        {/* Line Numbers */}
                        <div className="w-12 bg-[#1e1e1e] border-r border-[#3e3e42] p-4 pt-4 text-right text-gray-500 font-mono text-sm select-none"
                            style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}>
                            {lineNumbers.map(num => (
                                <div key={num} className="leading-6">
                                    {num}
                                </div>
                            ))}
                        </div>

                        {/* Code Input */}
                        <textarea
                            ref={textareaRef}
                            value={code}
                            onChange={handleCodeChange}
                            onKeyDown={handleKeyDown}
                            className="flex-1 p-4 bg-[#1e1e1e] text-white font-mono resize-none outline-none leading-6"
                            style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}
                            placeholder="Start typing your code here..."
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Output Panel */}
                {showOutput && (
                    <div className="w-1/3 flex flex-col border-l border-[#3e3e42]">
                        <div className="flex items-center justify-between p-3 bg-[#2d2d30] border-b border-[#3e3e42]">
                            <h3 className="text-sm font-semibold">Output</h3>
                            <button
                                onClick={() => setOutput('')}
                                className="text-xs text-gray-400 hover:text-white"
                            >
                                Clear
                            </button>
                        </div>
                        <div
                            ref={outputRef}
                            className="flex-1 p-3 bg-[#1e1e1e] text-green-400 font-mono text-sm overflow-y-auto"
                            style={{ whiteSpace: 'pre-wrap' }}
                        >
                            {output || 'No output yet. Run your code to see results.'}
                        </div>

                        {/* AI Assistance */}
                        <div className="p-3 border-t border-[#3e3e42]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Ask AI for help..."
                                    className="flex-1 px-2 py-1 bg-[#3c3c3c] text-white rounded text-sm"
                                    onKeyPress={(e) => e.key === 'Enter' && getAiHelp()}
                                />
                                <button
                                    onClick={getAiHelp}
                                    disabled={aiLoading}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-sm"
                                >
                                    <Sparkles size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeEditor;