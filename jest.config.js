const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  transformIgnorePatterns: ["node_modules/(?!(@octokit/.*)/)"],
  testMatch: ["**/test/**/*.test.(ts|js)", "!**/dist/**"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
