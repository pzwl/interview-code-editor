import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { useSocket } from '../contexts/SocketContext';
import { 
  Play, 
  Square, 
  X, 
  Plus, 
  Trash2, 
  Copy, 
  Settings,
  Clock,
  CheckCircle,
  XCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import './CodeRunner.css';

function CodeRunner({ initialCode = '', onClose, sessionId }) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState('javascript');
  const [testCases, setTestCases] = useState([
    { id: 1, input: '', expectedOutput: '', actualOutput: '', status: 'pending' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResults, setExecutionResults] = useState([]);
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  
  const { emitCodeUpdate, emitTestCaseUpdate, emitCodeExecutionResult } = useSocket();

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleCodeChange = (value) => {
    setCode(value || '');
    // Emit code update for real-time collaboration
    emitCodeUpdate(value || '', language);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    emitCodeUpdate(code, newLanguage);
  };

  const addTestCase = () => {
    const newTestCase = {
      id: Date.now(),
      input: '',
      expectedOutput: '',
      actualOutput: '',
      status: 'pending'
    };
    const updatedTestCases = [...testCases, newTestCase];
    setTestCases(updatedTestCases);
    emitTestCaseUpdate(updatedTestCases);
  };

  const removeTestCase = (id) => {
    if (testCases.length > 1) {
      const updatedTestCases = testCases.filter(tc => tc.id !== id);
      setTestCases(updatedTestCases);
      emitTestCaseUpdate(updatedTestCases);
      
      if (selectedTestCase >= updatedTestCases.length) {
        setSelectedTestCase(updatedTestCases.length - 1);
      }
    }
  };

  const updateTestCase = (id, field, value) => {
    const updatedTestCases = testCases.map(tc => 
      tc.id === id ? { ...tc, [field]: value } : tc
    );
    setTestCases(updatedTestCases);
    emitTestCaseUpdate(updatedTestCases);
  };

  const executeCode = async (testCaseIndex = null) => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsRunning(true);
    
    try {
      const casesToRun = testCaseIndex !== null ? [testCases[testCaseIndex]] : testCases;
      const results = [];

      for (const testCase of casesToRun) {
        try {
          const response = await fetch('/api/execute-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              language,
              input: testCase.input,
              sessionId
            }),
          });

          if (!response.ok) {
            throw new Error('Execution failed');
          }

          const result = await response.json();
          
          const testResult = {
            ...testCase,
            actualOutput: result.output || result.error || '',
            status: result.success ? 'passed' : 'failed',
            executionTime: result.executionTime,
            error: result.error
          };

          results.push(testResult);
          
          // Update test case status
          updateTestCase(testCase.id, 'actualOutput', testResult.actualOutput);
          updateTestCase(testCase.id, 'status', testResult.status);

        } catch (error) {
          const testResult = {
            ...testCase,
            actualOutput: '',
            status: 'error',
            error: error.message
          };
          results.push(testResult);
          
          updateTestCase(testCase.id, 'status', 'error');
        }
      }

      setExecutionResults(results);
      
      // Emit execution results for collaboration
      emitCodeExecutionResult({
        code,
        language,
        results,
        timestamp: new Date()
      });

      toast.success('Code executed successfully');
      
    } catch (error) {
      console.error('Execution error:', error);
      toast.error('Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
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
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
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
              onChange={(e) => handleLanguageChange(e.target.value)}
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
          <button
            onClick={copyCode}
            className="action-btn"
            title="Copy Code"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => executeCode()}
            disabled={isRunning}
            className="run-btn"
            title="Run All Tests"
          >
            {isRunning ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? 'Running...' : 'Run'}
          </button>
          
          <button
            onClick={onClose}
            className="close-btn"
            title="Close Code Runner"
          >
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
          <button
            onClick={addTestCase}
            className="add-test-btn"
            title="Add Test Case"
          >
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
                  onClick={(e) => {
                    e.stopPropagation();
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
                onChange={(e) => updateTestCase(currentTestCase.id, 'input', e.target.value)}
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
                  <div className="no-output">
                    No output yet. Click "Run This Test" to execute.
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