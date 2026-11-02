import type { Config } from "@react-router/dev/config";

export default {
  // Server-rendered, so OAuth tokens never reach the browser.
  ssr: true,
} satisfies Config;
