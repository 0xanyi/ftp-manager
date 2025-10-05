import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              FTP File Manager
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.email}
              </span>
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Dashboard
              </h2>
              <p className="text-gray-600 mb-6">
                This is the dashboard page. More features will be implemented in the next phases.
              </p>
              <p className="text-gray-600">
                Your role: <span className="font-semibold">{user?.role}</span>
              </p>
              {user?.channels && user.channels.length > 0 && (
                <p className="text-gray-600 mt-2">
                  You have access to {user.channels.length} channel(s)
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;