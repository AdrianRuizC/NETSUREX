import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import Logo from '@/admin/Logo';
import { useAdminAuth } from '@/admin/AdminAuth';

const AdminLogin = () => {
  const { user, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/admin'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg-dark flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 space-y-5">
        <div className="text-center">
          <Logo className="justify-center mb-4" />
          <h1 className="text-2xl">Panel administrativo</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresa con tu cuenta de administrador.</p>
        </div>
        <div>
          <label htmlFor="a-email" className="block text-sm font-medium mb-1.5">Email</label>
          <input id="a-email" type="email" required autoComplete="username" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="a-pass" className="block text-sm font-medium mb-1.5">Contraseña</label>
          <input id="a-pass" type="password" required autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full inline-flex items-center justify-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Ingresar
        </button>
        <p className="text-center text-xs"><a href="/">← Volver al sitio</a></p>
      </form>
    </div>
  );
};

export default AdminLogin;
