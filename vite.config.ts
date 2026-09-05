import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { ytmusicPlugin } from "./vite-ytmusic-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    rollupOptions: {
      external: [
        /^\!/
      ],
    },
  },
  worker: {
    rollupOptions: {
      external: [
        /^\!/
      ],
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    ytmusicPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "backgrounds/*.jpg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webp,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|webp|gif|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        navigateFallbackDenylist: [/^\/~oauth/],
      },
      manifest: {
        name: "SimpMusic Desktop",
        short_name: "SimpMusic",
        description: "FOSS YouTube Music client for desktop with ad-free streaming, synced lyrics, equalizer, and Liquid Glass UI",
        theme_color: "#090f20",
        background_color: "#050811",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        categories: ["music", "entertainment"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
