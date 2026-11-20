import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/admin/ui-kit/use-toast';
import { PageHeader } from '@/admin/ui';

const Section = ({ title, description, children, onSave, saving }) => (
  <form onSubmit={onSave} className="rounded-2xl border border-border bg-card p-6 mb-6">
    <h2 className="text-lg">{title}</h2>
    {description && <p className="text-sm text-muted-foreground mb-5">{description}</p>}
    <div className="space-y-4">{children}</div>
    {onSave && (
      <div className="flex justify-end border-t border-border pt-4 mt-6">
        <button type="submit" disabled={saving} className="btn-primary !py-2 inline-flex items-center gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</button>
      </div>
    )}
  </form>
);

const Input = ({ label, help, ...props }) => (
  <div>
    <label className="block text-sm font-medium mb-1.5">
      {label}
      <input className="field mt-1.5 font-normal" {...props} />
    </label>
    {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
  </div>
);

const Num = ({ label, value, onChange }) => (
  <label className="block text-sm">
    <span className="text-muted-foreground">{label}</span>
    <input type="number" min={0} className="field mt-1" value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
);

const SOFTWARE_LABELS = {
  landing: 'Landing page',
  corporateWeb: 'Sitio corporativo',
  ecommerce: 'E-commerce',
  mobileApp: 'App móvil',
  multiplatformApp: 'App multiplataforma',
  customSystem: 'Sistema a medida',
  aiIntegration: 'Integración de IA',
};

const AdminSettings = () => {
  const { toast } = useToast();
  const [site, setSite] = useState(null);
  const [quote, setQuote] = useState(null);
  const [saving, setSaving] = useState('');
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });

  useEffect(() => {
    api.get('/admin/settings/site').then(setSite);
    api.get('/admin/settings/quote').then(setQuote);
  }, []);

  const run = (key, fn, okMsg) => async (e) => {
    e.preventDefault();
    setSaving(key);
    try {
      await fn();
      toast({ title: okMsg });
    } catch (err) {
      toast({ title: 'No se pudo guardar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving('');
    }
  };

  if (!site || !quote) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const setContact = (k, v) => setSite((s) => ({ ...s, contact: { ...s.contact, [k]: v } }));
  const setHour = (i, k, v) => setContact('hours', site.contact.hours.map((h, j) => (j === i ? { ...h, [k]: v } : h)));
  const setCctv = (path, v) =>
    setQuote((q) => {
      if (!q.cctv) return q;
      const cctv = structuredClone(q.cctv);
      const keys = path.split('.');
      let o = cctv;
      keys.slice(0, -1).forEach((k) => { o = o[k]; });
      o[keys.at(-1)] = v;
      return { ...q, cctv };
    });
  const setSoftware = (key, idx, v) =>
    setQuote((q) => {
      const row = q.software?.[key] ?? [0, 0];
      return { ...q, software: { ...q.software, [key]: row.map((x, i) => (i === idx ? v : x)) } };
    });

  return (
    <div>
      <PageHeader title="Ajustes" description="Datos de la empresa, contacto, redes y precios del cotizador." />

      <Section title="Empresa" onSave={run('site', () => api.put('/admin/settings/site', site), 'Datos guardados')} saving={saving === 'site'}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nombre" value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} required />
          <Input label="Fecha de fundación (texto)" value={site.founded_label} onChange={(e) => setSite({ ...site, founded_label: e.target.value })} />
        </div>
        <Input label="Lema" value={site.tagline} onChange={(e) => setSite({ ...site, tagline: e.target.value })} />
        <Input label="Descripción corta (pie de página)" value={site.short_description} onChange={(e) => setSite({ ...site, short_description: e.target.value })} />

        <h3 className="text-base pt-2">Contacto</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Email de contacto" type="email" value={site.contact.email} onChange={(e) => setContact('email', e.target.value)} />
          <Input label="Email de privacidad" type="email" value={site.contact.privacy_email} onChange={(e) => setContact('privacy_email', e.target.value)} />
          <Input label="Teléfono (como se muestra)" value={site.contact.phone_display} onChange={(e) => setContact('phone_display', e.target.value)} placeholder="+51 999 999 999" />
          <Input
            label="WhatsApp Business"
            value={site.contact.whatsapp}
            onChange={(e) => setContact('whatsapp', e.target.value.replace(/\D/g, ''))}
            placeholder="51999999999"
            help="Solo dígitos, con código de país."
          />
        </div>
        <Input label="Cobertura" value={site.contact.coverage} onChange={(e) => setContact('coverage', e.target.value)} />

        <div>
          <p className="text-sm font-medium mb-2">Horario de atención</p>
          <div className="space-y-2">
            {site.contact.hours.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input className="field" value={h.days} onChange={(e) => setHour(i, 'days', e.target.value)} aria-label="Días" />
                <input className="field" value={h.time} onChange={(e) => setHour(i, 'time', e.target.value)} aria-label="Horario" />
                <button type="button" onClick={() => setContact('hours', site.contact.hours.filter((_, j) => j !== i))} className="p-2 text-muted-foreground hover:text-destructive" aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setContact('hours', [...site.contact.hours, { days: '', time: '' }])} className="text-sm font-semibold inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Agregar fila</button>
          </div>
        </div>

        <h3 className="text-base pt-2">Redes sociales</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {Object.keys(site.social).map((k) => (
            <Input key={k} label={k === 'x' ? 'X (Twitter)' : k[0].toUpperCase() + k.slice(1)} type="url" value={site.social[k]} onChange={(e) => setSite({ ...site, social: { ...site.social, [k]: e.target.value } })} placeholder="https://" />
          ))}
        </div>
      </Section>

      <Section
        title="Precios del cotizador"
        description="Valores referenciales que usa el cotizador rápido del sitio."
        onSave={run('quote', () => api.put('/admin/settings/quote', quote), 'Precios guardados')}
        saving={saving === 'quote'}
      >
        <div className="max-w-[10rem]">
          <Input label="Moneda (ISO)" value={quote.currency} maxLength={3} onChange={(e) => setQuote({ ...quote, currency: e.target.value.toUpperCase() })} />
        </div>
        <h3 className="text-base">CCTV</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Num label="Cámara analógica HD" value={quote.cctv?.perCamera?.analogHD ?? 0} onChange={(v) => setCctv('perCamera.analogHD', v)} />
          <Num label="Cámara IP" value={quote.cctv?.perCamera?.ip ?? 0} onChange={(v) => setCctv('perCamera.ip', v)} />
          <Num label="Domo PTZ" value={quote.cctv?.perCamera?.ptz ?? 0} onChange={(v) => setCctv('perCamera.ptz', v)} />
          <Num label="Grabador hasta 8" value={quote.cctv?.recorder?.upTo8 ?? 0} onChange={(v) => setCctv('recorder.upTo8', v)} />
          <Num label="Grabador hasta 16" value={quote.cctv?.recorder?.upTo16 ?? 0} onChange={(v) => setCctv('recorder.upTo16', v)} />
          <Num label="Grabador hasta 32" value={quote.cctv?.recorder?.upTo32 ?? 0} onChange={(v) => setCctv('recorder.upTo32', v)} />
          <Num label="Instalación por cámara" value={quote.cctv?.installationPerCamera ?? 0} onChange={(v) => setCctv('installationPerCamera', v)} />
          <Num label="Config. monitoreo remoto" value={quote.cctv?.remoteSetup ?? 0} onChange={(v) => setCctv('remoteSetup', v)} />
          <Num label="Nube (mensual)" value={quote.cctv?.cloudBackupMonthly ?? 0} onChange={(v) => setCctv('cloudBackupMonthly', v)} />
        </div>
        <h3 className="text-base pt-2">Software (rango mínimo – máximo)</h3>
        <div className="space-y-2">
          {Object.entries(SOFTWARE_LABELS).map(([key, label]) => (
            <div key={key} className="grid grid-cols-[1fr_7rem_7rem] gap-2 items-center">
              <span className="text-sm">{label}</span>
              <input type="number" min={0} className="field py-2" aria-label={`${label} mínimo`} value={quote.software[key]?.[0] ?? 0} onChange={(e) => setSoftware(key, 0, Number(e.target.value))} />
              <input type="number" min={0} className="field py-2" aria-label={`${label} máximo`} value={quote.software[key]?.[1] ?? 0} onChange={(e) => setSoftware(key, 1, Number(e.target.value))} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Cambiar contraseña"
        onSave={run(
          'pw',
          async () => {
            if (pw.new_password !== pw.confirm) throw new Error('Las contraseñas nuevas no coinciden.');
            await api.post('/auth/password', { current_password: pw.current_password, new_password: pw.new_password });
            setPw({ current_password: '', new_password: '', confirm: '' });
          },
          'Contraseña actualizada'
        )}
        saving={saving === 'pw'}
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Actual" type="password" autoComplete="current-password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
          <Input label="Nueva" type="password" autoComplete="new-password" required minLength={10} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} help="Mínimo 10 caracteres." />
          <Input label="Repetir nueva" type="password" autoComplete="new-password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        </div>
      </Section>
    </div>
  );
};

export default AdminSettings;
