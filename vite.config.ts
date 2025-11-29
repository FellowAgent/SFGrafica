import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'chart-vendor': ['recharts'],
          'editor-vendor': ['@tiptap/react', '@tiptap/starter-kit'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', 'react-dropzone'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Gerar sourcemaps apenas em dev
    sourcemap: mode === 'development',
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // Forçar atualização automática do Service Worker
      registerType: 'autoUpdate',
      
      // Assets a incluir no precache
      includeAssets: [
        'favicon.png', 
        'favicon.ico',
        'logo.png',
        'placeholder.svg',
        'robots.txt'
      ],
      
      // Configuração do manifest
      manifest: {
        name: 'Fellow CRM',
        short_name: 'Fellow',
        description: 'Sistema completo de gestão B2B para sua empresa',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      
      // Configuração do Workbox
      workbox: {
        // Padrões de arquivos para precache
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        
        // Tamanho máximo de arquivo para cache (5 MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        
        // CRÍTICO: Forçar ativação imediata do novo SW
        skipWaiting: true,
        clientsClaim: true,
        
        // Limpar caches antigos automaticamente
        cleanupOutdatedCaches: true,
        
        // Não fazer precache do index.html (evita problemas de cache)
        navigateFallback: null,
        
        // Excluir arquivos que mudam frequentemente
        globIgnores: [
          '**/node_modules/**',
          'sw.js',
          'workbox-*.js'
        ],
        
        // Runtime caching para recursos externos
        runtimeCaching: [
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Imagens externas
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          }
        ]
      },
      
      // Dev options
      devOptions: {
        enabled: false, // Desabilitar PWA em dev para evitar problemas
        type: 'module'
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
