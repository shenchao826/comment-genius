import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    cssMinify: true,
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react-dom";
          }
          if ((id.includes("/react/") && !id.includes("react-i18next")) ||
            id.includes("react-router") || id.includes("@remix-run") ||
            id.includes("clsx") || id.includes("tailwind-merge")) {
            return "framework";
          }
          if (id.includes("i18next") || id.includes("i18next-browser-languagedetector") || id.includes("react-i18next")) {
            return "i18n";
          }
          if (id.includes("@heroicons")) {
            return "icons";
          }
          if (id.includes("recharts")) {
            return "charts";
          }
          if (id.includes("jspdf") || id.includes("xlsx") || id.includes("file-saver")) {
            return "export";
          }
        },
      },
    },
  },
});
