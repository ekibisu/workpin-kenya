import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Add this to help the HMR and Preview bypass proxy issues
    strictPort: true,
    hmr: {
      clientPort: 443,
    },
    allowedHosts: [
      ".lovable.app",
      ".lovable.dev"
    ]
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Keep these to prevent duplicate library instances
    dedupe: ["react", "react-dom"],
  },
}));