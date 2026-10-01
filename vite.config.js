import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
export default defineConfig({
  base: './',
  // Runtime assets are copied after Vite so Syncthing can serve stable paths.
  publicDir: false,
  plugins: [preact()],
  build: { outDir: 'dist', assetsDir: 'assets/compiled', target: 'es2022' },
});
