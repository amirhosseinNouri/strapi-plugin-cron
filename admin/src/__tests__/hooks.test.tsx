import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useScriptValidation, VALIDATION_DEBOUNCE_MS } from '../hooks/useScriptValidation';
import { useSettings } from '../hooks/useSettings';
import { mockState } from './mocks/strapi-admin';
import { errorResult } from './render';

const { fetchClient } = mockState;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  Object.values(fetchClient).forEach((fn) => fn.mockReset());
});

describe('useSettings', () => {
  it('returns safe defaults until loaded, then server settings', async () => {
    fetchClient.get.mockResolvedValue({ data: { securityCheck: false, syntaxHighlighting: false } });
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current).toEqual({ securityCheck: true, syntaxHighlighting: true });
    await waitFor(() => expect(result.current).toEqual({ securityCheck: false, syntaxHighlighting: false }));
  });

  it('keeps defaults when the request fails', async () => {
    fetchClient.get.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(fetchClient.get).toHaveBeenCalled());
    expect(result.current.syntaxHighlighting).toBe(true);
  });
});

describe('useScriptValidation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('debounces validation requests', async () => {
    fetchClient.post.mockResolvedValue({ data: errorResult });
    const { result, rerender } = renderHook(({ script }) => useScriptValidation(script, { enabled: true }), {
      initialProps: { script: 'a' },
      wrapper,
    });
    expect(result.current.isValidating).toBe(true);
    rerender({ script: 'ab' });
    rerender({ script: 'process' });
    await act(async () => {
      jest.advanceTimersByTime(VALIDATION_DEBOUNCE_MS);
    });
    expect(fetchClient.post).toHaveBeenCalledTimes(1);
    expect(fetchClient.post).toHaveBeenCalledWith('/strapi-plugin-cron/cron-jobs/validate-script', { script: 'process' });
    await waitFor(() => expect(result.current.result).toEqual(errorResult));
    expect(result.current.isValidating).toBe(false);
  });

  it('does nothing when disabled', async () => {
    const { result } = renderHook(() => useScriptValidation('x', { enabled: false }), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(VALIDATION_DEBOUNCE_MS * 2);
    });
    expect(fetchClient.post).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it('ignores validation failures', async () => {
    fetchClient.post.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useScriptValidation('x', { enabled: true }), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(VALIDATION_DEBOUNCE_MS);
    });
    await waitFor(() => expect(result.current.isValidating).toBe(false));
    expect(result.current.result).toBeNull();
  });

  it('drops stale responses after unmount', async () => {
    let resolve: (value: unknown) => void = () => {};
    fetchClient.post.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = renderHook(() => useScriptValidation('x', { enabled: true }), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(VALIDATION_DEBOUNCE_MS);
    });
    unmount();
    await act(async () => resolve({ data: errorResult }));
  });
});
