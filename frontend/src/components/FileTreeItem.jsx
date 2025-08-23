import React, { useState, memo } from 'react';
import { File, Folder, ChevronDown, ChevronRight } from 'lucide-react';

const FileTreeItem = memo(({ name, item, path, onFileSelect }) => {
    // Always start with folders open for better UX
    const [isOpen, setIsOpen] = useState(true);
    
    // Remove unused forceUpdate state - this should be in the parent component
    // const [forceUpdate, setForceUpdate] = useState(0);
    
    // Fix directory detection - check both directory property and structure
    const isDirectory = Boolean(item && item.directory);
    const isFile = Boolean(item && item.file);
    
    // Add more detailed logging to help debug
    console.log(`Rendering FileTreeItem: ${name}, isDir: ${isDirectory}, isFile: ${isFile}, path: ${path}`, 
                item ? JSON.stringify(item, null, 2) : 'null');
    
    const toggleOpen = () => {
        if (isDirectory) {
            setIsOpen(!isOpen);
        }
    };
    
    const handleSelect = () => {
        if (isFile && item.file) {
            onFileSelect(path, item.file.contents || '');
        }
    };
    
    return (
        <div className="file-tree-item">
            <div 
                className={`flex items-center gap-1 p-1 hover:bg-slate-200 rounded cursor-pointer ${
                    isDirectory ? 'text-blue-600' : 'text-slate-700'
                }`}
                onClick={isDirectory ? toggleOpen : handleSelect}
            >
                {isDirectory && (
                    <span className="mr-1">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                )}
                {isDirectory ? (
                    <Folder size={16} className="text-blue-500" />
                ) : (
                    <File size={16} className="text-gray-500 ml-4" />
                )}
                <span className="text-sm ml-1">{name}</span>
            </div>
            
            {isDirectory && isOpen && item.directory && (
                <div className="ml-4 border-l border-slate-200">
                    {Object.entries(item.directory || {}).map(([childName, childItem]) => (
                        <FileTreeItem 
                            key={childName}
                            name={childName}
                            item={childItem}
                            path={`${path}/${childName}`}
                            onFileSelect={onFileSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export default FileTreeItem;