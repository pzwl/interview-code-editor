import React, { createContext, useContext, useReducer } from 'react';

const SessionContext = createContext();

const createDefaultSessionState = () => ({
  document: {
    content: '',
    version: 0,
    operations: []
  },
  codeState: {
    selectedText: '',
    language: 'javascript',
    code: '',
    testCases: [],
    executionResults: [],
    lastExecutedAt: null
  },
  users: []
});

const createInitialState = () => ({
  sessionId: null,
  userId: null,
  userRole: null,
  isConnected: false,
  isLoading: false,
  error: null,
  sessionState: createDefaultSessionState()
});

const initialState = createInitialState();

const mergeSessionState = (current, incoming) => {
  if (!incoming) {
    return current;
  }

  return {
    ...current,
    ...incoming,
    document: {
      ...current.document,
      ...(incoming.document || {})
    },
    codeState: {
      ...current.codeState,
      ...(incoming.codeState || {})
    },
    users: Array.isArray(incoming.users) ? incoming.users : current.users
  };
};

function sessionReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'CREATE_SESSION_SUCCESS':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        userId: action.payload.userId ?? state.userId,
        userRole: action.payload.userRole ?? state.userRole,
        sessionState: mergeSessionState(state.sessionState, action.payload.sessionState),
        isLoading: false,
        error: null
      };

    case 'JOIN_SESSION_SUCCESS':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        userId: action.payload.userId,
        userRole: action.payload.userRole,
        sessionState: mergeSessionState(state.sessionState, action.payload.sessionState),
        isLoading: false,
        error: null
      };

    case 'UPDATE_SESSION_STATE':
      return {
        ...state,
        sessionState: mergeSessionState(state.sessionState, action.payload)
      };

    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        sessionState: {
          ...state.sessionState,
          document: { ...state.sessionState.document, ...action.payload }
        }
      };

    case 'UPDATE_CODE_STATE':
      return {
        ...state,
        sessionState: {
          ...state.sessionState,
          codeState: { ...state.sessionState.codeState, ...action.payload }
        }
      };

    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };

    case 'RESET_SESSION':
      return createInitialState();

    default:
      return state;
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const createSession = async (userRole = 'interviewer') => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
      const response = await fetch(`${SERVER_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userRole })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();

      dispatch({
        type: 'CREATE_SESSION_SUCCESS',
        payload: {
          ...data,
          userRole,
          sessionState: createDefaultSessionState()
        }
      });

      return data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const joinSession = async (sessionId, userRole) => {
    if (state.isLoading) {
      return null;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
      const response = await fetch(`${SERVER_URL}/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join session');
      }

      const data = await response.json();
      dispatch({ type: 'JOIN_SESSION_SUCCESS', payload: { ...data, userRole } });
      return data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateDocument = (document) => {
    dispatch({ type: 'UPDATE_DOCUMENT', payload: document });
  };

  const updateCodeState = (codeState) => {
    dispatch({ type: 'UPDATE_CODE_STATE', payload: codeState });
  };

  const updateSessionState = (sessionState) => {
    dispatch({ type: 'UPDATE_SESSION_STATE', payload: sessionState });
  };

  const setConnectionStatus = (status) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const resetSession = () => {
    dispatch({ type: 'RESET_SESSION' });
  };

  const value = {
    ...state,
    createSession,
    joinSession,
    updateDocument,
    updateCodeState,
    updateSessionState,
    setConnectionStatus,
    clearError,
    resetSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
