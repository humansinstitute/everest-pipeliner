export default {
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {},
  testMatch: ["**/tests/**/*.test.js", "**/__tests__/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js", "!src/**/index.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000,
  verbose: true,
};
