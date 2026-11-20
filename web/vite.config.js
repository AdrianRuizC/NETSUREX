import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Backend FastAPI (carpeta ../backend). Cambia el destino con NETSUREX_API_URL.
const apiTarget = process.env.NETSUREX_API_URL || 'http://127.0.0.1:8000';
const proxy = {
	'/api': { target: apiTarget, changeOrigin: true },
	'/uploads': { target: apiTarget, changeOrigin: true },
};

// Dos aplicaciones: el sitio público (index.html, sistema del kit de diseño) y el panel
// (admin/index.html, Tailwind). En desarrollo, /login y /admin/* sirven el panel.
const adminFallback = {
	name: 'netsurex-admin-fallback',
	configureServer(server) {
		server.middlewares.use((req, _res, next) => {
			const url = req.url || '';
			if (url === '/login' || url.startsWith('/login?') || url === '/admin' || /^\/admin\/(?!index\.html)[^.]*$/.test(url.split('?')[0])) {
				req.url = '/admin/index.html';
			}
			next();
		});
	},
};

export default defineConfig({
	base: '/',
	plugins: [react(), adminFallback],
	server: { proxy },
	preview: { proxy },
	resolve: {
		extensions: ['.jsx', '.js'],
		alias: { '@': path.resolve(__dirname, './src') },
	},
	build: {
		rollupOptions: {
			input: {
				site: path.resolve(__dirname, 'index.html'),
				admin: path.resolve(__dirname, 'admin/index.html'),
			},
		},
	},
});
