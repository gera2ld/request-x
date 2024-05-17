import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vitest/config';

const defaultConfig = defineConfig({
  plugins: [vue(), Icons({ compiler: 'vue3' })],
  build: {
    target: 'chrome99',
    modulePreload: false,
    minify: process.env.NODE_ENV !== 'development',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

const configBackground = defineConfig({
  ...defaultConfig,
  // Set root to correct the output paths of HTMLs
  root: 'src',
  build: {
    ...defaultConfig.build,
    emptyOutDir: false,
    outDir: '../dist',
    rollupOptions: {
      input: {
        handler: resolve(__dirname, 'src/handler/index.ts'),
        options: resolve(__dirname, 'src/options/index.html'),
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        entryFileNames: '[name]/index.js',
      },
    },
  },
});

const configContent = defineConfig({
  ...defaultConfig,
  // Set root to correct the output paths of HTMLs
  root: 'src',
  build: {
    ...defaultConfig.build,
    emptyOutDir: false,
    outDir: '../dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: '[name]/index.js',
        format: 'iife',
      },
    },
  },
});

const configConnector = defineConfig({
  ...defaultConfig,
  build: {
    ...defaultConfig.build,
    outDir: 'lib',
    lib: {
      entry: resolve(__dirname, 'src/connector/index.ts'),
      fileName: 'index',
      formats: ['es'],
    },
  },
});

const configMap = {
  background: configBackground,
  content: configContent,
  connector: configConnector,
};

const config = configMap[process.env.ENTRY || ''] || configMap.background;
export default config;
