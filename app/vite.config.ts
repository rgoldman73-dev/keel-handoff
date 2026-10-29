import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { viteSingleFile } from "vite-plugin-singlefile"

// `vite build` emits a small static dist/ (one Three chunk, lazily loaded).
// `vite build --mode single` inlines everything into one HTML file for hosts
// that only take a single page.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "single" ? [viteSingleFile()] : [])],
  assetsInclude: ["**/*.glb"],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    chunkSizeWarningLimit: 4000,
  },
}))
