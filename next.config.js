/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // The first legacy-dimension lookup may need longer than a warm cached build.
  staticPageGenerationTimeout: 180,
};

module.exports = nextConfig;
