import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { useSocket } from '../contexts/SocketContext';
import { useSession } from '../contexts/SessionContext';
import {
  Play,
  Square,
  X,
  Plus,
  Trash2,
  Copy,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import './CodeRunner.css';

const createDefaultTestCase = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  input: '',
  expectedOutput: '',
  actualOutput: '',
  status: 'pending',
  error: '',
  executionTime: null
});

const normaliseTestCases = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return [createDefaultTestCase()];
  }

  return value.map((testCase) => ({
    ...createDefaultTestCase(),
    ...testCase,
    id: testCase.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: testCase.status || 'pending'
  }));
};

const getLanguageConfig = (lang) => {
  const configs = {
    javascript: { monaco: 'javascript', name: 'JavaScript' },
    python: { monaco: 'python', name: 'Python' },
    java: { monaco: 'java', name: 'Java' },
    cpp: { monaco: 'cpp', name: 'C++' }
  };

  return configs[lang] || configs.javascript;
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'passed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

function CodeRunner({ codeState, onClose, sessionId }) {
  const { emitCodeUpdate, emitTestCaseUpdate, emitCodeExecutionResult } = useSocket();
  const { updateCodeState } = useSession();

  const [code, setCode] = useState(codeState?.code || '');
  const [language, setLanguage] = useState(codeState?.language || 'javascript');
  const [testCases, setTestCases] = useState(normaliseTestCases(codeState?.testCases));
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const [executionResults, setExecutionResults] = useState(Array.isArray(codeState?.executionResults) ? codeState.executionResults : []);
  const [lastExecutedAt, setLastExecutedAt] = useState(codeState?.lastExecutedAt || null);

  const testCaseSignatureRef = useRef(JSON.stringify(testCases));

  useEffect(() => {
    if (!codeState) {
      return;
    }

    if (codeState.code !== undefined && codeState.code !== code) {
      setCode(codeState.code);
    }

    if (codeState.language && codeState.language !== language) {
      setLanguage(codeState.language);
    }

    if (Array.isArray(codeState.testCases)) {
      const incoming = normaliseTestCases(codeState.testCases);
      const signature = JSON.stringify(incoming);
      if (signature !== testCaseSignatureRef.current) {
        testCaseSignatureRef.current = signature;
        setTestCases(incoming);
        setSelectedTestCase((prev) => Math.min(incoming.length - 1, Math.max(prev, 0)));
      }
    }
  }, [codeState, code, language]);
  useEffect(() => {
    if (Array.isArray(codeState?.executionResults)) {
      setExecutionResults(codeState.executionResults);
    }
    if (codeState?.lastExecutedAt) {
      setLastExecutedAt(codeState.lastExecutedAt);
    }
  }, [codeState?.executionResults, codeState?.lastExecutedAt]);

  const syncCodeState = (partial) => {
    updateCodeState(partial);
  };
  const formatRelativeTime = useCallback((timestamp) => {
    if (!timestamp) {
      return '';
    }

    const runDate = new Date(timestamp);
    if (Number.isNaN(runDate.getTime())) {
      return '';
    }

    const diff = Date.now() - runDate.getTime();
    if (diff < 60000) {
      return 'just now';
    }
    if (diff < 3600000) {
      const mins = Math.round(diff / 60000);
      return `${mins} min${mins === 1 ? '' : 's'} ago`;
    }
    if (diff < 86400000) {
      const hours = Math.round(diff / 3600000);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    return runDate.toLocaleString();
  }, []);

  const handleCodeChange = (value) => {
    const next = value || '';
    setCode(next);
    syncCodeState({ code: next });
    emitCodeUpdate(next, language);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    syncCodeState({ language: newLanguage });
    emitCodeUpdate(code, newLanguage);
  };

  const pushTestCases = (nextCases) => {
    setTestCases(nextCases);
    testCaseSignatureRef.current = JSON.stringify(nextCases);
    syncCodeState({ testCases: nextCases });
    emitTestCaseUpdate(nextCases);
  };

  const addTestCase = () => {
    const nextCases = [...testCases, createDefaultTestCase()];
    pushTestCases(nextCases);
    setSelectedTestCase(nextCases.length - 1);
  };

  const removeTestCase = (id) => {
    if (testCases.length <= 1) {
      toast.error('At least one test case is required');
      return;
    }

    const nextCases = testCases.filter((testCase) => testCase.id !== id);
    pushTestCases(nextCases);
    setSelectedTestCase((prev) => Math.max(0, Math.min(prev, nextCases.length - 1)));
  };

  const updateTestCaseField = (id, field, value) => {
    const nextCases = testCases.map((testCase) =>
      testCase.id === id ? { ...testCase, [field]: value } : testCase
    );
    pushTestCases(nextCases);
  };

  const executeCode = async (testCaseIndex = null) => {
    if (!code.trim()) {
      toast.error('Please write some code before running tests');
      return;
    }

    setIsRunning(true);

    try {
      const casesToRun = testCaseIndex !== null ? [testCases[testCaseIndex]] : testCases;
      const updatedCases = [...testCases];
      const results = [];

      for (const currentCase of casesToRun) {
        const targetIndex = updatedCases.findIndex((item) => item.id === currentCase.id);
        const requestBody = {
          code,
          language,
          input: currentCase.input || '',
          sessionId
        };

        try {
          const response = await fetch('/api/execute-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            throw new Error('Execution failed');
          }

          const payload = await response.json();
          const status = payload.success ? 'passed' : 'failed';

          const hydrated = {
            ...currentCase,
            actualOutput: payload.output || payload.error || '',
            status,
            executionTime: payload.executionTime || null,
            error: payload.success ? '' : payload.error || 'Execution error'
          };

          if (targetIndex !== -1) {
            updatedCases[targetIndex] = hydrated;
          }

          results.push({
            id: hydrated.id,
            status: hydrated.status,
            executionTime: hydrated.executionTime,
            error: hydrated.error
          });
        } catch (runError) {
          const hydrated = {
            ...currentCase,
            actualOutput: runError.message,
            status: 'error',
            executionTime: null,
            error: runError.message
          };

          if (targetIndex !== -1) {
            updatedCases[targetIndex] = hydrated;
          }

          results.push({
            id: hydrated.id,
            status: hydrated.status,
            executionTime: hydrated.executionTime,
            error: hydrated.error
          });
        }
      }

      pushTestCases(updatedCases);

      const executionSummary = {
        results,
        language,
        sessionId,
        ranAt: new Date().toISOString()
      };

      syncCodeState({ executionResults: results, lastExecutedAt: executionSummary.ranAt });
      emitCodeExecutionResult(executionSummary);
      setExecutionResults(results);
      setLastExecutedAt(executionSummary.ranAt);

      toast.success('Finished running tests');
    } catch (error) {
      toast.error(error.message || 'Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const currentTestCase = testCases[selectedTestCase];

  return (
    <div className="code-runner">
      <div className="code-runner-header">
        <div className="header-left">
          <h3>Code Runner</h3>
          <div className="language-selector">
            <select
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value)}
              className="language-select"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={copyCode} className="action-btn" title="Copy Code">
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => executeCode()}
            disabled={isRunning}
            className="run-btn"
            title="Run All Tests"
          >
            {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Running...' : 'Run'}
          </button>

          <button onClick={onClose} className="close-btn" title="Close Code Runner">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="code-editor-section">
        <Editor
          height="300px"
          language={getLanguageConfig(language).monaco}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on'
          }}
        />
      </div>

      <div className="test-cases-section">
        <div className="test-cases-header">
          <h4>Test Cases</h4>
          <button onClick={addTestCase} className="add-test-btn" title="Add Test Case">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="test-cases-tabs">
          {testCases.map((testCase, index) => (
            <div
              key={testCase.id}
              className={`test-case-tab ${selectedTestCase === index ? 'active' : ''}`}
              onClick={() => setSelectedTestCase(index)}
            >
              {getStatusIcon(testCase.status)}
              <span>Test {index + 1}</span>
              {testCases.length > 1 && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    removeTestCase(testCase.id);
                  }}
                  className="remove-test-btn"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {currentTestCase && (
          <div className="test-case-details">
            <div className="test-input">
              <label>Input:</label>
              <textarea
                value={currentTestCase.input}
                onChange={(event) => updateTestCaseField(currentTestCase.id, 'input', event.target.value)}
                placeholder="Enter test input here..."
                rows={3}
              />
            </div>

            <div className="test-output">
              <div className="output-header">
                <label>Output:</label>
                <button
                  onClick={() => executeCode(selectedTestCase)}
                  disabled={isRunning}
                  className="run-single-btn"
                >
                  {isRunning ? 'Running...' : 'Run This Test'}
                </button>
              </div>

              <div className="output-content">
                {currentTestCase.actualOutput ? (
                  <pre className={`output ${currentTestCase.status}`}>
                    {currentTestCase.actualOutput}
                  </pre>
                ) : (
                  <div className="no-output">No output yet. Click "Run This Test" to execute.</div>
                )}
        {executionResults.length > 0 && (
          <div className="run-summary">
            <div className="run-summary-header">
              <h4>Latest Run</h4>
              {lastExecutedAt && (
                <span className="run-summary-timestamp">{formatRelativeTime(lastExecutedAt)}</span>
              )}
            </div>

            <div className="run-summary-grid">
              {executionResults.map((result, index) => (
                <div
                  key={result.id || index}
                  className={`run-summary-card ${result.status || 'pending'}`}
                >
                  <div className="run-summary-title">Test {index + 1}</div>
                  <div className="run-summary-status">{result.status ? result.status.charAt(0).toUpperCase() + result.status.slice(1) : 'Pending'}</div>
                  {typeof result.executionTime === 'number' && (
                    <div className="run-summary-time">{result.executionTime} ms</div>
                  )}
                  {result.error && (
                    <div className="run-summary-error">{result.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

              </div>

              {currentTestCase.error && (
                <div className="error-output">
                  <strong>Error:</strong>
                  <pre>{currentTestCase.error}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeRunner;







