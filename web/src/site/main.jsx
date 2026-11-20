import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SiteDataProvider } from '@/site/data';
import { startKit } from '@/site/kit';
import Home from '@/site/Home';
import {
  ServicesPage, PortfolioPage, ProjectPage, BlogPage, PostPage, QuestionsPage,
  PrivacyPage, TermsPage, CreditsPage, NotFoundPage,
  MethodPage, PricesPage, ContactPage, OrderPage, AboutPage,
} from '@/site/Pages';

// Sitio público de NetSurex (sistema del kit de diseño en public/assets; sin Tailwind).
const KitInitializer = () => {
  useEffect(() => {
    startKit();
  }, []);
  return null;
};

const App = () => (
  <BrowserRouter>
    <SiteDataProvider>
      <KitInitializer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/servicios" element={<ServicesPage />} />
        <Route path="/portafolio" element={<PortfolioPage />} />
        <Route path="/portafolio/:projectId" element={<ProjectPage />} />
        <Route path="/metodo" element={<MethodPage />} />
        <Route path="/precios" element={<PricesPage />} />
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/mi-orden" element={<OrderPage />} />
        <Route path="/nosotros" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:postId" element={<PostPage />} />
        <Route path="/preguntas" element={<QuestionsPage />} />
        <Route path="/privacidad" element={<PrivacyPage />} />
        <Route path="/terminos" element={<TermsPage />} />
        <Route path="/creditos" element={<CreditsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteDataProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
