import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './contexts/SessionContext';
import HomePage from './pages/HomePage';
import InterviewPage from './pages/InterviewPage';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { isLoading } = useSession();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/interview/:sessionId" element={<InterviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;