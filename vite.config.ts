import { defineConfig, ProxyOptions } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Backend proxy configuration
// Configured for localhost backend
const apiProxy: ProxyOptions = {
  target: "http://localhost:8000",
  changeOrigin: true,
  secure: false,
  rewrite: (path) => path.replace(/^\/api/, ""),
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173, // Standard Vite port
    proxy: {
      "/api": apiProxy,
    },
    // Handle SPA routing - serve index.html for all non-file requests
    fs: {
      strict: false,
    },
  },

  // Handle SPA routing in preview mode as well
  preview: {
    port: 5173,
  },

  // Build configuration
  build: {
    outDir: "dist",
    sourcemap: mode === "development",
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Ensure proper base path for SPA routing
  base: "/",

  // App type for SPA
  appType: "spa",
}));
