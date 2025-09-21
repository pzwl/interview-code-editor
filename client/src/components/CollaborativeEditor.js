import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useSession } from '../contexts/SessionContext';
import { Code2, Type, Undo, Redo, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import './CollaborativeEditor.css';

const calculateLineAndColumn = (text = '', position = 0) => {
  const clamped = Math.max(0, Math.min(typeof position === 'number' ? position : 0, text.length));
  const preceding = text.slice(0, clamped).replace(/\r/g, '');
  const lines = preceding.split('\n');
  const line = lines.length;
  const column = (lines[lines.length - 1] || '').length + 1;
  return { line, column };
};

const hexToRgba = (hex, alpha = 1) => {
  if (!hex) {
    return `rgba(99, 102, 241, ${alpha})`;
  }

  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) {
    return `rgba(99, 102, 241, ${alpha})`;
  }

  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const roleAccentMap = {
  interviewer: '#2563eb',
  candidate: '#9333ea',
  observer: '#0ea5e9'
};

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
  const [editorMetrics, setEditorMetrics] = useState({
    lineHeight: 24,
    charWidth: 8,
    paddingTop: 0,
    paddingLeft: 0
  });

  const {
    emitDocumentOperation,
    emitCursorPosition,
    emitTextSelected,
    emitConvertToCode,
    peerCursors
  } = useSocket();
  const { sessionState, updateDocument, userId } = useSession();

  const measureEditorMetrics = useCallback(() => {
    if (!textareaRef.current) {
      return;
    }

    const textarea = textareaRef.current;
    const styles = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.4 || 24;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;

    const measureSpan = document.createElement('span');
    measureSpan.textContent = 'M';
    measureSpan.style.position = 'absolute';
    measureSpan.style.visibility = 'hidden';
    measureSpan.style.whiteSpace = 'pre';
    measureSpan.style.fontFamily = styles.fontFamily;
    measureSpan.style.fontSize = styles.fontSize;
    measureSpan.style.fontWeight = styles.fontWeight;
    document.body.appendChild(measureSpan);
    const charWidth = measureSpan.getBoundingClientRect().width || lineHeight * 0.6;
    document.body.removeChild(measureSpan);

    setEditorMetrics({
      lineHeight,
      charWidth,
      paddingTop,
      paddingLeft
    });
  }, []);

  const positionToIndices = useCallback((position = 0) => {
    const clamped = Math.max(0, Math.min(typeof position === 'number' ? position : 0, localContent.length));
    const preceding = localContent.slice(0, clamped);
    const parts = preceding.split(/\r?\n/);
    return {
      lineIndex: Math.max(0, parts.length - 1),
      columnIndex: (parts[parts.length - 1] || '').length
    };
  }, [localContent]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    measureEditorMetrics();
    const handleResize = () => measureEditorMetrics();
    window.addEventListener('resize', handleResize);

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => measureEditorMetrics());
      observer.observe(textareaRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [measureEditorMetrics]);

  // Update local content when session content changes
  useEffect(() => {
    if (!isComposing) {
      const nextContent = typeof content === 'string' ? content : '';
      setLocalContent(nextContent);
    }
  }, [content, isComposing]);

  // Save current state to undo stack
  const saveToUndoStack = useCallback((text) => {
    setUndoStack((prev) => [...prev.slice(-19), text]);
    setRedoStack([]);
  }, []);

  const handleTextChange = (event) => {
    const newValue = event.target.value;
    const oldValue = localContent;

    if (!isComposing) {
      saveToUndoStack(oldValue);
    }

    setLocalContent(newValue);
    updateDocument({ content: newValue });

    if (!isComposing) {
      const cursorStart = event.target.selectionStart;
      const cursorEnd = event.target.selectionEnd;
      setSelection({ start: cursorStart, end: cursorEnd });
      emitCursorPosition(cursorStart, { start: cursorStart, end: cursorEnd });
      emitTextSelected('', cursorStart, cursorEnd);
    }

    if (!isComposing) {
      emitDocumentOperation({
        type: 'insert',
        position: event.target.selectionStart,
        content: newValue,
        length: newValue.length - oldValue.length
      });
    }
  };

  const handleSelectionChange = () => {
    if (!textareaRef.current) {
      return;
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    setSelection({ start, end });

    emitCursorPosition(start, { start, end });

    if (start !== end) {
      const selected = localContent.substring(start, end);
      onTextSelection(selected, { start, end });
      emitTextSelected(selected, start, end);
    } else {
      onTextSelection('', { start, end });
      emitTextSelected('', start, end);
    }
  };

  const handleContextMenu = (event) => {
    event.preventDefault();

    const start = textareaRef.current?.selectionStart ?? 0;
    const end = textareaRef.current?.selectionEnd ?? 0;
    if (start !== end) {
      setShowContextMenu(true);
      setContextMenuPos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleConvertToCode = (language = 'javascript') => {
    const rawSelection = localContent.substring(selection.start, selection.end);

    if (rawSelection.trim()) {
      emitConvertToCode(rawSelection, language);
      onConvertToCode({ language, code: rawSelection });
      setShowContextMenu(false);
    } else {
      toast.error('Please select some text first');
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) {
      return;
    }

    const previousState = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [localContent, ...prev]);
    setUndoStack((prev) => prev.slice(0, -1));
    setLocalContent(previousState);
    updateDocument({ content: previousState });

    emitDocumentOperation({
      type: 'insert',
      position: 0,
      content: previousState,
      length: previousState.length - localContent.length
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) {
      return;
    }

    const nextState = redoStack[0];
    setUndoStack((prev) => [...prev, localContent]);
    setRedoStack((prev) => prev.slice(1));
    setLocalContent(nextState);
    updateDocument({ content: nextState });

    emitDocumentOperation({
      type: 'insert',
      position: 0,
      content: nextState,
      length: nextState.length - localContent.length
    });
  };

  const handleExport = () => {
    const blob = new Blob([localContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `interview-notes-${new Date().toISOString().split('T')[0]}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Notes exported successfully');
  };

  const handleKeyDown = (event) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'z':
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        break;
      case 'y':
        event.preventDefault();
        handleRedo();
        break;
      case 's':
        event.preventDefault();
        handleExport();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const remotePresence = useMemo(() => {
    if (!peerCursors || !textareaRef.current) {
      return [];
    }

    const now = Date.now();

    return Object.entries(peerCursors)
      .filter(([id]) => id !== userId)
      .map(([id, cursor]) => {
        if (!cursor || (cursor.updatedAt && now - cursor.updatedAt > 15000)) {
          return null;
        }

        const participant = sessionState.users.find((user) => user.id === id);
        const role = participant?.role || 'observer';
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        const accent = roleAccentMap[role] || '#6366f1';
        const accentTint = hexToRgba(accent, 0.18);
        const chipColor = hexToRgba(accent, 0.75);

        const caretPosition = typeof cursor.selection?.end === 'number'
          ? cursor.selection.end
          : cursor.position ?? 0;

        const caretIndices = positionToIndices(caretPosition);
        const { line, column } = calculateLineAndColumn(localContent, caretPosition);

        const caretStyle = {
          top: editorMetrics.paddingTop + caretIndices.lineIndex * editorMetrics.lineHeight,
          left: editorMetrics.paddingLeft + caretIndices.columnIndex * editorMetrics.charWidth,
          '--caret-accent': accent,
          '--caret-accent-tint': accentTint,
          '--caret-height': `${editorMetrics.lineHeight}px`
        };

        let selectionLength = 0;
        let highlightStyle = null;

        const selectionStart = typeof cursor.selection?.start === 'number' ? cursor.selection.start : null;
        const selectionEnd = typeof cursor.selection?.end === 'number' ? cursor.selection.end : null;

        if (selectionStart !== null && selectionEnd !== null && selectionEnd > selectionStart) {
          selectionLength = selectionEnd - selectionStart;
          const startIndices = positionToIndices(selectionStart);
          const endIndices = positionToIndices(selectionEnd);

          if (startIndices.lineIndex === endIndices.lineIndex) {
            highlightStyle = {
              top: editorMetrics.paddingTop + startIndices.lineIndex * editorMetrics.lineHeight + editorMetrics.lineHeight * 0.2,
              left: editorMetrics.paddingLeft + startIndices.columnIndex * editorMetrics.charWidth,
              width: Math.max(editorMetrics.charWidth, (endIndices.columnIndex - startIndices.columnIndex) * editorMetrics.charWidth),
              height: editorMetrics.lineHeight * 0.6,
              '--caret-accent': accent,
              '--caret-accent-tint': accentTint
            };
          }
        }

        return {
          id,
          roleLabel,
          accent,
          accentTint,
          chipColor,
          line,
          column,
          selectionLength,
          isSelecting: selectionLength > 0,
          caretStyle,
          highlightStyle
        };
      })
      .filter(Boolean);
  }, [peerCursors, userId, sessionState.users, positionToIndices, editorMetrics]);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' }
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
        <div className="remote-decorations">
          {remotePresence.map((presence) => (
            <React.Fragment key={presence.id}>
              {presence.highlightStyle && (
                <div
                  className="remote-highlight"
                  style={presence.highlightStyle}
                />
              )}
              <div className="remote-caret" style={presence.caretStyle}>
                <span className="remote-caret-label">{presence.roleLabel}</span>
                <span className="remote-caret-bar" />
              </div>
            </React.Fragment>
          ))}
        </div>

        {remotePresence.length > 0 && (
          <div className="cursor-indicators">
            {remotePresence.map((presence) => (
              <div
                key={presence.id}
                className="cursor-indicator"
                style={{ backgroundColor: presence.chipColor, borderColor: presence.accentTint }}
              >
                <span className="cursor-role">{presence.roleLabel}</span>
                <span className="cursor-location">line {presence.line}, col {presence.column}</span>
                {presence.isSelecting && (
                  <span className="cursor-selection">selecting {presence.selectionLength} chars</span>
                )}
              </div>
            ))}
          </div>
        )}

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
          spellCheck={false}
        />

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

        {selectedText && (
          <div className="selection-indicator">
            Selected: {selectedText.length} characters
          </div>
        )}
      </div>

      <div className="editor-footer">
        <div className="editor-stats">
          <span>Characters: {localContent.length}</span>
          <span>Lines: {localContent.split(/\r?\n/).length}</span>
        </div>

        {sessionState.users.length > 1 && (
          <div className="collaboration-indicator">
            <div className="active-users">
              {sessionState.users.filter((user) => user.active).length} active users
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollaborativeEditor;





