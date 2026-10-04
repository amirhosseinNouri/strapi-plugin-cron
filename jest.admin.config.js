/** Admin (React) tests. */
module.exports = {
  displayName: 'admin',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/admin'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/admin/src/__tests__/setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.test.json' },
    ],
  },
  moduleNameMapper: {
    '^@strapi/strapi/admin$': '<rootDir>/admin/src/__tests__/mocks/strapi-admin.tsx',
    '^@uiw/react-codemirror$': '<rootDir>/admin/src/__tests__/mocks/react-codemirror.tsx',
  },
  collectCoverageFrom: [
    'admin/src/**/*.{ts,tsx}',
    '!admin/src/**/__tests__/**',
    '!admin/src/translations/**',
  ],
  coverageDirectory: 'coverage/admin',
  coverageThreshold: {
    global: { lines: 80, branches: 80, functions: 80, statements: 80 },
  },
};
