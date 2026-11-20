import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import { iconNames } from '@/admin/Icon';

export const PageHeader = ({ title, description, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl md:text-3xl">{title}</h1>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
    {action}
  </div>
);

export const Modal = ({ title, onClose, children, wide = false }) => {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 md:p-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-2xl border border-border bg-card shadow-2xl outline-none`}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const Badge = ({ children, tone = 'muted' }) => {
  const tones = {
    muted: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary/15 text-primary',
    accent: 'bg-accent/15 text-accent',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    danger: 'bg-destructive/15 text-destructive',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
};

const ImageField = ({ value, onChange }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.upload(file);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };
  return (
    <div className="space-y-2">
      {value && <img src={assetUrl(value)} alt="" className="h-28 rounded-lg border border-border object-cover" />}
      <div className="flex gap-2">
        <input className="field" value={value || ''} onChange={(e) => onChange(e.target.value || null)} placeholder="/uploads/imagen.png o URL" />
        <label className="btn-secondary !px-3 !py-2 inline-flex items-center gap-1.5 cursor-pointer shrink-0 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Subir
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={onFile} />
        </label>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

/** Campo de formulario según su tipo. */
export const Field = ({ field, value, onChange, options }) => {
  const id = `f-${field.name}`;
  let input;
  switch (field.type) {
    case 'textarea':
    case 'html':
      input = (
        <textarea id={id} rows={field.type === 'html' ? 14 : field.rows || 4} className={`field ${field.type === 'html' ? 'font-mono text-xs' : ''}`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} />
      );
      break;
    case 'list':
      input = (
        <textarea id={id} rows={field.rows || 4} className="field" value={(value || []).join('\n')} onChange={(e) => onChange(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} placeholder="Un elemento por línea" />
      );
      break;
    case 'number':
      input = <input id={id} type="number" className="field" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />;
      break;
    case 'bool':
      input = (
        <label className="flex items-center gap-2 text-sm">
          <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          {field.checkboxLabel || 'Sí'}
        </label>
      );
      break;
    case 'select':
    case 'icon': {
      const opts = field.type === 'icon' ? iconNames.map((n) => ({ value: n, label: n })) : options || field.options || [];
      input = (
        <select id={id} className="field" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' && field.nullable ? null : e.target.value)} required={field.required}>
          {field.nullable && <option value="">— Ninguna —</option>}
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    }
    case 'image':
      input = <ImageField value={value} onChange={onChange} />;
      break;
    case 'date':
      input = <input id={id} type="date" className="field" value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} />;
      break;
    default:
      input = <input id={id} className="field" value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} placeholder={field.placeholder} pattern={field.pattern} />;
  }
  return (
    <div className={field.full ? 'sm:col-span-2' : ''}>
      {field.type !== 'bool' || field.label ? <label htmlFor={id} className="block text-sm font-medium mb-1.5">{field.label}</label> : null}
      {input}
      {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
    </div>
  );
};
