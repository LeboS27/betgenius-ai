/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.api-sports.io' },
      { protocol: 'https', hostname: 'media-3.api-sports.io' },
      { protocol: 'https', hostname: 'media-4.api-sports.io' },
      { protocol: 'https', hostname: '**.api-football.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'crests.football-data.org' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@sentry/nextjs'],
  },
}

export default nextConfig
