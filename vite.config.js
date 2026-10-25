import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE_PATH must match the GitHub Pages path: "/<repo-name>/" for project pages, "/" for a custom domain.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let base = env.VITE_BASE_PATH || '/';
  if (!base.startsWith('/')) base = '/' + base;
  if (!base.endsWith('/')) base += '/';
  return {
    base,
    plugins: [react(), {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', (env.VITE_SITE_URL || '').replace(/\/$/, '')),
    }],
    build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 700 },
    test: { environment: 'node', include: ['tests/unit/**/*.test.js'] },
  };
});
