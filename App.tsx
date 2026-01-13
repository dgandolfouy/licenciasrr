import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast'; // <--- IMPORTANTE

// Importamos las vistas
import LoginPage from './components/LoginPage';
import EmployeeView from './components/EmployeeView';
import HRView from './components/HRView';

// Componente para proteger rutas (Si no está logueado, lo manda al login)
const ProtectedRoute = ({ children, role }: { children: JSX.Element, role?: 'admin' | 'user' }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  
  if (!user) return <Navigate to="/login" />;
  
  // Si es ruta de admin y el usuario no es admin, lo manda a su panel
  if (role === 'admin' && user.role !== 'admin') {
      return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <ThemeProvider>
            {/* ESTO ES LO QUE HACE QUE LAS NOTIFICACIONES SEAN LINDAS */}
            <Toaster 
              position="bottom-center" 
              toastOptions={{
                style: {
                  background: '#1f2937',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                },
                success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
            
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute role="user">
                  <EmployeeView />
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute role="admin">
                  <HRView />
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>

          </ThemeProvider>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
