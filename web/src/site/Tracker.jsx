import React, { useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

/** Rastreador de órdenes: consulta GET /api/public/orders/{código}. */
const Tracker = () => {
  const [code, setCode] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  const submit = async (e) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) {
      setState({ status: 'invalid' });
      return;
    }
    setState({ status: 'loading' });
    try {
      setState({ status: 'found', order: await api.get(`/public/orders/${encodeURIComponent(value)}`) });
    } catch (err) {
      setState(err.status === 404 ? { status: 'missing' } : { status: 'error', message: err.message });
    }
  };

  const o = state.order;
  const stageLabel = (state) => {
    const map = { done: 'Completado', now: 'En curso', next: 'Pendiente' };
    return map[state] || state;
  };

  return (
    <div className="tracker stack-5">
      <form className="tracker__input-row" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="t-code">Código de orden</label>
          <input
            id="t-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            maxLength={20}
            placeholder="NSX-AB12CD"
            aria-invalid={state.status === 'invalid' ? 'true' : undefined}
            aria-describedby="t-code-err"
          />
          <p className="field__error" id="t-code-err" hidden={state.status !== 'invalid'}>Escribe el código, por ejemplo NSX-AB12CD.</p>
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button className="btn btn--primary" type="submit" disabled={state.status === 'loading'}>
            {state.status === 'loading' ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </form>
      <div aria-live="polite">
        {state.status === 'loading' && (
          <div className="tracker__result">
            <div className="skeleton" style={{ height: '48px' }} />
          </div>
        )}
        {state.status === 'missing' && (
          <div className="tracker__result" style={{ borderColor: 'color-mix(in oklab, #ef4444 30%, var(--line-strong))' }}>
            <p>No encontramos esa orden. Revisa el código del comprobante.</p>
          </div>
        )}
        {state.status === 'error' && (
          <div className="tracker__result" style={{ borderColor: 'color-mix(in oklab, #ef4444 30%, var(--line-strong))' }}>
            <p>{state.message}</p>
          </div>
        )}
        {state.status === 'found' && (
          <div className="tracker__result stack-4">
            <div className="tracker__header">
              <span className="rows__name">{o.item}</span>
              <span className="muted t-small">{o.kind} · {formatDate(o.updated)}</span>
            </div>
            <ol className="tracker__stages">
              {o.stages.map((s, i) => {
                const st = i < o.stage ? 'done' : i === o.stage ? 'now' : 'next';
                return (
                  <li key={i} data-state={st} aria-current={st === 'now' ? 'step' : undefined}>
                    <span className={`tracker__status tracker__status--${st}`}>{stageLabel(st)}</span>
                    <span>{s}</span>
                  </li>
                );
              })}
            </ol>
            {/* o.note es texto plano; React lo escapa automáticamente. Si en el futuro
               se permite HTML en public_note, agregar sanitizeHtml() aquí. */}
            {o.note && <p className="muted t-small">{o.note}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracker;
