import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mmecimage.cn",
      },
      {
        protocol: "https",
        hostname: "store.mp.video.tencent-cloud.com",
      },
    ],
  },
};

export default nextConfig;
