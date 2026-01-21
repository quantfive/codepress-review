const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@octokit/.*|@openai/.*|@exodus/.*|html-encoding-sniffer|whatwg-.*|data-urls|webidl-conversions|tr46)/)",
  ],
  testMatch: ["**/test/**/*.test.(ts|js)", "!**/dist/**"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
