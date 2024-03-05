import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue(), Icons({ compiler: 'vue3' })],
  // Set root to correct the output paths of HTMLs
  root: 'src',
  build: {
    emptyOutDir: false,
    outDir: '../dist',
    target: 'chrome99',
    modulePreload: false,
    minify: process.env.NODE_ENV !== 'development',
    rollupOptions: {
      input: {
        handler: resolve(__dirname, 'src/handler/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        entryFileNames: '[name]/index.js',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
