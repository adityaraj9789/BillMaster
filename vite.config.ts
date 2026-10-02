import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { defineConfig, Plugin } from 'vite';
import { apiRouter } from './src/server/apiRouter';

dotenv.config();

function apiServerPlugin(): Plugin {
  return {
    name: 'billmaster-api-server',
    configureServer(server) {
      server.middlewares.use(express.json({ limit: '25mb' }));
      server.middlewares.use(express.urlencoded({ extended: true, limit: '25mb' }));
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api')) {
          req.url = req.url.replace(/^\/api/, '');
          return (apiRouter as any)(req, res, next);
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

