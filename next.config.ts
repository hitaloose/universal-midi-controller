import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/universal-midi-controller",
  assetPrefix: "/universal-midi-controller/",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
