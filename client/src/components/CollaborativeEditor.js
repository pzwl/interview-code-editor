import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useSession } from '../contexts/SessionContext';
import { Code2, Type, Undo, Redo, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import './CollaborativeEditor.css';

function CollaborativeEditor({ 
  content, 
  onTextSelection, 
  onConvertToCode,
  selectedText,
  selectionRange 
}) {
  const textareaRef = useRef(null);
  const [localContent, setLocalContent] = useState(content || '');
  const [isComposing, setIsComposing] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  
  const { emitDocumentOperation, emitCursorPosition } = useSocket();
  const { sessionState } = useSession();

  // Update local content when session content changes
  useEffect(() => {
    if (content !== localContent && !isComposing) {
      setLocalContent(content);
    }
  }, [content, localContent, isComposing]);

  // Save current state to undo stack
  const saveToUndoStack = useCallback((text) => {
    setUndoStack(prev => [...prev.slice(-19), text]); // Keep last 20 states
    setRedoStack([]); // Clear redo stack when new change is made
  }, []);

  const handleTextChange = (e) => {
    const newContent = e.target.value;
    const oldContent = localContent;
    
    if (!isComposing) {
      saveToUndoStack(oldContent);
    }
    
    setLocalContent(newContent);

    // Emit document operation for real-time collaboration
    if (!isComposing) {
      const operation = {
        type: 'insert',
        position: e.target.selectionStart,
        content: newContent,
        length: newContent.length - oldContent.length
      };
      
      emitDocumentOperation(operation);
    }
  };

  const handleSelectionChange = () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    setSelection({ start, end });
    
    // Emit cursor position for collaboration
    emitCursorPosition(start, { start, end });
    
    // Update selected text if there's a selection
    if (start !== end) {
      const selected = localContent.substring(start, end);
      onTextSelection(selected, { start, end });
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    if (start !== end) {
      setShowContextMenu(true);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleConvertToCode = (language = 'javascript') => {
    if (selectedText.trim()) {
      onConvertToCode(language);
      setShowContextMenu(false);
    } else {
      toast.error('Please select some text first');
    }
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const prevState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [localContent, ...prev]);
      setUndoStack(prev => prev.slice(0, -1));
      setLocalContent(prevState);
      
      // Emit the undo operation
      emitDocumentOperation({
        type: 'undo',
        content: prevState
      });
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setUndoStack(prev => [...prev, localContent]);
      setRedoStack(prev => prev.slice(1));
      setLocalContent(nextState);
      
      // Emit the redo operation
      emitDocumentOperation({
        type: 'redo',
        content: nextState
      });
    }
  };

  const handleExport = () => {
    const blob = new Blob([localContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-notes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Notes exported successfully');
  };

  const handleKeyDown = (e) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
          break;
        case 'y':
          e.preventDefault();
          handleRedo();
          break;
        case 's':
          e.preventDefault();
          handleExport();
          break;
        default:
          break;
      }
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
  ];

  return (
    <div className="collaborative-editor">
      <div className="editor-header">
        <div className="editor-title">
          <Type className="w-5 h-5" />
          <h3>Collaborative Notes</h3>
        </div>
        
        <div className="editor-actions">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="action-button"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="action-button"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleExport}
            className="action-button"
            title="Export Notes (Ctrl+S)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="editor-container">
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={handleTextChange}
          onSelect={handleSelectionChange}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="Start typing your interview notes here... You can select text and right-click to convert it to code."
          className="editor-textarea"
        />

        {/* Context Menu */}
        {showContextMenu && (
          <div 
            className="context-menu"
            style={{ 
              left: contextMenuPos.x, 
              top: contextMenuPos.y,
              position: 'fixed'
            }}
          >
            <div className="context-menu-header">
              <Code2 className="w-4 h-4" />
              <span>Convert to Code</span>
            </div>
            
            {languages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => handleConvertToCode(lang.value)}
                className="context-menu-item"
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}

        {/* Selection indicator */}
        {selectedText && (
          <div className="selection-indicator">
            Selected: {selectedText.length} characters
          </div>
        )}
      </div>

      <div className="editor-footer">
        <div className="editor-stats">
          <span>Characters: {localContent.length}</span>
          <span>Lines: {localContent.split('\n').length}</span>
          <span>Words: {localContent.split(/\s+/).filter(word => word.length > 0).length}</span>
        </div>
        
        {sessionState.users.length > 1 && (
          <div className="collaboration-indicator">
            <div className="active-users">
              {sessionState.users.filter(user => user.active).length} active users
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollaborativeEditor;