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
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src ${scriptSrc}; object-src 'self'; base-uri 'self';`,
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);