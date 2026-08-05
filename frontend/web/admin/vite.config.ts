import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    // Force every import of 'react' / 'react-dom' (including deep inside
    // AntD's @rc-component/* packages) to resolve to the single copy that
    // lives in this workspace's own node_modules, NOT the React-18 copy
    // hoisted to the monorepo root by the React Native project.
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    // Belt-and-suspenders: tell Vite not to create multiple instances of these.
    dedupe: ['react', 'react-dom'],
  },
});
