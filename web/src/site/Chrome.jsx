import React, { useEffect } from 'react';
import { useSiteData } from '@/site/data';
import { Arrow, Photo } from '@/site/kit';
import { whatsappLink } from '@/lib/format';

export const MAIN_ACTION = 'Agendar un diagnóstico';

const Logo = ({ href }) => (
  <a className="nav__logo" href={href}>
    <span className="mark" data-mark="arc" aria-hidden="true" />
    NetSurex
  </a>
);

/* nav-split: four words on the left (Servicios opens the panel), the name in the middle,
   one plain word and the main action on the right. */
const Nav = ({ divisions, current }) => (
  <header className="nav nav--split">
    <div className="wrap nav__bar">
      <a className="skip-link" href="#top">Saltar al contenido</a>
      <nav className="nav__links" aria-label="Principal">
        <div className="nav__item">
          <a className="nav__link" href="/servicios" aria-current={current === 'servicios' ? 'page' : undefined}>
            Servicios
            <svg className="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
          <div className="nav__menu">
            <div className="wrap grid">
              {divisions.slice(0, 4).map((d) => (
                <a key={d.id} className="menu-card span-3" href={`/servicios#${d.id}`}>
                  <div className="panel">{d.image && <Photo className="frame__img" src={d.image} sizes="300px" eager />}</div>
                  <span className="t-card">{d.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="nav__item"><a className="nav__link" href="/portafolio" aria-current={current === 'trabajo' ? 'page' : undefined}>Trabajo</a></div>
        <div className="nav__item"><a className="nav__link" href="/metodo">Método</a></div>
        <div className="nav__item"><a className="nav__link" href="/precios">Precios</a></div>
      </nav>
      <Logo href="/" />
      <div className="nav__actions">
        <a className="nav__link" href="/mi-orden">Mi orden</a>
        <a className="btn btn--primary" href="/contacto">{MAIN_ACTION}</a>
      </div>
      <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Menú">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
    </div>
  </header>
);

const GradeToggle = () => {
  const light = typeof document !== 'undefined' && document.documentElement.dataset.grade === 'light';
  const flip = () => {
    try {
      localStorage.setItem('netsurex-grade', light ? 'dark' : 'light');
    } catch { /* sin almacenamiento: el cambio dura esta visita */ }
    window.location.reload();
  };
  return (
    <button type="button" className="grade-toggle" onClick={flip}>
      {light ? 'Ver en modo oscuro' : 'Ver en modo claro'}
    </button>
  );
};

/* footer.closing: row 1 the close (close-photo), row 2 footer-columns named as the nav. */
const Footer = ({ site, divisions }) => (
  <footer className="footer closing" id="cierre" aria-labelledby="close-h">
    <div className="wrap">
      <div className="closing__cta close--photo">
        <div className="section-head--split">
          <div>
            <h2 id="close-h">Agenda el diagnóstico técnico de tu equipo</h2>
            <p className="t-lead">En sitio o remoto. Con el diagnóstico te entregamos tiempos y costos claros.</p>
          </div>
          <a className="btn btn--primary" href="/contacto">{MAIN_ACTION}<Arrow /></a>
        </div>
        <div className="close__media"><Photo src="/assets/img/photo-f39457057.webp" sizes="(max-width: 639px) 200vw, 1280px" /></div>
      </div>
      <div className="closing__links">
        <div className="grid">
          <div className="span-4 stack-4">
            <Logo href="/" />
            <p className="footer__lede">Software, seguridad y soporte en un solo equipo.</p>
          </div>
          <div className="span-2 footer__col">
            <h3>Servicios</h3>
            <ul>{divisions.slice(0, 4).map((d) => <li key={d.id}><a href={`/servicios#${d.id}`}>{d.name}</a></li>)}</ul>
          </div>
          <div className="span-2 footer__col">
            <h3>Trabajo</h3>
            <ul><li><a href="/portafolio">Portafolio</a></li><li><a href="/blog">Blog</a></li></ul>
          </div>
          <div className="span-2 footer__col">
            <h3>Método</h3>
            <ul><li><a href="/metodo">Cuatro fases</a></li><li><a href="/nosotros">Quién dirige</a></li><li><a href="/preguntas">Preguntas</a></li></ul>
          </div>
          <div className="span-2 footer__col">
            <h3>Precios</h3>
            <ul>
              <li><a href="/precios">Pólizas</a></li>
              <li><a href="/mi-orden">Mi orden</a></li>
              <li><a href="/contacto">Contacto</a></li>
              {site.contact.whatsapp && <li><a href={whatsappLink(site.contact.whatsapp, 'Hola NetSurex, quiero información.')} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
            </ul>
          </div>
        </div>
        <div className="footer__legal">
          <span>&copy; {new Date().getFullYear()} {site.name} &nbsp; <a href="/privacidad">Privacidad</a> &nbsp; <a href="/terminos">Términos</a></span>
          <GradeToggle />
          <div className="socials" />
          <a className="credits" href="/creditos">Fotografías vía Wikimedia Commons</a>
        </div>
      </div>
    </div>
  </footer>
);

/** A public page: the fixed nav, the page's sections in main, the closing footer. */
export const Page = ({ current, title, description, children }) => {
  const { site, divisions } = useSiteData();

  useEffect(() => {
    if (title) document.title = title;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    // scroll to anchor if present (e.g., /servicios#software)
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, [title, description]);

  return (
    <>
      <Nav divisions={divisions} current={current} />
      <main id="top">{children}</main>
      <Footer site={site} divisions={divisions} />
    </>
  );
};
