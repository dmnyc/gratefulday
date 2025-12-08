import path from "node:path";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "localhost", // Changed from "::" for better compatibility
    port: 8080,
    open: true, // Automatically open browser when server starts
  },
  plugins: [
    react(),
  ],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    force: true, // Force re-optimization
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    onConsoleLog(log) {
      return !log.includes("React Router Future Flag Warning");
    },
    env: {
      DEBUG_PRINT_LIMIT: '0', // Suppress DOM output that exceeds AI context windows
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'], // Ensure single React instance
  },
}));