import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast'; // <--- ESTO ES LA CLAVE

// Importamos las vistas
import LoginPage from './components/LoginPage';
import EmployeeView from './components/EmployeeView';
import HRView from './components/HRView';

const ProtectedRoute = ({ children, role }: { children: JSX.Element, role?: 'admin' | 'user' }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <ThemeProvider>
            {/* CONFIGURACIÓN DE LAS NOTIFICACIONES NEGRAS Y ELEGANTES */}
            <Toaster 
              position="bottom-center" 
              toastOptions={{
                style: {
                  background: '#1f2937', // Gris oscuro
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                },
                success: { iconTheme: { primary: '#ef7d00', secondary: '#fff' } },
              }}
            />
            
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<ProtectedRoute role="user"><EmployeeView /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute role="admin"><HRView /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>

          </ThemeProvider>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
