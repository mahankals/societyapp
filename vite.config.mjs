import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function hotFilePlugin() {
  const hotPath = path.resolve(__dirname, 'public/hot');
  return {
    name: 'vite-hot-file',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address();
        const port = typeof address === 'object' && address ? address.port : 5173;
        fs.writeFileSync(hotPath, `http://localhost:${port}\n`);
      });

      const cleanUp = () => {
        if (fs.existsSync(hotPath)) {
          try { fs.unlinkSync(hotPath); } catch {}
        }
      };

      process.on('exit', cleanUp);
      process.on('SIGINT', () => { cleanUp(); process.exit(); });
      process.on('SIGTERM', () => { cleanUp(); process.exit(); });
      process.on('SIGHUP', () => { cleanUp(); process.exit(); });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    hotFilePlugin(),
  ],
  publicDir: false,
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
    cors: true,
  },
  build: {
    outDir: 'public/dist',
    emptyOutDir: true,
    manifest: 'manifest.json',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'resources/js/main.jsx'),
        app: path.resolve(__dirname, 'resources/css/app.css'),
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
});
