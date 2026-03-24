/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@ion/ui",
    "react-native-safe-area-context",
    "react-native-svg",
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native": "react-native-web",
    };
    config.resolve.extensions = [
      ".web.js",
      ".web.jsx",
      ".web.ts",
      ".web.tsx",
      ...config.resolve.extensions,
    ];
    return config;
  },
};

module.exports = nextConfig;
