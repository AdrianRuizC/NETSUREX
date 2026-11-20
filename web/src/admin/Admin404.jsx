import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

/** Página 404 dentro del panel de administración. */
const Admin404 = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
    <AlertTriangle className="h-16 w-16 text-muted-foreground" />
    <h1 className="text-4xl font-bold">Página no encontrada</h1>
    <p className="text-muted-foreground">
      La sección que buscas no existe o ha sido movida.
    </p>
    <Link to="/admin" className="btn inline-flex items-center gap-2" replace>
      <Home className="h-4 w-4" /> Volver al panel
    </Link>
  </div>
);

export default Admin404;
