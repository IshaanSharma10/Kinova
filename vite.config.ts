import { defineConfig, ProxyOptions } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const apiProxy: ProxyOptions = {
  target: "https://internal-backend-1ju5.onrender.com",
  changeOrigin: true,
  secure: true,
  rewrite: (path) => path.replace(/^\/api/, ""),
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": apiProxy,
    },
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
}));
