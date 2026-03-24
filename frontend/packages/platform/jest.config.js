module.exports = {
  projects: [
    {
      displayName: "unit",
      transform: {
        "^.+\\.tsx?$": [
          "babel-jest",
          { presets: ["@babel/preset-env", "@babel/preset-typescript"] },
        ],
      },
      testEnvironment: "node",
      roots: ["<rootDir>/src"],
      testMatch: ["**/*.test.ts"],
      testPathIgnorePatterns: [
        "app-lifecycle.test.ts",
        "keyboard.test.ts",
        "screen-dimensions.test.ts",
        "install-referrer.test.ts",
      ],
    },
    {
      displayName: "web",
      transform: {
        "^.+\\.tsx?$": [
          "babel-jest",
          { presets: ["@babel/preset-env", "@babel/preset-typescript"] },
        ],
      },
      testEnvironment: "jsdom",
      roots: ["<rootDir>/src"],
      testMatch: [
        "**/app-lifecycle.test.ts",
        "**/keyboard.test.ts",
        "**/screen-dimensions.test.ts",
        "**/install-referrer.test.ts",
      ],
    },
  ],
};
