import { DesignSystemProvider, darkTheme, lightTheme } from '@strapi/design-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

export const renderWithProviders = (
  ui: React.ReactElement,
  { route = '/', path = '*', dark = false }: { route?: string; path?: string; dark?: boolean } = {}
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider locale="en-GB" theme={dark ? darkTheme : lightTheme}>
        <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path={path} element={children} />
            <Route path="/plugins/strapi-plugin-cron" element={<div>Plugin home</div>} />
          </Routes>
        </MemoryRouter>
      </DesignSystemProvider>
    </QueryClientProvider>
  );
  const result = render(ui, { wrapper: Wrapper });
  return { ...result, queryClient };
};

export const fixtureJob = (overrides: Record<string, unknown> = {}): any => ({
  id: 1,
  documentId: 'doc-1',
  name: 'Nightly cleanup',
  schedule: '0 3 * * *',
  script: 'console.log("hi")',
  iterationsLimit: -1,
  iterationsCount: 2,
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: '2027-10-01T23:59:59.999Z',
  latestExecutionLog: [['-- run'], ['hi']],
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  publishedAt: null,
  locale: null,
  publicationDate: null,
  createdBy: { id: 1, firstname: 'Ada', lastname: 'Lovelace', username: null, email: null },
  updatedBy: { id: 2, firstname: 'Grace', lastname: 'Hopper', username: null, email: null },
  ...overrides,
});

export const cleanResult = { enabled: true, passed: true, errors: 0, warnings: 0, findings: [] };

export const warningResult = {
  enabled: true,
  passed: true,
  errors: 0,
  warnings: 1,
  findings: [
    { ruleId: 'no-network-calls', severity: 'warning', message: 'fetch() sends data outside the server.', line: 1, column: 7, endLine: 1, endColumn: 20 },
  ],
};

export const errorResult = {
  enabled: true,
  passed: false,
  errors: 1,
  warnings: 0,
  findings: [
    { ruleId: 'no-process-access', severity: 'error', message: 'Accessing process is not allowed.', line: 1, column: 1, endLine: 1, endColumn: 8 },
  ],
};
