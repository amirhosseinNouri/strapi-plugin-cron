/** Integration tests: boot a real Strapi 5 app (SQLite) with the built plugin. */
module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  testTimeout: 120000,
  forceExit: true,
};
