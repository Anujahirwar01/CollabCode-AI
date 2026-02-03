import React, { useState, memo } from 'react';
import { File, Folder, ChevronDown, ChevronRight } from 'lucide-react';

const FileTreeItem = memo(({ name, item, path, onFileSelect, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);

    const isDirectory = Boolean(item && item.directory);
    const isFile = Boolean(item && item.file);

    const toggleOpen = (e) => {
        e.stopPropagation();
        if (isDirectory) {
            setIsOpen(!isOpen);
        }
    };

    const handleSelect = (e) => {
        e.stopPropagation();
        if (isFile && item.file) {
            onFileSelect(path, item.file.contents || '');
        }
    };

    const indentStyle = {
        paddingLeft: `${level * 12 + 8}px`
    };

    return (
        <div className="file-tree-item">
            <div
                className={`flex items-center gap-1 py-1 px-2 hover:bg-slate-200 rounded cursor-pointer text-sm ${isDirectory ? 'text-blue-600 font-medium' : 'text-slate-700'
                    }`}
                style={indentStyle}
                onClick={isDirectory ? toggleOpen : handleSelect}
                title={isDirectory ? `Folder: ${name}` : `File: ${name}`}
            >
                {isDirectory && (
                    <span className="flex-shrink-0 mr-1">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                )}
                {isDirectory ? (
                    <Folder size={16} className="text-blue-500 flex-shrink-0" />
                ) : (
                    <File size={16} className="text-gray-500 flex-shrink-0" style={{ marginLeft: isDirectory ? 0 : '20px' }} />
                )}
                <span className="ml-1 truncate">{name}</span>
            </div>

            {isDirectory && isOpen && item.directory && (
                <div className="ml-2">
                    {Object.entries(item.directory || {}).map(([childName, childItem]) => (
                        <FileTreeItem
                            key={childName}
                            name={childName}
                            item={childItem}
                            path={path ? `${path}/${childName}` : childName}
                            onFileSelect={onFileSelect}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export default FileTreeItem;