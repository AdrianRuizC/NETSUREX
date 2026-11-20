import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Loader2, Copy, Trash2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/admin/ui-kit/use-toast';
import { PageHeader, Badge, Modal } from '@/admin/ui';

const blank = { kind: '', item: '', stage: 0, public_note: '', internal_note: '', customer_name: '', customer_contact: '', lead_id: null };

const AdminOrders = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [stages, setStages] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setOrders(await api.get(`/admin/orders${q ? `?q=${encodeURIComponent(q)}` : ''}`));
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setOrders([]);
    }
  }, [q, toast]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.get('/admin/stats').then((s) => setStages(s.order_stages)).catch(() => {});
  }, []);

  // Prefill desde "Crear orden" en Solicitudes.
  useEffect(() => {
    if (location.state?.prefill) {
      setEditing({ ...blank, ...location.state.prefill });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const isNew = editing && !editing.id;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { id, code, created_at, updated_at, events, ...payload } = editing;
    try {
      const saved = isNew ? await api.post('/admin/orders', payload) : await api.patch(`/admin/orders/${id}`, payload);
      toast({ title: isNew ? `Orden ${saved.code} creada` : 'Orden actualizada', description: isNew ? 'Entrega este código al cliente para que siga su estado.' : undefined });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (order) => {
    if (!window.confirm(`¿Eliminar la orden ${order.code}? No se puede deshacer.`)) return;
    try {
      await api.del(`/admin/orders/${order.id}`);
      setEditing(null);
      load();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const copy = (code) => {
    navigator.clipboard?.writeText(code);
    toast({ title: 'Código copiado', description: code });
  };

  const set = (k) => (e) => setEditing((x) => ({ ...x, [k]: k === 'stage' ? Number(e.target.value) : e.target.value }));
  const last = stages.length - 1;

  return (
    <div>
      <PageHeader
        title="Órdenes"
        description="Reparaciones y proyectos que tus clientes consultan en el rastreador del sitio."
        action={<button type="button" onClick={() => { setError(null); setEditing({ ...blank }); }} className="btn-primary !py-2 inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Nueva orden</button>}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input className="field pl-9 py-2" placeholder="Buscar por código, equipo o cliente…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar órdenes" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {orders === null ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : orders.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No hay órdenes.</p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="px-4 md:px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 hover:bg-secondary/40 cursor-pointer" onClick={() => { setError(null); setEditing(o); }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); copy(o.code); }} className="font-mono text-sm font-semibold text-primary inline-flex items-center gap-1.5" title="Copiar código">
                  {o.code} <Copy className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{o.item}</p>
                  <p className="text-xs text-muted-foreground">{o.kind}{o.customer_name ? ` · ${o.customer_name}` : ''}</p>
                </div>
                <Badge tone={o.stage === last ? 'success' : o.stage === last - 1 ? 'accent' : 'primary'}>{stages[o.stage] || `Etapa ${o.stage}`}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(o.updated_at).toLocaleDateString('es')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <Modal title={isNew ? 'Nueva orden' : `Orden ${editing.code}`} onClose={() => setEditing(null)} wide>
          <form onSubmit={save} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="o-kind" className="block text-sm font-medium mb-1.5">Tipo</label>
                <input id="o-kind" required className="field" list="order-kinds" value={editing.kind} onChange={set('kind')} placeholder="Reparación de hardware" />
                <datalist id="order-kinds">
                  {['Reparación de hardware', 'Mantenimiento', 'Instalación CCTV', 'Proyecto de software', 'Instalación de red'].map((k) => <option key={k} value={k} />)}
                </datalist>
              </div>
              <div>
                <label htmlFor="o-stage" className="block text-sm font-medium mb-1.5">Etapa</label>
                <select id="o-stage" className="field" value={editing.stage} onChange={set('stage')}>
                  {stages.map((s, i) => <option key={s} value={i}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="o-item" className="block text-sm font-medium mb-1.5">Equipo / proyecto</label>
                <input id="o-item" required className="field" value={editing.item} onChange={set('item')} placeholder="Laptop Lenovo IdeaPad 3 — no enciende" />
              </div>
              <div>
                <label htmlFor="o-cname" className="block text-sm font-medium mb-1.5">Cliente</label>
                <input id="o-cname" className="field" value={editing.customer_name} onChange={set('customer_name')} />
              </div>
              <div>
                <label htmlFor="o-ccontact" className="block text-sm font-medium mb-1.5">Contacto del cliente</label>
                <input id="o-ccontact" className="field" value={editing.customer_contact} onChange={set('customer_contact')} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="o-pnote" className="block text-sm font-medium mb-1.5">Nota visible para el cliente</label>
                <textarea id="o-pnote" rows={2} className="field" value={editing.public_note} onChange={set('public_note')} placeholder="Ej. Esperando repuesto de pantalla, llega el jueves." />
                <p className="mt-1 text-xs text-muted-foreground">Se muestra en el rastreador. Al cambiar de etapa queda en el historial.</p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="o-inote" className="block text-sm font-medium mb-1.5">Nota interna</label>
                <textarea id="o-inote" rows={2} className="field" value={editing.internal_note} onChange={set('internal_note')} placeholder="Solo visible en el panel." />
              </div>
            </div>

            {!isNew && editing.events?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Historial</p>
                <ol className="space-y-1.5 text-sm">
                  {editing.events.map((ev, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-xs text-muted-foreground w-36 shrink-0">{new Date(ev.created_at).toLocaleString('es')}</span>
                      <span className="text-foreground">{stages[ev.stage]}{ev.note ? ` — ${ev.note}` : ''}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
              {!isNew ? <button type="button" onClick={() => remove(editing)} className="inline-flex items-center gap-1.5 text-destructive text-sm"><Trash2 className="h-4 w-4" /> Eliminar</button> : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary !py-2">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary !py-2 inline-flex items-center gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminOrders;
