import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load .env from project root (codebot/) and apps/ directory
  const rootEnv = loadEnv(mode, path.resolve(__dirname, "../.."), "");
  const appsEnv = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const env = { ...appsEnv, ...rootEnv };

  const codebotPort =
    env.CODEBOT_PORT ||
    env.VITE_BACKEND_PORT ||
    (env.BACKEND_PORT && env.BACKEND_PORT !== "8000" ? env.BACKEND_PORT : "8001");
  const codebotTarget =
    env.VITE_BACKEND_URL || env.BACKEND_URL || `http://127.0.0.1:${codebotPort}`;

  const neroPort = env.NERO_BACKEND_PORT || process.env.NERO_BACKEND_PORT || "8080";
  const neroTarget =
    env.VITE_NERO_BACKEND_URL || env.NERO_BACKEND_URL || `http://127.0.0.1:${neroPort}`;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: true,
      proxy: {
        "/api/github": {
          target: neroTarget,
          changeOrigin: true,
        },
        "/api/health-neroai": {
          target: neroTarget,
          changeOrigin: true,
        },
        "/api": {
          target: codebotTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
