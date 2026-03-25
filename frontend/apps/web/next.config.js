/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ion/ui", "@ion/auth-ui", "react-native-svg"],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
    };
    return config;
  },
};

module.exports = nextConfig;
