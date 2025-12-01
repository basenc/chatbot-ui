import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/chatbot-ui" : "",
  assetPrefix: isProd ? "/chatbot-ui/" : "",
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
