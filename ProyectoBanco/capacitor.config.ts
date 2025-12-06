import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.proyectobanco.app',
  appName: 'Banco App',
  webDir: 'dist/ProyectoBanco/browser',
  server: {
    androidScheme: 'https',
    cleartext: true // Permite conexiones HTTP (útil para desarrollo)
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  }
};

export default config;
