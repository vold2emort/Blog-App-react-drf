import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": import.meta.dirname + "/src",
      },
    },
    server: {
      proxy: {
        "/api": {
          target: env.LOCAL,
          changeOrigin: true,
        },
        "/media": {
          target: env.LOCAL,
          changeOrigin: true,
        },
      },
    },
  };
});
