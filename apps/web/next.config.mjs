/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  transpilePackages: ["@kuquba/config"],
  images: {
    formats: ["image/avif", "image/webp"]
  }
};

export default nextConfig;
