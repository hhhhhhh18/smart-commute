import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.smartcommute.app",
  appName: "Smart Commute",

  server: {
    url: "https://smart-commute-blush.vercel.app",
    cleartext: true,
  },
};

export default config;