/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for react-pdf / pdfjs-dist to work in Next.js
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
