import React from 'react';
import { assetUrl } from '@/lib/api';

/* The design kit's scripts (public/assets, taste-skill): they read the DOM once, so they load
   after React has rendered the page with its data. Public pages are full documents (plain links),
   so each page load runs them exactly once. */
let started = false;
export function startKit() {
  if (started) return;
  started = true;
  for (const src of ['/assets/system.js', '/assets/motion/motion.js', '/assets/layout/layout.js']) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    document.body.appendChild(s);
  }
}

export const Arrow = () => (
  <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
    <path className="m-arrow__stem" d="M1 6h8" />
    <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
  </svg>
);

/* Stand-in photographs (Wikimedia Commons, photos.mjs): the alt text is written new for this page. */
const ALT = {
  f26575836: 'Pasillo de racks de servidores iluminados en azul',
  f62049414: 'Código de un programa en un monitor',
  f61807001: 'Líneas de código de colores en una pantalla',
  f105184200: 'Cámara de vigilancia instalada en una pared exterior',
  f107886263: 'Cámara de seguridad fija montada en una pared',
  f154234052: 'Cámara domo instalada en un muro de ladrillo',
  f79707048: 'Manos reparando la placa de una computadora',
  f4071999: 'Soldadura de un componente en una placa electrónica',
  f16007442: 'Mesa de trabajo de electrónica con multímetro y monitor',
  f110874437: 'Pasillo de un centro de datos con racks a ambos lados',
  f73770371: 'Laptop abierta durante un servicio técnico',
  f39457057: 'Switch de red con cables azules conectados',
  f4556037: 'Puertos de un switch con cables de red conectados',
  f27940250: 'Disco duro de laptop abierto',
};

export function photoProps(src, { alt, sizes = '(max-width: 1023px) 100vw, 50vw' } = {}) {
  const m = src && src.match(/^(\/assets\/img\/photo-(f\d+))(-960)?\.webp$/);
  if (!m) {
    return { src: assetUrl(src), alt: alt || '', 'data-source': src?.startsWith('/uploads/') ? 'client' : 'stand-in', 'data-subject': alt || '' };
  }
  const [, base, id, small] = m;
  const srcSet = `${base}-500.webp 500w, ${base}-960.webp 960w${small ? '' : `, ${base}.webp 1280w`}`;
  const text = alt || ALT[id] || '';
  return { src, srcSet, sizes, alt: text, 'data-source': 'stand-in', 'data-subject': text };
}

export const Photo = ({ src, alt, sizes, eager = false, className, ...rest }) => (
  <img
    {...photoProps(src, { alt, sizes })}
    className={className}
    loading={eager ? undefined : 'lazy'}
    decoding="async"
    {...rest}
  />
);
