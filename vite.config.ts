import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'ERP/WMS CK-CNC',
        short_name: 'ERP/WMS',
        description: 'Hệ thống quản lý sản xuất và kho bãi toàn diện',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60,
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
    visualizer({
      filename: "dist/stats.html",
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  server: {
    port: 3000,
    host: true,
    open: true,
    strictPort: false,
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  
  preview: {
    port: 3001,
    host: true,
    open: false,
  },
  
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: mode === 'development',
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('class-variance-authority')) {
              return 'vendor-ui';
            }
            if (id.includes('@tanstack') || id.includes('zustand') || id.includes('axios')) {
              return 'vendor-data';
            }
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'vendor-forms';
            }
            if (id.includes('date-fns') || id.includes('dayjs')) {
              return 'vendor-date';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // ✅ Thêm pdfjs-dist vào vendor riêng
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdf';
            }
            return 'vendor-other';
          }
          if (id.includes('/modules/warehouse/')) {
            return 'warehouse';
          }
          if (id.includes('/modules/manufacturing/')) {
            return 'manufacturing';
          }
          if (id.includes('/modules/reports/')) {
            return 'reports';
          }
          if (id.includes('/modules/master-data/')) {
            return 'master-data';
          }
          if (id.includes('/modules/system/')) {
            return 'system';
          }
          if (id.includes('/modules/account/')) {
            return 'account';
          }
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/css/[name].[hash].[ext]';
          }
          if (assetInfo.name?.endsWith('.png') || assetInfo.name?.endsWith('.jpg') || assetInfo.name?.endsWith('.svg')) {
            return 'assets/images/[name].[hash].[ext]';
          }
          if (assetInfo.name?.endsWith('.woff2') || assetInfo.name?.endsWith('.woff') || assetInfo.name?.endsWith('.ttf')) {
            return 'assets/fonts/[name].[hash].[ext]';
          }
          return 'assets/[name].[hash].[ext]';
        },
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
      },
    },
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
    // ✅ Thêm commonjsOptions để hỗ trợ pdfjs-dist
    commonjsOptions: {
      include: [/pdfjs-dist/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
  
  css: {
    devSourcemap: mode === 'development',
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: mode === 'production' ? '[hash:base64:8]' : '[name]_[local]_[hash:base64:4]',
    },
  },
  
  envPrefix: ['VITE_', 'SENTRY_', 'GA_'],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'zustand',
      'lucide-react',
      'date-fns',
      'i18next',
      'react-i18next',
      // ✅ Thêm pdfjs-dist
      'pdfjs-dist',
    ],
    exclude: [],
    // ✅ Thêm esbuild options cho pdfjs-dist
    esbuildOptions: {
      target: 'es2020',
    },
  },
  
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
}));