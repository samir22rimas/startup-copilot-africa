import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: {
    // 'buildActivity' was removed from the NextConfig type; use 'position' if needed
    position: "bottom-right",
  },
};

export default nextConfig;
