/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required when using `output: 'export'`
    domains: ["portfolio.cdn.gadcoder.com"],
    deviceSizes: [320, 420, 768, 1024, 1200],
    loader: "default",
  },
};

module.exports = nextConfig;
