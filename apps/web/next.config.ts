import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Asegúrate de que no haya configuraciones de 'experimental.turbo' 
  // que choquen con Webpack.
  webpack: (config, { isServer }) => {
    // Aquí puedes añadir configuraciones específicas de Webpack si las necesitas
    return config;
  },
};

export default nextConfig;