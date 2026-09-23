import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  generateEtags: false,
  async rewrites() {
    // 1. Explicit external backend URL (e.g. deployed on Railway, Render, Fly.io, custom VPS)
    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL &&
       !process.env.NEXT_PUBLIC_API_URL.includes("localhost") &&
       !process.env.NEXT_PUBLIC_API_URL.includes("127.0.0.1")
        ? process.env.NEXT_PUBLIC_API_URL
        : null);

    if (backendUrl) {
      const cleanUrl = backendUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
      return [
        {
          source: "/api/v1/:path*",
          destination: `${cleanUrl}/api/v1/:path*`,
        },
      ];
    }

    // 2. Local development without external BACKEND_URL
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/v1/:path*",
          destination: "http://127.0.0.1:8000/api/v1/:path*",
        },
      ];
    }

    // 3. Production on Vercel (monorepo serverless deployment)
    // Forward /api/v1 requests to the Vercel Python serverless entrypoint
    return [
      {
        source: "/api/v1/:path*",
        destination: "/api/index.py",
      },
      {
        source: "/api/:path*",
        destination: "/api/index.py",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
