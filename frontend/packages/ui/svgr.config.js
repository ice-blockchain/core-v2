/** @type {import('@svgr/core').Config} */
module.exports = {
  native: true,
  typescript: true,
  plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
  svgoConfig: {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
    ],
  },
  replaceAttrValues: {
    "#000": "{color}",
    "#000000": "{color}",
    black: "{color}",
    "#fff": "{color}",
    "#ffffff": "{color}",
    white: "{color}",
  },
};
