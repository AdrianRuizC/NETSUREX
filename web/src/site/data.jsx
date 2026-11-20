import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const SiteDataContext = createContext(null);

/** All public content from the backend (GET /api/public/bootstrap). */
export const SiteDataProvider = ({ children }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.get('/public/bootstrap'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !data) {
    return (
      <main id="top" className="offline">
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <h1>NetSurex no pudo cargar el sitio</h1>
              <p>{error}</p>
            </div>
            <button type="button" className="btn btn--primary" onClick={load}>Volver a cargar la página</button>
          </div>
        </section>
      </main>
    );
  }
  if (!data) return <div className="booting" aria-busy="true" />;
  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
};

export const useSiteData = () => useContext(SiteDataContext);
