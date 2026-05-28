/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.tiendainglesa.com.uy' },
      { protocol: 'https', hostname: '**.tata.com.uy' },
      { protocol: 'https', hostname: '**.disco.com.uy' },
      { protocol: 'https', hostname: '**.eldorado.com.uy' },
    ],
  },
};
module.exports = nextConfig;
