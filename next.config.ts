import type { NextConfig } from "next";
import { version as nextVersion } from "next/package.json";

const [major, minor] = nextVersion.split(".").map(Number);
const supportsTopLevelTypedRoutes = major > 15 || (major === 15 && minor >= 5);

const nextConfig: NextConfig = supportsTopLevelTypedRoutes
  ? { typedRoutes: true }
  : {
      experimental: {
        typedRoutes: true,
      },
    };

export default nextConfig;
