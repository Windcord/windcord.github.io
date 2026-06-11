import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version?: string };
  return {
    base: env.VITE_BASE_PATH || "/",
    define: {
      "import.meta.env.VITE_FRONTEND_VERSION": JSON.stringify(packageJson.version ?? "unknown")
    },
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": "http://localhost:4000",
        "/uploads": "http://localhost:4000"
      }
    }
  };
});
