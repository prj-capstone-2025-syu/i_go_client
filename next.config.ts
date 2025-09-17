import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true, // 기존 설정 유지 또는 필요에 따라 설정

  // eslint 설정
  eslint: {
    ignoreDuringBuilds: true,
  },

  // devIndicators 설정
  devIndicators: false, // Dev Tools UI 완전히 비활성화

  output: "standalone",

  // webpack 설정
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "./src"),
    };
    return config;
  },
};

export default nextConfig;
