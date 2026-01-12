
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';

const AppRoutes: React.FC = () => {
    const { user } = useAuth();
    return (
        <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
    );
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <DataProvider>
                    <HashRouter>
                        <div className="min-h-screen bg-gray-100 text-rr-dark dark:bg-rr-dark dark:text-gray-200">
                            <AppRoutes />
                        </div>
                    </HashRouter>
                </DataProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
