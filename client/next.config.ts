import type { NextConfig } from "next";

import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false,
})(nextConfig);