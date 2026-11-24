import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Three ways to run this:
//   npm run dev         the app on http://localhost:5173, with /api proxied to the control plane (PEGASUS_URL,
//                       default http://127.0.0.1:8443). Sign-in works because the browser sees one origin.
//   npm run build       the app, built into ../pegasus_cloud/static/next/, served by Flask at /next/.
//   npm run build:demo  the design demo: one self-contained HTML file (sample data, opens by double-click).
const backend = process.env.PEGASUS_URL || "http://127.0.0.1:8443";
const demo = process.env.DEMO === "1";

export default defineConfig({
  base: demo ? "./" : "/next/",
  plugins: [react(), tailwindcss(), ...(demo ? [viteSingleFile()] : [])],
  server: { proxy: { "/api": { target: backend } } },
  build: { chunkSizeWarningLimit: 1200, ...(demo
    ? { outDir: "dist/demo", emptyOutDir: true, rollupOptions: { input: "concept-a.html" } }
    : { outDir: "../pegasus_cloud/static/next", emptyOutDir: true, rollupOptions: { input: "index.html" } }) },
});
