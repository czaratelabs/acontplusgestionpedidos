import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    return config;
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    // En desarrollo Next/Webpack usan eval para source maps; sin 'unsafe-eval' DevTools marca el aviso.
    const scriptSrc = isDev
      ? "'self' 'unsafe-eval' 'unsafe-inline'"
      : "'self' 'unsafe-inline'";
    
    // Permitir conexiones al backend en desarrollo y estilos inline necesarios para React/Next.js
    const connectSrc = isDev
      ? "'self' http://localhost:3001 ws://localhost:*"
      : "'self'";
    
    // Permitir imágenes de dicebear.com para avatares generados
    const imgSrc = "'self' https://api.dicebear.com data:";
    
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; connect-src ${connectSrc}; img-src ${imgSrc}; object-src 'self'; base-uri 'self';`,
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);