import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;