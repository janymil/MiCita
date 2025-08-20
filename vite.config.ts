import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ mode }) => {
  // Load env file based on `mode` in the current working directory
  // The third parameter '' means load all env vars, not just VITE_ prefixed
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log to verify env vars are loaded during build
  console.log('Building with VITE_STACK_PROJECT_ID:', env.VITE_STACK_PROJECT_ID ? 'SET' : 'NOT SET');
  
  return {
  envPrefix: 'VITE_',
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  define: {
    global: 'globalThis',
    'import.meta.env.VITE_STACK_PROJECT_ID': JSON.stringify(env.VITE_STACK_PROJECT_ID || process.env.VITE_STACK_PROJECT_ID),
    'import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY': JSON.stringify(env.VITE_STACK_PUBLISHABLE_CLIENT_KEY || process.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  };
});
