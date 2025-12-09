<<<<<<< HEAD
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react-swc";
// import path from "path";
// import viteCompression from "vite-plugin-compression";
// import viteImagemin from "vite-plugin-imagemin";
// import { visualizer } from "rollup-plugin-visualizer";
// import webfontDownload from "vite-plugin-webfont-dl";

// // https://vitejs.dev/config/
// export default defineConfig(({ mode }) => ({
//   server: {
//     host: "::",
//     port: 8080,
//     proxy: {
//       '/api': {
//         target: 'http://localhost:5000',
//         changeOrigin: true,
//         secure: false,
//         ws: true,
//         configure: (proxy, _options) => {
//           proxy.on('proxyReq', (proxyReq, req, _res) => {
//             // Forward cookies
//             if (req.headers.cookie) {
//               proxyReq.setHeader('cookie', req.headers.cookie);
//             }
//           });
//         },
//       },
//       '/admin': {
//         target: 'http://localhost:5000',
//         changeOrigin: true,
//         secure: false,
//         configure: (proxy, _options) => {
//           proxy.on('proxyReq', (proxyReq, req, _res) => {
//             // Forward cookies
//             if (req.headers.cookie) {
//               proxyReq.setHeader('cookie', req.headers.cookie);
//             }
//           });
//         },
//       },
//     },
//   },
//   plugins: [
//     react(),

//     // Optimize images during build
//     viteImagemin({
//       gifsicle: {
//         optimizationLevel: 7,
//         interlaced: false,
//       },
//       optipng: {
//         optimizationLevel: 7,
//       },
//       mozjpeg: {
//         quality: 80,
//       },
//       pngquant: {
//         quality: [0.8, 0.9],
//         speed: 4,
//       },
//       svgo: {
//         plugins: [
//           {
//             name: 'removeViewBox',
//             active: false,
//           },
//           {
//             name: 'removeEmptyAttrs',
//             active: false,
//           },
//         ],
//       },
//     }),

//     // Download and bundle web fonts
//     webfontDownload(),

//     // Compress assets with gzip
//     viteCompression({
//       algorithm: 'gzip',
//       ext: '.gz',
//       threshold: 10240, // Only compress files > 10KB
//       deleteOriginFile: false,
//     }),

//     // Compress assets with brotli
//     viteCompression({
//       algorithm: 'brotliCompress',
//       ext: '.br',
//       threshold: 10240,
//       deleteOriginFile: false,
//     }),

//     // Bundle analyzer (only in analyze mode)
//     mode === 'analyze' && visualizer({
//       open: true,
//       filename: 'dist/stats.html',
//       gzipSize: true,
//       brotliSize: true,
//     }),
//   ].filter(Boolean),

//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//       // Route all `import { toast } from 'sonner'` to our branded wrapper
//       "sonner": path.resolve(__dirname, "./src/lib/toast"),
//     },
//   },

//   // Build optimizations
//   build: {
//     target: 'es2020', // ES2020 required for BigInt support (Web3 libraries)
//     minify: 'esbuild',
//     cssMinify: true,

//     // Enable code splitting
//     rollupOptions: {
//       output: {
//         manualChunks: {
//           // Vendor chunks for better caching
//           'react-vendor': ['react', 'react-dom', 'react-router-dom'],
//           'ui-vendor': [
//             '@radix-ui/react-avatar',
//             '@radix-ui/react-dialog',
//             '@radix-ui/react-dropdown-menu',
//             '@radix-ui/react-popover',
//             '@radix-ui/react-select',
//             '@radix-ui/react-tooltip',
//           ],
//           'web3-vendor': ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
//           'animation-vendor': ['framer-motion', 'gsap'],
//           'query-vendor': ['@tanstack/react-query', 'axios'],
//         },
//         // Optimize chunk file names
//         chunkFileNames: 'assets/js/[name]-[hash].js',
//         entryFileNames: 'assets/js/[name]-[hash].js',
//         assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
//       },
//     },

