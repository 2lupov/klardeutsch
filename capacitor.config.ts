import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.klardeutsch.app',
  appName: 'KLAR',
  webDir: 'dist',
  server: {
    url: 'https://91effce9-96a1-482e-a51a-f7567fdb9bfa.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
