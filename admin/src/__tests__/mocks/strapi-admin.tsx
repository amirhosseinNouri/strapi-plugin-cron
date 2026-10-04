import React from 'react';

/** Shared, mutable state the tests configure. */
export const mockState = {
  fetchClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    del: jest.fn(),
  },
  allowedActions: {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canTrigger: true,
  } as Record<string, boolean>,
  protectAllowed: true,
};

export const useFetchClient = () => mockState.fetchClient;

export const useRBAC = () => ({ allowedActions: mockState.allowedActions, isLoading: false });

export const Page = {
  Loading: () => <div>Loading page</div>,
  Error: () => <div>Error page</div>,
  Protect: ({ children }: { children: React.ReactNode }) =>
    mockState.protectAllowed ? <>{children}</> : <div>No permission</div>,
};
