import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, Phone, MessageCircle, Trash2, PackagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatMoney, whatsappLink } from '@/lib/format';
import { useToast } from '@/admin/ui-kit/use-toast';
import { PageHeader, Badge, Modal } from '@/admin/ui';

export const KIND_LABEL = { contact: 'Contacto', diagnosis: 'Diagnóstico', quote: 'Cotización' };
export const STATUS_TONE = { nuevo: 'primary', contactado: 'accent', ganado: 'success', perdido: 'danger' };
const STATUSES = ['nuevo', 'contactado', 'ganado', 'perdido'];

const AdminLeads = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [leads, setLeads] = useState(null);
  const [filter, setFilter] = useState({ status: '', kind: '' });
  const [open, setOpen] = useState(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString();
    try {
      setLeads(await api.get(`/admin/leads${qs ? `?${qs}` : ''}`));
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setLeads([]);
    }
  }, [filter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (lead, patch) => {
    try {
      const updated = await api.patch(`/admin/leads/${lead.id}`, patch);
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? updated : l)));
      if (open?.id === lead.id) setOpen(updated);
      return true;
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const remove = async (lead) => {
    if (!window.confirm(`¿Eliminar la solicitud de ${lead.name}? No se puede deshacer.`)) return;
    try {
      await api.del(`/admin/leads/${lead.id}`);
      setOpen(null);
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const toOrder = (lead) =>
    navigate('/admin/ordenes', {
      state: { prefill: { kind: lead.service_title || KIND_LABEL[lead.kind], item: lead.message.slice(0, 200) || lead.service_title, customer_name: lead.name, customer_contact: [lead.email, lead.phone].filter(Boolean).join(' · '), lead_id: lead.id } },
    });

  return (
    <div>
      <PageHeader title="Solicitudes" description="Contactos, diagnósticos y cotizaciones recibidas desde el sitio." />
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="field !w-auto py-2" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="field !w-auto py-2" value={filter.kind} onChange={(e) => setFilter((f) => ({ ...f, kind: e.target.value }))} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        {leads === null ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : leads.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No hay solicitudes con este filtro.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Servicio</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => { setOpen(l); setNotes(l.notes); }}>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(l.created_at).toLocaleDateString('es')}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.profile === 'B2B' ? l.company || 'Empresa' : 'Persona'}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.service_title || 'Consulta general'}</td>
                  <td className="px-4 py-3"><Badge tone="accent">{KIND_LABEL[l.kind]}</Badge></td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select className="field !w-auto py-1 text-xs" value={l.status} onChange={(e) => update(l, { status: e.target.value })} aria-label="Estado">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <Modal title={`Solicitud #${open.id} · ${KIND_LABEL[open.kind]}`} onClose={() => setOpen(null)}>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-lg font-semibold text-foreground">{open.name}</p>
              <p className="text-muted-foreground">{open.profile === 'B2B' ? `Empresa${open.company ? ` · ${open.company}` : ''}` : 'Hogar / persona'} · {new Date(open.created_at).toLocaleString('es')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${open.email}`} className="btn-secondary !py-1.5 !px-3 inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> {open.email}</a>
              {open.phone && <a href={`tel:${open.phone}`} className="btn-secondary !py-1.5 !px-3 inline-flex items-center gap-1.5"><Phone className="h-4 w-4" /> {open.phone}</a>}
              {open.phone && <a href={whatsappLink(open.phone, `Hola ${open.name.split(' ')[0]}, te escribimos de NetSurex por tu solicitud.`)} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-1.5 !px-3 inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground mb-1">{open.service_title || 'Consulta general'}</p>
              <p className="whitespace-pre-line text-foreground">{open.message || '—'}</p>
            </div>
            {open.estimate && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">{open.estimate.summary}</p>
                <p className="font-semibold text-foreground">
                  {formatMoney(open.estimate.low, open.estimate.currency)} – {formatMoney(open.estimate.high, open.estimate.currency)}
                  {open.estimate.monthly > 0 && ` + ${formatMoney(open.estimate.monthly, open.estimate.currency)}/mes`}
                </p>
              </div>
            )}
            {open.source_page && <p className="text-xs text-muted-foreground">Enviado desde: {open.source_page}</p>}
            <div>
              <label htmlFor="lead-notes" className="block text-sm font-medium mb-1.5">Notas internas</label>
              <textarea id="lead-notes" rows={3} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button type="button" className="btn-secondary !py-1.5 !px-3 mt-2 text-sm" onClick={async () => (await update(open, { notes })) && toast({ title: 'Notas guardadas' })}>
                Guardar notas
              </button>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
              <button type="button" onClick={() => remove(open)} className="inline-flex items-center gap-1.5 text-destructive text-sm"><Trash2 className="h-4 w-4" /> Eliminar</button>
              <button type="button" onClick={() => toOrder(open)} className="btn-primary !py-2 inline-flex items-center gap-2"><PackagePlus className="h-4 w-4" /> Crear orden</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminLeads;
