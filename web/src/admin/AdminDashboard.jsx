import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, PackageSearch, Briefcase, BookOpen, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Badge } from '@/admin/ui';
import { KIND_LABEL, STATUS_TONE } from '@/admin/AdminLeads';

const Stat = ({ icon: Icn, label, value, to }) => (
  <Link to={to} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:text-foreground transition-colors">
    <Icn className="h-5 w-5 text-primary mb-3" />
    <p className="font-display text-3xl font-bold text-foreground">{value ?? '–'}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </Link>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch(() => {});
    api.get('/admin/leads?limit=6').then(setLeads).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Resumen" description="Actividad reciente de NetSurex." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={Inbox} label="Solicitudes nuevas" value={stats?.leads_new} to="/admin/solicitudes" />
        <Stat icon={PackageSearch} label="Órdenes abiertas" value={stats?.orders_open} to="/admin/ordenes" />
        <Stat icon={Briefcase} label="Servicios" value={stats?.services} to="/admin/servicios" />
        <Stat icon={BookOpen} label="Artículos del blog" value={stats?.posts} to="/admin/blog" />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg">Últimas solicitudes</h2>
          <Link to="/admin/solicitudes" className="text-sm font-semibold inline-flex items-center gap-1">Ver todas <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {leads.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aún no hay solicitudes. Llegarán aquí desde el formulario de contacto y el cotizador.</p>
        ) : (
          <ul className="divide-y divide-border">
            {leads.map((l) => (
              <li key={l.id} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-medium text-foreground">{l.name}</span>
                <span className="text-sm text-muted-foreground truncate flex-1 min-w-[10rem]">{l.service_title || 'Consulta general'}</span>
                <Badge tone="accent">{KIND_LABEL[l.kind]}</Badge>
                <Badge tone={STATUS_TONE[l.status]}>{l.status}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString('es')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
