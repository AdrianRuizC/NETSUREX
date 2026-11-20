import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/admin/ui-kit/use-toast';
import { PageHeader, Modal, Field, Badge } from '@/admin/ui';

/**
 * Administrador genérico de contenido (listar, crear, editar, publicar, borrar)
 * sobre /api/admin/{endpoint}. La configuración vive en resources.js.
 */
const ResourceManager = ({ config }) => {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [editing, setEditing] = useState(null); // objeto en edición; {} = nuevo
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await api.get(`/admin/${config.endpoint}`));
    } catch (e) {
      toast({ title: 'Error al cargar', description: e.message, variant: 'destructive' });
      setItems([]);
    }
  }, [config.endpoint, toast]);

  useEffect(() => {
    setItems(null);
    setEditing(null);
    setQuery('');
    load();
    if (config.fields.some((f) => f.options === 'divisions')) {
      api.get('/admin/divisions').then(setDivisions).catch(() => {});
    }
  }, [config, load]);

  const divisionOptions = useMemo(() => divisions.map((d) => ({ value: d.id, label: d.name })), [divisions]);
  const isNew = editing && !editing.__existing;

  const startNew = () => {
    const blank = {};
    config.fields.forEach((f) => {
      blank[f.name] = f.default !== undefined ? (typeof f.default === 'function' ? f.default() : f.default) : f.type === 'list' ? [] : f.type === 'bool' ? false : f.type === 'number' ? 0 : '';
    });
    if (config.fields.some((f) => f.options === 'divisions') && divisionOptions[0]) {
      config.fields.filter((f) => f.options === 'divisions' && !f.nullable).forEach((f) => { blank[f.name] = divisionOptions[0].value; });
    }
    if (items) blank.position = items.length;
    setError(null);
    setEditing(blank);
  };

  const startEdit = (item) => {
    setError(null);
    setEditing({ ...item, __existing: true });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { __existing, ...payload } = editing;
    if (isNew && !payload.id) delete payload.id;
    try {
      if (isNew) await api.post(`/admin/${config.endpoint}`, payload);
      else {
        const { id, ...rest } = payload;
        await api.patch(`/admin/${config.endpoint}/${encodeURIComponent(id)}`, rest);
      }
      toast({ title: isNew ? 'Creado' : 'Cambios guardados', description: 'Ya se refleja en el sitio público.' });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`¿Eliminar "${item[config.titleField]}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.del(`/admin/${config.endpoint}/${encodeURIComponent(item.id)}`);
      toast({ title: 'Eliminado' });
      load();
    } catch (err) {
      toast({ title: 'No se pudo eliminar', description: err.message, variant: 'destructive' });
    }
  };

  const togglePublished = async (item) => {
    try {
      await api.patch(`/admin/${config.endpoint}/${encodeURIComponent(item.id)}`, { published: !item.published });
      load();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const hasPublished = config.fields.some((f) => f.name === 'published');
  const q = query.trim().toLowerCase();
  const visible = (items || []).filter((it) => {
    if (!q) return true;
    const searchable = [it.title, it.description, it.name, it.email, it.company, it.kind].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(q);
  });
  const divisionName = (id) => divisions.find((d) => d.id === id)?.name || id;

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        action={
          <button type="button" onClick={startNew} className="btn-primary inline-flex items-center gap-2 !py-2">
            <Plus className="h-4 w-4" /> {config.newLabel || 'Nuevo'}
          </button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input className="field pl-9 py-2" placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {items === null ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Sin registros.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-4 md:px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{item[config.titleField]}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {(config.columns || []).map((col) => {
                      const v = item[col];
                      if (v === null || v === undefined || v === '') return null;
                      return <Badge key={col}>{col === 'division_id' ? divisionName(v) : String(v)}</Badge>;
                    })}
                    {hasPublished && !item.published && <Badge tone="danger">Oculto</Badge>}
                    {item.highlighted && <Badge tone="primary">Destacado</Badge>}
                  </div>
                </div>
                {hasPublished && (
                  <button type="button" onClick={() => togglePublished(item)} title={item.published ? 'Ocultar del sitio' : 'Publicar'} aria-label={item.published ? 'Ocultar del sitio' : 'Publicar'} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary">
                    {item.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                )}
                <button type="button" onClick={() => startEdit(item)} aria-label="Editar" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(item)} aria-label="Eliminar" className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <Modal title={isNew ? config.newLabel || 'Nuevo' : `Editar: ${editing[config.titleField] || ''}`} onClose={() => setEditing(null)} wide={config.wide}>
          <form onSubmit={save} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {config.slug && isNew && (
                <Field
                  field={{ name: 'id', label: 'Identificador (URL)', help: 'Opcional. Se genera desde el título. Solo minúsculas, números y guiones.', pattern: '[a-z0-9]+(-[a-z0-9]+)*' }}
                  value={editing.id}
                  onChange={(v) => setEditing((x) => ({ ...x, id: v }))}
                />
              )}
              {config.fields.map((f) => (
                <Field
                  key={f.name}
                  field={f}
                  options={f.options === 'divisions' ? divisionOptions : undefined}
                  value={editing[f.name]}
                  onChange={(v) => setEditing((x) => ({ ...x, [f.name]: v }))}
                />
              ))}
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary !py-2">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary !py-2 inline-flex items-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ResourceManager;
