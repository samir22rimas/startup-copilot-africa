import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** True for real HTTPS deployments (not `next start` on http://localhost). */
const isHttpsDeployment =
  Boolean(process.env.VERCEL) || (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

/** Origin of the Supabase project, for the connect-src allowlist (REST + realtime websocket). */
function supabaseOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const { host } = new URL(raw);
    return [`https://${host}`, `wss://${host}`];
  } catch {
    return [];
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js needs inline bootstrap scripts; eval is only allowed for dev tooling.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Avatars come from OAuth providers (https) or are small inline data URLs.
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseOrigins().join(" ")}${isDev ? " ws: http://localhost:*" : ""}`.trim(),
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isHttpsDeployment && !isDev ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Two years, subdomains included. Browsers ignore this over plain http (local dev).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    serverActions: {
      // Document uploads go through a server action and may be up to 25 MB
      // (the default limit is 1 MB, which silently rejected most real files).
      bodySizeLimit: "26mb",
    },
    // Requests pass through proxy.ts first; let the full upload through.
    proxyClientMaxBodySize: "26mb",
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      // pptxgenjs references Node-only modules (fs, https, ...) for features
      // that only exist on the server. Strip the `node:` prefix webpack cannot
      // handle and stub the modules out of the browser bundle.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        os: false,
        path: false,
        stream: false,
        zlib: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
