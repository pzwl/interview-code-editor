import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SessionContext = createContext();

const initialState = {
  sessionId: null,
  userId: null,
  userRole: null,
  isConnected: false,
  isLoading: false,
  error: null,
  sessionState: {
    document: {
      content: '',
      version: 0,
      operations: []
    },
    codeState: {
      selectedText: '',
      language: 'javascript',
      code: '',
      testCases: []
    },
    users: []
  }
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
        userId: action.payload.userId,
        userRole: action.payload.userRole,
        sessionState: action.payload.sessionState,
        isLoading: false,
        error: null
      };
    
    case 'JOIN_SESSION_SUCCESS':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        userId: action.payload.userId,
        userRole: action.payload.userRole,
        sessionState: action.payload.sessionState,
        isLoading: false,
        error: null
      };
    
    case 'UPDATE_SESSION_STATE':
      return {
        ...state,
        sessionState: { ...state.sessionState, ...action.payload }
      };
    
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        sessionState: {
          ...state.sessionState,
          document: action.payload
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
      return initialState;
    
    default:
      return state;
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const createSession = async (userRole = 'interviewer') => {
    console.log('SessionContext createSession called with role:', userRole);
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
      console.log('Making API call to:', `${SERVER_URL}/api/sessions`);
      
      const response = await fetch(`${SERVER_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userRole }),
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      console.log('Session created successfully:', data);
      dispatch({ type: 'CREATE_SESSION_SUCCESS', payload: data });
      return data;
    } catch (error) {
      console.error('SessionContext createSession error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const joinSession = async (sessionId, userRole) => {
    console.log('=== SessionContext.joinSession CALLED ===');
    console.log('Session ID:', sessionId);
    console.log('User Role:', userRole);
    console.log('Current loading state:', state.isLoading);
    console.log('Call stack:', new Error().stack);
    console.log('=========================================');
    
    // Prevent duplicate calls if already loading
    if (state.isLoading) {
      console.log('Already loading, preventing duplicate call');
      return;
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
      const url = `${SERVER_URL}/api/sessions/${sessionId}/join`;
      
      console.log('Making HTTP request to:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userRole }),
      });

      console.log('HTTP response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('HTTP response error:', errorData);
        throw new Error(errorData.error || 'Failed to join session');
      }

      const data = await response.json();
      console.log('HTTP response data:', data);
      dispatch({ type: 'JOIN_SESSION_SUCCESS', payload: data });
      return data;
    } catch (error) {
      console.log('SessionContext.joinSession ERROR:', error);
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