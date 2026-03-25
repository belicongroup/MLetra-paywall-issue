import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mletras.com",
  appName: "M Letras Payment Test",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;
