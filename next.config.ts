import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/generate": ["./prompts/**/*"],
  },
};

export default nextConfig;
