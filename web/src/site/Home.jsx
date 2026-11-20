import React from 'react';
import { Page, MAIN_ACTION } from '@/site/Chrome';
import { useSiteData } from '@/site/data';
import { Arrow, Photo } from '@/site/kit';

const COVER = '(max-width: 639px) 200vw, (max-width: 1023px) 100vw, 1280px';

/** Inicio resumido: hero + servicios destacados + CTA.
   Cada sección completa tiene su propia página con ruta propia. */

const Hero = () => (
  <section className="hero hero--photo" data-enter data-calm="left" aria-labelledby="hero-h">
    <picture className="hero__bg" data-phone-fill>
      <source media="(max-width: 639px)" srcSet="/assets/img/photo-f26575836-780x975.webp 780w" sizes="100vw" />
      <img
        src="/assets/img/photo-f26575836.webp"
        srcSet="/assets/img/photo-f26575836-500.webp 500w, /assets/img/photo-f26575836-960.webp 960w, /assets/img/photo-f26575836-1280.webp 1280w, /assets/img/photo-f26575836.webp 1920w"
        sizes="100vw"
        width="1920"
        height="1275"
        alt="Pasillo de racks de servidores iluminados en azul"
        fetchpriority="high"
        decoding="async"
        data-source="stand-in"
        data-subject="Pasillo de racks de servidores iluminados en azul"
      />
    </picture>
    <div className="wrap">
      <div className="hero-text">
        <div className="hero__text">
          <h1 id="hero-h">Software, CCTV y soporte técnico</h1>
          <p className="hero__lead">
            Apps para Android, iOS, web y escritorio, cámaras, redes y reparación de equipos, para empresas y hogares. Atendemos desde el 4 de mayo de 2026.
          </p>
          <div className="btn-row">
            <a className="btn btn--primary" href="/contacto">{MAIN_ACTION}<Arrow /></a>
            <a className="btn btn--secondary" href="/servicios">Ver los servicios</a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const ServicesPreview = ({ divisions, services }) => {
  const rows = divisions.filter((d) => d.image).slice(0, 4);
  return (
    <section className="section" aria-labelledby="servicios-h">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <h2 id="servicios-h">Servicios por división</h2>
            <p>Para empresas y para hogares.</p>
          </div>
          <a className="link" href="/servicios">Ver los {services.length} servicios <Arrow /></a>
        </div>
        <div className="grid">
          {rows.map((d) => {
            const count = services.filter((s) => s.division_id === d.id).length;
            return (
              <a key={d.id} className="tile span-3" href={`/servicios#${d.id}`}>
                <div className="tile__media"><Photo src={d.image} sizes="(max-width: 639px) 100vw, 320px" /></div>
                <div className="tile__head"><h3>{d.name}</h3></div>
                <p>{d.summary}</p>
                <p className="t-small muted">{count} {count === 1 ? 'servicio' : 'servicios'}</p>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const WorkPreview = ({ projects, divisions }) => {
  const picked = [];
  for (const d of divisions) {
    const p = projects.find((x) => x.division_id === d.id && x.image);
    if (p) picked.push(p);
    if (picked.length === 3) break;
  }
  return (
    <section className="section ground-inverse" aria-labelledby="trabajo-h">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <h2 id="trabajo-h">Proyectos destacados</h2>
            <p>Un trabajo tipo de cada división, con su alcance y lo que se entrega.</p>
          </div>
          <a className="link" href="/portafolio">Ver el portafolio <Arrow /></a>
        </div>
        <div className="grid">
          {picked.map((p) => (
            <a key={p.id} className="tile span-4" href={`/portafolio/${p.id}`}>
              <div className="tile__media"><Photo src={p.image} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 100vw, 640px" /></div>
              <div className="tile__head"><h3>{p.title}</h3></div>
              <p>{p.short_description}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const QuickLinks = () => (
  <section className="section" aria-labelledby="ql-h">
    <div className="wrap">
      <div className="section-head">
        <h2 id="ql-h">Explora más</h2>
        <p>Conoce al equipo, revisa las preguntas comunes o escríbenos directamente.</p>
      </div>
      <div className="grid">
        <a className="tile span-4" href="/nosotros">
          <div className="tile__media">
            <Photo src="/assets/img/photo-f39457057.webp" sizes="(max-width: 639px) 100vw, (max-width: 1023px) 100vw, 640px" />
          </div>
          <div className="tile__head"><h3>Sobre nosotros</h3></div>
          <p>Conoce al equipo que dirige NetSurex: experiencia en software, seguridad electrónica y soporte técnico.</p>
          <span className="link">Conocer al equipo <Arrow /></span>
        </a>
        <a className="tile span-4" href="/preguntas">
          <div className="tile__media">
            <Photo src="/assets/img/photo-f27940250.webp" sizes="(max-width: 639px) 100vw, (max-width: 1023px) 100vw, 640px" />
          </div>
          <div className="tile__head"><h3>Preguntas frecuentes</h3></div>
          <p>Garantías, pólizas, cobertura y el proceso de trabajo respondidas.</p>
          <span className="link">Leer preguntas <Arrow /></span>
        </a>
        <a className="tile span-4" href="/contacto">
          <div className="tile__media">
            <Photo src="/assets/img/photo-f51440522.webp" sizes="(max-width: 639px) 100vw, (max-width: 1023px) 100vw, 640px" />
          </div>
          <div className="tile__head"><h3>Contáctanos</h3></div>
          <p>Agenda un diagnóstico técnico gratuito y recibe tiempos y costos claros.</p>
          <span className="link">{MAIN_ACTION} <Arrow /></span>
        </a>
      </div>
    </div>
  </section>
);

const Cta = () => (
  <section className="section ground-inverse" aria-labelledby="cta-h">
    <div className="wrap">
      <div className="grid grid--top">
        <div className="span-7 stack-5">
          <h2 id="cta-h">¿Listo para empezar?</h2>
          <p className="t-lead">Agenda un diagnóstico técnico y recibe tiempos y costos claros.</p>
          <div className="btn-row">
            <a className="btn btn--primary" href="/contacto">{MAIN_ACTION}<Arrow /></a>
            <a className="btn btn--secondary" href="/precios">Ver precios de referencia</a>
          </div>
        </div>
        <div className="frame frame--photo span-5 start-8">
          <Photo className="frame__img" src="/assets/img/photo-f51440522.webp" sizes={COVER} />
        </div>
      </div>
    </div>
  </section>
);

const Home = () => {
  const data = useSiteData();
  return (
    <Page
      title="NetSurex: software, CCTV y soporte técnico para empresas y hogares"
      description="Apps para Android, iOS, web y escritorio, cámaras de seguridad, redes y reparación de equipos, con diagnóstico previo y pólizas de mantenimiento."
    >
      <Hero />
      <ServicesPreview divisions={data.divisions} services={data.services} />
      <WorkPreview projects={data.projects} divisions={data.divisions} />
      <QuickLinks />
      <Cta />
    </Page>
  );
};

export default Home;
