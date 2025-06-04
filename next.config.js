/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required when using `output: 'export'`
  },
};

module.exports = nextConfig;

module.exports = {
  images: {
    domains: ["portfolio.cdn.gadcoder.com"],
    path: "/_next/image",
    deviceSizes: [320, 420, 768, 1024, 1200], // adjust sizes based on your needs
    path: "/_next/image",
    loader: "default",
  },
};
