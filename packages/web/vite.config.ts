import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    // atproto loopback OAuth requires the redirect to use 127.0.0.1, not localhost.
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