//     // Chunk size warnings
//     chunkSizeWarningLimit: 1000,

//     // Source maps for production debugging (disable for smaller build)
//     sourcemap: false,
//   },

//   // Optimize dependencies
//   optimizeDeps: {
//     include: [
//       'react',
//       'react-dom',
//       'react-router-dom',
//       '@tanstack/react-query',
//       'axios',
//       'framer-motion',
//       'lucide-react',
//     ],
//   },
// }));
=======
>>>>>>> f5e1b66bb20dd8258333f87d943ad5ce1ace2679
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import viteCompression from "vite-plugin-compression";
import viteImagemin from "vite-plugin-imagemin";
import { visualizer } from "rollup-plugin-visualizer";
import webfontDownload from "vite-plugin-webfont-dl";
<<<<<<< HEAD
import { VitePWA } from "vite-plugin-pwa";
=======
>>>>>>> f5e1b66bb20dd8258333f87d943ad5ce1ace2679

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        // Use environment variable for backend URL (useful for tunnels)
        target: process.env.VITE_BACKEND_URL || 'https://tripit-xgvr.onrender.com',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward cookies
            if (req.headers.cookie) {
              proxyReq.setHeader('cookie', req.headers.cookie);
            }
          });
        },
      },
      '/admin': {
        target: process.env.VITE_BACKEND_URL || 'https://tripit-xgvr.onrender.com',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward cookies
            if (req.headers.cookie) {
              proxyReq.setHeader('cookie', req.headers.cookie);
            }
          });
        },
      },
    },
  },
<<<<<<< HEAD

  plugins: [
    react(),

    // 🔹 PWA plugin with enhanced configuration
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'robots.txt',
        'apple-touch-icon.png',
        'logo.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'offline.html',
      ],
      devOptions: {
        enabled: true,          // enable PWA in `npm run dev` for testing
        type: 'module',
      },
      manifest: {
        name: 'TripIt - Safety-Verified Travel Discovery',
        short_name: 'TripIt',
        description: 'Discover travel itineraries with safety-verified credibility on TripIt - a caravan-driven platform for travelers.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0f172a',
        orientation: 'portrait-primary',
        categories: ['travel', 'navigation', 'social'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif,woff,woff2}'],

        // Increase max file size for caching
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB

        // Clean up old caches
        cleanupOutdatedCaches: true,

        // Skip waiting and claim clients immediately
        skipWaiting: true,
        clientsClaim: true,

        // Offline fallback page
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/, /^\/admin/],

        runtimeCaching: [
          {
            // Cache API calls with NetworkFirst strategy
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache admin API calls
            urlPattern: /\/admin\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'admin-api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images with CacheFirst strategy
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache Google Fonts
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
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),

=======
  plugins: [
    react(),

>>>>>>> f5e1b66bb20dd8258333f87d943ad5ce1ace2679
    // Optimize images during build
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 80,
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4,
      },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox',
            active: false,
          },
          {
            name: 'removeEmptyAttrs',
            active: false,
          },
        ],
      },
    }),

    // Download and bundle web fonts
    webfontDownload(),

    // Compress assets with gzip
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false,
    }),

    // Compress assets with brotli
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    }),

    // Bundle analyzer (only in analyze mode)
<<<<<<< HEAD
    mode === 'analyze' &&
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
=======
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
>>>>>>> f5e1b66bb20dd8258333f87d943ad5ce1ace2679
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Build optimizations
  build: {
    target: 'es2020', // ES2020 required for BigInt support (Web3 libraries)
    minify: 'esbuild',
    cssMinify: true,

    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tooltip',
          ],
          'web3-vendor': ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
          'animation-vendor': ['framer-motion', 'gsap'],
          'query-vendor': ['@tanstack/react-query', 'axios'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,

    // Source maps for production debugging (disable for smaller build)
    sourcemap: false,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'framer-motion',
      'lucide-react',
      'sonner',
    ],
  },
}));
