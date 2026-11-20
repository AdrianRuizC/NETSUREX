// Utilidades de presentación. Los datos del sitio (contacto, redes, precios, contenido)
// se administran desde el panel /admin y se guardan en el backend.

/** Enlace a WhatsApp. `number` admite cualquier formato: se conservan solo los dígitos. */
export const whatsappLink = (number = '', message = '') => {
  const digits = String(number).replace(/\D/g, '');
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
};

export const formatMoney = (value, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
};

export const formatDate = (iso) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
