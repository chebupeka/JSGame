import { defineConfig } from "vite";

// Игра открывается на localhost, песочница (этап 2) — на 127.0.0.1:
// один сервер, два разных origin.
export default defineConfig({
  server: {
    host: `127.0.0.1`,
    port: 5173,
    strictPort: true,
  },
});
