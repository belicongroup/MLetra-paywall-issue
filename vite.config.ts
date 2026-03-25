import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5174,
  },
  resolve: {
    alias: {
      // Reuse the production app code (subscription + paywall logic).
      "@": path.resolve(__dirname, "../src"),
    },
    dedupe: ["react", "react-dom"],
  },
});
