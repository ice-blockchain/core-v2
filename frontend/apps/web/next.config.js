/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ion/ui", "@ion/auth-ui", "react-native-svg"],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
      "react-native/Libraries/Utilities/codegenNativeComponent":
        "react-native-web/dist/cjs/modules/UnimplementedView",
    };

    config.resolve.extensions = [
      ".web.js",
      ".web.jsx",
      ".web.ts",
      ".web.tsx",
      ...(config.resolve.extensions || []),
    ];

    return config;
  },
};

module.exports = nextConfig;
