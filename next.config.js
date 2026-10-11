/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    domains: ['ui-avatars.com'],
    unoptimized: true,
  },
}

module.exports = nextConfig
