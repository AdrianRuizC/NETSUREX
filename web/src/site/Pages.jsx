import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Page, MAIN_ACTION } from '@/site/Chrome';
import { useSiteData } from '@/site/data';
import { Photo, Arrow } from '@/site/kit';
import { formatDate, whatsappLink } from '@/lib/format';
import { apiUrl } from '@/lib/api';
import Estimator from '@/site/Estimator';
import Tracker from '@/site/Tracker';

const audienceLabel = { B2B: 'Empresas', B2C: 'Hogares', Ambos: 'Empresas y hogares' };

/** Sanitiza HTML de confianza del equipo, removiendo tags y atributos peligrosos. */
const sanitizeHtml = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // Remueve tags peligrosas (incluye svg que puede contener event handlers)
  doc.querySelectorAll('script, iframe, object, embed, form, link, style, svg').forEach((el) => el.remove());
  // Remueve atributos on* (event handlers) y javascript: URIs
  doc.querySelectorAll('*').forEach((el) => {
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if (attr.value && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
};

/* Sub-pages: the long copy the home links to (sections.md: one page, long copy on sub-pages). */

const PageHead = ({ id, title, lead, children }) => (
  <div className="section-head page-head">
    <h1 id={id}>{title}</h1>
    {lead && <p className="t-lead">{lead}</p>}
    {children}
  </div>
);

export const ServicesPage = () => {
  const { divisions, services, plans } = useSiteData();
  return (
    <Page current="servicios" title="Servicios de NetSurex: software, CCTV, soporte y redes" description="Los servicios de las cuatro divisiones de NetSurex y sus pólizas de mantenimiento.">
      <section className="section section--page" aria-labelledby="page-h">
        <div className="wrap">
          <PageHead id="page-h" title="Servicios por división" lead={`${services.length} servicios en ${divisions.length} divisiones, para empresas y hogares.`} />
        </div>
      </section>
      {divisions.map((d) => {
        const items = services.filter((s) => s.division_id === d.id);
        if (!items.length) return null;
        return (
          <section key={d.id} className="section section--auto" id={d.id} aria-labelledby={`${d.id}-h`}>
            <div className="wrap">
              <div className="grid grid--top">
                <div className="span-6 stack-5">
                  <div className="section-head"><h2 id={`${d.id}-h`}>{d.name}</h2><p>{d.summary}</p></div>
                  <ul className="rows">
                    {items.map((s) => (
                      <li key={s.id}>
                        <span className="rows__name">{s.title}</span>
                        <p>{s.description}</p>
                        <span className="rows__value">{audienceLabel[s.audience]}</span>
                      </li>
                    ))}
                  </ul>
                  <a className="link" href={`/contacto?servicio=${items[0].id}`}>Pedir un diagnóstico de {d.name.split(' ')[0].toLowerCase()}</a>
                </div>
                {d.image && <div className="frame frame--photo span-6 start-7"><Photo className="frame__img" src={d.image} sizes="(max-width: 1023px) 100vw, 640px" /></div>}
              </div>
            </div>
          </section>
        );
      })}
      <section className="section section--auto" id="polizas" aria-labelledby="polizas-h">
        <div className="wrap">
          <div className="section-head"><h2 id="polizas-h">Pólizas de mantenimiento</h2><p>Planes de continuidad después de cada entrega.</p></div>
          <ul className="rows measure-wide">
            {plans.map((p) => (
              <li key={p.id}>
                <span className="rows__name">{p.title}</span>
                <p>{p.description} {p.features.length > 0 && <span className="muted">Incluye: {p.features.join('; ').toLowerCase()}.</span>}</p>
                <span className="rows__value">A consultar</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Page>
  );
};

export const PortfolioPage = () => {
  const { projects } = useSiteData();
  return (
    <Page current="trabajo" title="Portafolio de NetSurex: proyectos y capacidades" description="Trabajos tipo de software, CCTV, redes y soporte técnico, con su alcance y entregables.">
      <section className="section section--auto" aria-labelledby="page-h">
        <div className="wrap">
          <PageHead id="page-h" title="Proyectos y capacidades" lead="Un trabajo tipo por línea de servicio: la necesidad, la solución y lo que se entrega." />
          <div className="grid tiles">
            {projects.map((p) => (
              <a key={p.id} className="tile span-4" href={`/portafolio/${p.id}`}>
                <div className="tile__media">{p.image && <Photo src={p.image} sizes="(max-width: 1023px) 100vw, 420px" />}</div>
                <div className="tile__head"><h2 className="tile__title">{p.title}</h2></div>
                <p className="tile__facts">{p.type}</p>
                <p>{p.short_description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </Page>
  );
};

export const ProjectPage = () => {
  const { projectId } = useParams();
  const { projects } = useSiteData();
  const p = projects.find((x) => x.id === projectId);
  if (!p) return <NotFoundPage />;
  return (
    <Page current="trabajo" title={`${p.title} | NetSurex`} description={p.short_description}>
      <section className="section section--auto" aria-labelledby="page-h">
        <div className="wrap">
          <p><a className="link link--back" href="/portafolio">Volver al portafolio</a></p>
          <div className="grid grid--top">
            <div className="span-6 stack-6">
              <PageHead id="page-h" title={p.title} lead={p.short_description} />
              <div className="stack-3"><h2 className="t-card">Necesidad</h2><p className="measure">{p.challenge}</p></div>
              <div className="stack-3"><h2 className="t-card">Solución</h2><p className="measure">{p.solution}</p></div>
              {p.key_actions.length > 0 && (
                <div className="stack-3"><h2 className="t-card">Alcance</h2>
                  <ul className="rows">{p.key_actions.map((a) => <li key={a}><span className="rows__name rows__name--plain">{a}</span></li>)}</ul></div>
              )}
              <div className="stack-3"><h2 className="t-card">Entregables</h2><p className="measure">{p.results}</p></div>
              {p.technologies.length > 0 && <p className="t-small muted">{p.technologies.join(' · ')}</p>}
              <div className="btn-row"><a className="btn btn--primary" href={`/contacto?proyecto=${p.id}`}>{MAIN_ACTION}<Arrow /></a></div>
            </div>
            {p.image && <div className="frame frame--photo span-6 start-7 sticky-media"><Photo className="frame__img" src={p.image} eager sizes="(max-width: 1023px) 100vw, 640px" /></div>}
          </div>
        </div>
      </section>
    </Page>
  );
};

export const BlogPage = () => {
  const { posts } = useSiteData();
  return (
    <Page current="trabajo" title="Blog de NetSurex: guías de software, CCTV y soporte" description="Novedades de NetSurex y guías sobre cámaras de seguridad, mantenimiento de equipos y apps multiplataforma.">
      <section className="section section--auto" aria-labelledby="page-h">
        <div className="wrap">
          <PageHead id="page-h" title="Blog" lead="Novedades de NetSurex y guías prácticas de cada división." />
          <ul className="rows measure-wide">
            {posts.map((p) => (
              <li key={p.id}>
                <a className="rows__name rows__link" href={`/blog/${p.id}`}>{p.title}</a>
                <p>{p.excerpt}</p>
                <span className="rows__value muted">{formatDate(p.date)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Page>
  );
};

export const PostPage = () => {
  const { postId } = useParams();
  const { posts } = useSiteData();
  const p = posts.find((x) => x.id === postId);
  if (!p) return <NotFoundPage />;
  return (
    <Page current="trabajo" title={`${p.title} | Blog de NetSurex`} description={p.excerpt}>
      <section className="section section--auto" aria-labelledby="page-h">
        <div className="wrap">
          <p><a className="link link--back" href="/blog">Volver al blog</a></p>
          <article className="article measure">
            <p className="t-small muted">{formatDate(p.date)} · {p.author} · {p.category}</p>
            <h1 id="page-h">{p.title}</h1>
            {/* contenido escrito por el equipo en el panel (HTML sanitizado) */}
            <div className="article__body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.content) }} />
          </article>
        </div>
      </section>
    </Page>
  );
};

export const QuestionsPage = () => {
  const { faqs } = useSiteData();
  return (
    <Page title="Preguntas frecuentes | NetSurex" description="Garantías, pólizas, cobertura y cómo trabaja NetSurex.">
      <section className="section section--auto" aria-labelledby="page-h">
        <div className="wrap">
          <div className="grid grid--top">
            <div className="span-6"><PageHead id="page-h" title="Preguntas frecuentes" lead="Garantías, pólizas, cobertura y el proceso de trabajo." /></div>
            <div className="faq span-6 start-7">
              {faqs.map((f) => <div key={f.id} className="faq__item"><h2 className="faq__q">{f.question}</h2><p>{f.answer}</p></div>)}
            </div>
          </div>
        </div>
      </section>
    </Page>
  );
};

const Legal = ({ title, children }) => (
  <Page title={`${title} | NetSurex`}>
    <section className="section section--auto" aria-labelledby="page-h">
      <div className="wrap">
        <article className="article measure">
          <h1 id="page-h">{title}</h1>
          <p className="t-small muted">Actualizado el 12 de noviembre de 2026.</p>
          {children}
        </article>
      </div>
    </section>
  </Page>
);

export const PrivacyPage = () => (
  <Legal title="Política de privacidad">
    <h2>Qué datos guardamos</h2>
    <p>Cuando agendas un diagnóstico guardamos tu nombre, tu email, para quién es el servicio, el servicio que eliges y tu mensaje. Si tienes una orden, guardamos el equipo o proyecto, su etapa y los datos de contacto que nos diste.</p>
    <h2>Para qué los usamos</h2>
    <p>Solo para responder tu solicitud, preparar la cotización y darte el estado de tu orden. No vendemos ni cedemos tus datos.</p>
    <h2>Cookies y almacenamiento</h2>
    <p>El sitio no usa cookies de seguimiento ni publicidad. Guarda en tu navegador si prefieres el modo claro u oscuro.</p>
    <h2>Tus derechos</h2>
    <p>Puedes pedir ver, corregir o borrar tus datos escribiéndonos desde el formulario de diagnóstico o por WhatsApp.</p>
  </Legal>
);

export const TermsPage = () => (
  <Legal title="Términos de servicio">
    <h2>Cotizaciones</h2>
    <p>Los rangos del cálculo de precios son referenciales. La cotización válida es la que entregamos por escrito después del diagnóstico, con sus tiempos, costos y plazo de garantía.</p>
    <h2>Garantía</h2>
    <p>Cada trabajo tiene garantía según su cotización: la pieza y la mano de obra en reparaciones, la instalación en CCTV y redes, y la corrección de errores en el software entregado.</p>
    <h2>Accesos y propiedad</h2>
    <p>Al entregar, recibes los accesos y la documentación de lo instalado o desarrollado. Las condiciones de propiedad del código se acuerdan en cada proyecto.</p>
    <h2>Uso del sitio</h2>
    <p>No está permitido usar el sitio para fines ilegales ni intentar acceder sin autorización a sus sistemas.</p>
  </Legal>
);

export const CreditsPage = () => {
  const [list, setList] = React.useState(null);
  useEffect(() => {
    fetch('/assets/img/credits.json').then((r) => r.json()).then(setList).catch(() => setList([]));
  }, []);
  const items = Array.isArray(list) ? list : list?.photos || list?.credits || [];
  return (
    <Legal title="Créditos de las fotografías">
      <p>Las fotografías del sitio vienen de Wikimedia Commons, con estas licencias.</p>
      <ul className="rows">
        {items.map((c) => (
          <li key={c.id || c.file}>
            <a className="rows__name rows__link" href={c.page || c.url} target="_blank" rel="noopener noreferrer">{c.title || c.alt || c.id}</a>
            <p className="muted">{[c.by, c.licence].filter(Boolean).join(' · ')}</p>
          </li>
        ))}
      </ul>
    </Legal>
  );
};

export const NotFoundPage = () => (
  <Page title="Página no encontrada | NetSurex">
    <section className="section" aria-labelledby="page-h">
      <div className="wrap stack-6">
        <PageHead id="page-h" title="No encontramos esta página" lead="Puede que el enlace haya cambiado. Los servicios, el portafolio y el contacto están en el inicio." />
        <div className="btn-row"><a className="btn btn--primary" href="/contacto">{MAIN_ACTION}<Arrow /></a><a className="btn btn--secondary" href="/">Ir al inicio</a></div>
      </div>
    </section>
  </Page>
);

/** Método — página completa con las fases de trabajo. */
export const MethodPage = () => {
  const { methodology } = useSiteData();
  const COVER = '(max-width: 639px) 200vw, (max-width: 1023px) 100vw, 1280px';
  return (
    <Page current="metodo" title="Método de trabajo de NetSurex: diagnóstico, diseño, entrega, soporte" description="Cuatro fases para cada proyecto: desde el diagnóstico hasta el soporte continuo.">
      <section className="section section--page" aria-labelledby="page-h">
        <div className="wrap">
          <PageHead id="page-h" title="Cómo trabajamos" lead={`En ${methodology.length} fases, el mismo proceso para una app, cámaras o reparación.`} />
        </div>
      </section>
      <section className="section section--auto">
        <div className="wrap mo-ph">
          <ol className="mo-ph__list">
            {methodology.map((s) => (
              <li key={s.id} className="mo-ph__ch" data-step={s.step}>
                {s.image && <figure className="mo-ph__pic"><Photo src={s.image} sizes={COVER} /></figure>}
                <h3>{s.step}. {s.title}</h3>
                <p>{s.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="section">
        <div className="wrap stack-5">
          <h2>¿Listo para empezar?</h2>
          <p className="t-lead">La primera fase es un diagnóstico sin costo. Agenda la fecha y coordinamos el resto.</p>
          <div className="btn-row"><a className="btn btn--primary" href="/contacto">{MAIN_ACTION}<Arrow /></a></div>
        </div>
      </section>
    </Page>
  );
};

/** Precios — estimador y pólizas. */
export const PricesPage = () => {
  const { plans } = useSiteData();
  const messageRef = useRef(null);
  const COVER = '(max-width: 639px) 200vw, (max-width: 1023px) 100vw, 1280px';
  const handleEstimateSend = (text) => {
    if (messageRef.current) messageRef.current.value = text;
  };
  return (
    <Page title="Precios de referencia y pólizas | NetSurex" description="Calcula un rango de referencia para tu proyecto y conoce nuestras pólizas de mantenimiento.">
      <section className="section section--page" aria-labelledby="page-h">
        <div className="wrap">
          <PageHead id="page-h" title="Precios de referencia" lead="Cada proyecto se cotiza después del diagnóstico. Este cálculo da un rango orientativo." />
        </div>
      </section>
      <section className="section section--auto">
        <div className="wrap">
          <div className="grid grid--top fill">
            <div className="span-6 stack-6">
              <Estimator onSend={handleEstimateSend} />
              <div className="btn-row"><a className="btn btn--secondary" href="/contacto">Pedir cotización formal<Arrow /></a></div>
            </div>
            <div className="frame frame--photo frame--fill span-6 start-7">
              <Photo className="frame__img" src="/assets/img/photo-f138079950.webp" sizes={COVER} />
            </div>
          </div>
        </div>
      </section>
      <section className="section section--auto" id="polizas" aria-labelledby="polizas-h">
        <div className="wrap">
          <div className="section-head"><h2 id="polizas-h">Pólizas de mantenimiento</h2><p>Planes de continuidad después de cada entrega.</p></div>
          <ul className="rows measure-wide">
            {plans.map((p) => (
              <li key={p.id}>
                <span className="rows__name">{p.title}</span>
                <p>{p.description} {p.features.length > 0 && <span className="muted">Incluye: {p.features.join('; ').toLowerCase()}.</span>}</p>
                <span className="rows__value">A consultar</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Page>
  );
};

/** Contacto — formulario completo de diagnóstico. */
export const ContactPage = () => {
  const { site, divisions, services, plans, projects } = useSiteData();
  const params = new URLSearchParams(window.location.search);
  const pre = params.get('servicio') || '';
  const project = projects.find((p) => p.id === params.get('proyecto'));
  const preMessage = project ? `Me interesa un proyecto como "${project.title}".` : '';
  const groups = [...divisions.map((d) => ({ id: d.id, name: d.name, items: services.filter((s) => s.division_id === d.id) })), { id: 'polizas', name: 'Pólizas', items: plans }];
  const COVER = '(max-width: 639px) 200vw, (max-width: 1023px) 100vw, 1280px';

  const [status, setStatus] = useState('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [profile, setProfile] = useState('B2B');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const errors = form.querySelectorAll(':invalid');
      const count = errors.length;
      setStatus('failed');
      setStatusMsg(`${count} campo${count === 1 ? '' : 's'} por corregir.`);
      return;
    }
    const fd = new FormData(form);
    setStatus('sending');
    setStatusMsg('');
    try {
      const res = await fetch(apiUrl('/public/leads/form'), { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || 'Error del servidor');
      }
      setStatus('sent');
      setStatusMsg('Tu solicitud de diagnóstico está registrada. Te escribimos para coordinar la fecha.');
      form.reset();
      setProfile('B2B');
    } catch (err) {
      setStatus('failed');
      setStatusMsg(`No se envió: ${err.message}. Lo que escribiste sigue aquí; inténtalo de nuevo.`);
    }
  };

  return (
    <Page title="Contacto y diagnóstico | NetSurex" description="Agenda un diagnóstico técnico gratuito. Cuéntanos qué necesitas y te respondemos para coordinar.">
      <section className="section section--page" aria-labelledby="page-h">
        <div className="wrap">
          <PageHead id="page-h" title="Agendar un diagnóstico técnico" lead="Cuéntanos qué necesitas: una app, cámaras, una red o la reparación de un equipo. Te escribimos para coordinar." />
        </div>
      </section>
      <section className="section section--auto">
        <div className="wrap">
          <div className="grid grid--top">
            <div className="span-6 stack-5">
              {site.contact.whatsapp && (
                <a className="link" href={whatsappLink(site.contact.whatsapp, 'Hola NetSurex, quiero agendar un diagnóstico.')} target="_blank" rel="noopener noreferrer">
                  Escribir por WhatsApp{site.contact.phone_display ? ` al ${site.contact.phone_display}` : ''}
                </a>
              )}
              {site.contact.coverage && <p className="muted measure">{site.contact.coverage}</p>}
              <div className="frame frame--photo contact__photo">
                <Photo className="frame__img" src="/assets/img/photo-f51440522.webp" sizes={COVER} />
              </div>
            </div>
            <form
              className="form booking card span-6 start-7"
              onSubmit={handleSubmit}
              noValidate
            >
              <input type="hidden" name="kind" value="diagnosis" />
              <input type="hidden" name="source_page" value="/contacto" />
              <div className="field"><label htmlFor="f-name">Nombre</label>
                <input id="f-name" name="name" type="text" autoComplete="name" required minLength={2} aria-describedby="f-name-err" />
                <p className="field__error" id="f-name-err" hidden>Escribe tu nombre.</p></div>
              <div className="field"><label htmlFor="f-email">Email</label>
                <input id="f-email" name="email" type="email" autoComplete="email" inputMode="email" required aria-describedby="f-email-err" />
                <p className="field__error" id="f-email-err" hidden>Escribe un email con @, por ejemplo nombre@correo.com.</p></div>
              <div className="field"><label htmlFor="f-profile">Para quién es</label>
                <select id="f-profile" name="profile" value={profile} onChange={(e) => setProfile(e.target.value)}>
                  <option value="B2B">Una empresa o negocio</option>
                  <option value="B2C">Mi hogar o uso personal</option>
                </select></div>
              {profile === 'B2B' && (
                <div className="field"><label htmlFor="f-company">Empresa</label>
                  <input id="f-company" name="company" type="text" autoComplete="organization" required aria-describedby="f-company-err" />
                  <p className="field__error" id="f-company-err" hidden>Escribe el nombre de tu empresa.</p></div>
              )}
              <div className="field"><label htmlFor="f-phone">Teléfono</label>
                <input id="f-phone" name="phone" type="tel" autoComplete="tel" required aria-describedby="f-phone-err" placeholder="+51 999 999 999" />
                <p className="field__error" id="f-phone-err" hidden>Deja un teléfono para que te contactemos.</p></div>
              <div className="field"><label htmlFor="f-service">Servicio</label>
                <select id="f-service" name="service_id" defaultValue={pre}>
                  <option value="">Aún no lo sé</option>
                  {groups.map((g) => g.items.length > 0 && (
                    <optgroup key={g.id} label={g.name}>
                      {g.items.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </optgroup>
                  ))}
                </select></div>
              <div className="field field--full"><label htmlFor="f-message">Qué necesitas</label>
                <textarea id="f-message" name="message" required minLength={5} rows={4} defaultValue={preMessage} aria-describedby="f-message-err" />
                <p className="field__error" id="f-message-err" hidden>Cuéntanos en una o dos frases qué necesitas.</p></div>
              <div className="field field--trap" aria-hidden="true"><label htmlFor="f-website">Sitio web</label>
                <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
              <div className="btn-row"><button className="btn btn--primary" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Enviando...' : MAIN_ACTION}</button></div>
              {statusMsg && <p className={`form__status ${status === 'sent' ? 'form__status--success' : status === 'failed' ? 'form__status--error' : ''}`} role="status">{statusMsg}</p>}
              <p className="t-small muted">Respondemos por email o por WhatsApp.</p>
            </form>
          </div>
        </div>
      </section>
    </Page>
  );
};

/** Mi orden — tracker de estado. */
export const OrderPage = () => {
  const COVER = '(max-width: 639px) 200vw, (max-width: 1023px) 100vw, 1280px';
  return (
    <Page title="Estado de mi orden | NetSurex" description="Escribe el código de tu comprobante para ver en qué fase está tu reparación o proyecto.">
      <section className="section section--page" aria-labelledby="page-h">
        <div className="wrap">
          <PageHead id="page-h" title="Estado de tu reparación o proyecto" lead="Escribe el código de tu comprobante para ver en qué fase está tu equipo o tu proyecto." />
        </div>
      </section>
      <section className="section section--auto">
        <div className="wrap">
          <div className="grid grid--top fill">
            <div className="span-6 stack-6">
              <Tracker />
            </div>
            <div className="frame frame--photo frame--fill span-6 start-7">
              <Photo className="frame__img" src="/assets/img/photo-f27940250.webp" sizes={COVER} />
            </div>
          </div>
        </div>
      </section>
    </Page>
  );
};

/** Nosotros — equipo. */
export const AboutPage = () => {
  const { team } = useSiteData();
  const COVER = '(max-width: 639px) 200vw, (max-width: 1023px) 100vw, 1280px';
  return (
    <Page title="Sobre NetSurex: equipo y experiencia" description="Conoce al equipo que dirige NetSurex: experiencia en software, seguridad electrónica y soporte técnico.">
      <section className="section section--page" aria-labelledby="page-h">
        <div className="wrap">
          <PageHead id="page-h" title="Sobre NetSurex" lead="Ingeniería de software, seguridad electrónica e infraestructura tecnológica en un solo lugar." />
        </div>
      </section>
      <section className="section section--auto">
        <div className="wrap">
          <div className="grid grid--top">
            {team.map((member) => (
              <React.Fragment key={member.id}>
                <div className="span-6 stack-5">
                  <h2>{member.name}</h2>
                  <p className="t-card muted">{member.role}</p>
                  <p className="measure">{member.bio}</p>
                  {member.linkedin && <a className="link" href={member.linkedin} target="_blank" rel="noopener noreferrer">Ver su perfil en LinkedIn</a>}
                </div>
                {member.image && (
                  <figure className="develop span-6 start-7">
                    <Photo src={member.image} alt={member.name} sizes={COVER} />
                  </figure>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </Page>
  );
};

/** Old addresses that now live on the home page. */
export const Redirect = ({ hash }) => {
  useEffect(() => {
    window.location.replace(`/${window.location.search}#${hash}`);
  }, [hash]);
  return null;
};
