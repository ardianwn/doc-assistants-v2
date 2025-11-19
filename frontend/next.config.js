/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed deprecated appDir option
  
  // Production optimization: Standalone output for Docker
  output: 'standalone',
  
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig 