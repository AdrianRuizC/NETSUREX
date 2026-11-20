import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/admin/admin.css';
import { ThemeProvider } from '@/admin/ThemeProvider';
import { Toaster } from '@/admin/ui-kit/toaster';
import { AdminAuthProvider, RequireAdmin } from '@/admin/AdminAuth';
import { resources } from '@/admin/resources';

// Panel administrativo de NetSurex (entrada propia: admin/index.html).
const AdminLogin = React.lazy(() => import('@/admin/AdminLogin'));
const AdminShell = React.lazy(() => import('@/admin/AdminShell'));
const AdminDashboard = React.lazy(() => import('@/admin/AdminDashboard'));
const AdminLeads = React.lazy(() => import('@/admin/AdminLeads'));
const AdminOrders = React.lazy(() => import('@/admin/AdminOrders'));
const AdminSettings = React.lazy(() => import('@/admin/AdminSettings'));
const Admin404 = React.lazy(() => import('@/admin/Admin404'));
const ResourceManager = React.lazy(() => import('@/admin/ResourceManager'));

const content = [
  ['servicios', resources.services],
  ['divisiones', resources.divisions],
  ['polizas', resources.plans],
  ['portafolio', resources.projects],
  ['blog', resources.posts],
  ['faq', resources.faqs],
  ['equipo', resources.team],
  ['metodologia', resources.methodology],
];

const App = () => (
  <BrowserRouter>
    <AdminAuthProvider>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAdmin><AdminShell /></RequireAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="solicitudes" element={<AdminLeads />} />
            <Route path="ordenes" element={<AdminOrders />} />
            {content.map(([path, config]) => (
              <Route key={path} path={path} element={<ResourceManager config={config} />} />
            ))}
            <Route path="ajustes" element={<AdminSettings />} />
            <Route path="*" element={<Admin404 />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </AdminAuthProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
