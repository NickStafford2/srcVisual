import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: process.env.SRCDIFFVISUAL_POLL_FILES === "1"
      ? { usePolling: true, interval: 250 }
      : undefined,
    proxy: {
      "/api": process.env.SRCDIFFVISUAL_API_TARGET ?? "http://127.0.0.1:5000",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
