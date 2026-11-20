import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, PackageSearch, Briefcase, Layers, ShieldCheck, FolderKanban, BookOpen, HelpCircle,
  Users, ListOrdered, Settings, LogOut, Menu, X, ExternalLink, Sun, Moon,
} from 'lucide-react';
import Logo from '@/admin/Logo';
import { useAdminAuth } from '@/admin/AdminAuth';
import { useTheme } from '@/admin/ThemeProvider';

const sections = [
  { title: 'Operación', links: [
    { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
    { to: '/admin/solicitudes', label: 'Solicitudes', icon: Inbox },
    { to: '/admin/ordenes', label: 'Órdenes', icon: PackageSearch },
  ] },
  { title: 'Contenido', links: [
    { to: '/admin/servicios', label: 'Servicios', icon: Briefcase },
    { to: '/admin/divisiones', label: 'Divisiones', icon: Layers },
    { to: '/admin/polizas', label: 'Pólizas', icon: ShieldCheck },
    { to: '/admin/portafolio', label: 'Portafolio', icon: FolderKanban },
    { to: '/admin/blog', label: 'Blog', icon: BookOpen },
    { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
    { to: '/admin/equipo', label: 'Equipo', icon: Users },
    { to: '/admin/metodologia', label: 'Metodología', icon: ListOrdered },
  ] },
  { title: 'Sistema', links: [{ to: '/admin/ajustes', label: 'Ajustes', icon: Settings }] },
];

const AdminShell = () => {
  const { user, logout } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="space-y-6">
      {sections.map((sec) => (
        <div key={sec.title}>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{sec.title}</p>
          <ul className="space-y-0.5">
            {sec.links.map(({ to, label, icon: Icn, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`
                  }
                >
                  <Icn className="h-4 w-4" /> {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[240px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-border bg-card p-4 flex flex-col transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/admin" className="mb-6 px-2"><Logo size={30} /></Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="border-t border-border pt-4 mt-4 space-y-1">
          <p className="px-3 text-xs text-muted-foreground truncate" title={user?.email}>{user?.email}</p>
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-4 w-4" /> Ver sitio
          </a>
          <button type="button" onClick={toggleTheme} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          </button>
          <button type="button" onClick={logout} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="min-w-0">
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 backdrop-blur px-4 py-3">
          <Logo size={28} />
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menú" className="p-2">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>
        <main className="p-4 md:p-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
