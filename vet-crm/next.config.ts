import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'prisma'],
  /* config options here */
  // Evita que o Next tente inferir a raiz do workspace a partir de lockfiles fora do projeto
  // (ex.: C:\\Users\\claud\\package-lock.json) e gere warning/trace incorreto.
  outputFileTracingRoot: process.cwd(),
  eslint: {
    // Desativa o ESLint durante o build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Desativa a verificação de tipos durante o build
    ignoreBuildErrors: true,
  },
  // Configuração do Turbopack (substitui experimental.turbo)
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
