/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@kuquba/config"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  }
};

export default nextConfig;
