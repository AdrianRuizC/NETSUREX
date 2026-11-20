import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useSiteData } from '@/site/data';

const SOFTWARE = [
  ['landing', 'Landing page'],
  ['corporateWeb', 'Sitio web corporativo'],
  ['ecommerce', 'Tienda en línea'],
  ['mobileApp', 'App para Android o iOS'],
  ['multiplatformApp', 'App multiplataforma'],
  ['customSystem', 'Sistema a medida (ERP, CRM, POS)'],
  ['aiIntegration', 'Asistente o chatbot con IA'],
];
const CAMERAS = [
  ['analogHD', 'Analógica HD'],
  ['ip', 'IP'],
  ['ptz', 'Domo PTZ'],
];

/** Rango de referencia: el precio lo calcula el servidor con los valores del panel.
    @param {function} [onSend] — callback que recibe el texto del estimado para llenar un textarea.
    @param {string} [contactHref] — URL del formulario de contacto (default: "/contacto"). */
const Estimator = ({ onSend, contactHref = '/contacto' }) => {
  const siteData = useSiteData();
  const maxCameras = siteData?.quote?.maxCameras ?? 64;
  const [input, setInput] = useState({ mode: 'cctv', cameras: 4, camera_type: 'ip', remote: true, cloud: false, software_type: 'multiplatformApp' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const set = (patch) => setInput((v) => ({ ...v, ...patch }));

  useEffect(() => {
    let off = false;
    const t = setTimeout(async () => {
      try {
        const r = await api.post('/public/quote/estimate', { ...input, cameras: Math.min(maxCameras, Math.max(1, Number(input.cameras) || 1)) });
        if (!off) { setResult(r); setError(null); }
      } catch (e) {
        if (!off) setError(e.message);
      }
    }, 150);
    return () => { off = true; clearTimeout(t); };
  }, [input, maxCameras]);

  const range = result ? `${formatMoney(result.low, result.currency)} a ${formatMoney(result.high, result.currency)}` : '';

  // lleva el estimado al formulario de diagnóstico
  const send = (e) => {
    if (result) {
      const text = `${result.summary}. Rango de referencia: ${range}${result.monthly ? ` y ${formatMoney(result.monthly, result.currency)} al mes de respaldo en la nube` : ''}.`;
      if (onSend) {
        onSend(text);
      } else {
        // Fallback: accede al DOM directamente si no hay callback
        const box = document.getElementById('f-message');
        if (box) {
          box.value = text;
        } else {
          e.preventDefault();
        }
      }
    }
  };

  return (
    <div className="estimator stack-5">
      <div className="estimator__fields">
        <div className="field"><label htmlFor="q-mode">Qué quieres cotizar</label>
          <select id="q-mode" value={input.mode} onChange={(e) => set({ mode: e.target.value })}>
            <option value="cctv">Cámaras de seguridad</option>
            <option value="software">Software o una app</option>
          </select></div>
        {input.mode === 'cctv' ? (
          <>
            <div className="field"><label htmlFor="q-cams">Cámaras</label>
              <input id="q-cams" type="number" inputMode="numeric" min={1} max={maxCameras} value={input.cameras} onChange={(e) => set({ cameras: e.target.value })} /></div>
            <div className="field"><label htmlFor="q-type">Tipo de cámara</label>
              <select id="q-type" value={input.camera_type} onChange={(e) => set({ camera_type: e.target.value })}>
                {CAMERAS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select></div>
            <div className="field"><label htmlFor="q-cloud">Respaldo en la nube</label>
              <select id="q-cloud" value={input.cloud ? 'si' : 'no'} onChange={(e) => set({ cloud: e.target.value === 'si' })}>
                <option value="no">Sin respaldo en la nube</option>
                <option value="si">Con respaldo en la nube</option>
              </select></div>
          </>
        ) : (
          <div className="field field--full"><label htmlFor="q-soft">Tipo de proyecto</label>
            <select id="q-soft" value={input.software_type} onChange={(e) => set({ software_type: e.target.value })}>
              {SOFTWARE.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></div>
        )}
      </div>
      <div aria-live="polite" className="estimator__result">
        {error ? (
          <p className="muted">{error}</p>
        ) : result ? (
          <>
            <p className="t-stat">{range}</p>
            <p className="t-small muted">{result.monthly ? `Más ${formatMoney(result.monthly, result.currency)} al mes de respaldo. ` : ''}{result.note}</p>
          </>
        ) : null}
      </div>
      <a className="link" href={contactHref} onClick={send}>Enviar este rango con tu solicitud</a>
    </div>
  );
};

export default Estimator;
