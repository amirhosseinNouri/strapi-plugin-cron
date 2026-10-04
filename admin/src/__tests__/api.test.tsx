import { renderHook } from '@testing-library/react';
import { ApiError, toApiError, useCronApi } from '../api/cron';
import { mockState } from './mocks/strapi-admin';

const { fetchClient } = mockState;

beforeEach(() => {
  Object.values(fetchClient).forEach((fn) => fn.mockReset().mockResolvedValue({ data: 'ok' }));
});

describe('toApiError', () => {
  it('maps badRequest ValidationError payloads', () => {
    const error = toApiError({
      response: { data: { error: { name: 'BadRequestError', message: 'ValidationError', status: 400, details: { errors: [] } } } },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ValidationError');
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ errors: [] });
  });

  it('keeps named errors such as SecurityCheckError', () => {
    const error = toApiError({
      response: { data: { error: { name: 'SecurityCheckError', message: 'failed', status: 422 } } },
    });
    expect(error.name).toBe('SecurityCheckError');
    expect(error.details).toEqual({});
  });

  it('falls back for network errors', () => {
    expect(toApiError({ message: 'offline', status: 0 })).toMatchObject({ name: 'Error', message: 'offline' });
    expect(toApiError(undefined).message).toBe('Unexpected error');
  });

  it('defaults details', () => {
    expect(new ApiError('X', 'y').details).toEqual({});
  });
});

describe('useCronApi', () => {
  const api = () => renderHook(() => useCronApi()).result.current;

  it.each([
    ['getSettings', [], 'get', ['/strapi-plugin-cron/settings']],
    ['getAllCronJobs', [], 'get', ['/strapi-plugin-cron/cron-jobs']],
    ['getCronJob', ['d1'], 'get', ['/strapi-plugin-cron/cron-jobs/d1']],
    ['createNewCronJob', [{ name: 'a' }], 'post', ['/strapi-plugin-cron/cron-jobs', { name: 'a' }]],
    ['updateCronJob', [{ documentId: 'd1', data: { name: 'b' } }], 'put', ['/strapi-plugin-cron/cron-jobs/d1', { name: 'b' }]],
    ['publishCronJob', ['d1'], 'put', ['/strapi-plugin-cron/cron-jobs/publish/d1']],
    ['unpublishCronJob', ['d1'], 'put', ['/strapi-plugin-cron/cron-jobs/unpublish/d1']],
    ['deleteCronJob', ['d1'], 'del', ['/strapi-plugin-cron/cron-jobs/d1']],
    ['triggerCronJob', ['d1'], 'post', ['/strapi-plugin-cron/cron-jobs/trigger/d1']],
    ['validateScript', ['x'], 'post', ['/strapi-plugin-cron/cron-jobs/validate-script', { script: 'x' }]],
  ])('%s calls %s', async (method, args, verb, expected) => {
    const result = await (api() as any)[method](...args);
    expect(result).toBe('ok');
    expect((fetchClient as any)[verb]).toHaveBeenCalledWith(...expected);
  });

  it('uses the authenticated admin fetch client, never a stored token', async () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem');
    await api().getAllCronJobs();
    expect(getItem).not.toHaveBeenCalledWith('jwtToken');
    getItem.mockRestore();
  });

  it('wraps failures in ApiError', async () => {
    fetchClient.post.mockRejectedValueOnce({
      response: { data: { error: { name: 'SecurityCheckError', message: 'nope', status: 422 } } },
    });
    await expect(api().createNewCronJob({} as any)).rejects.toMatchObject({ name: 'SecurityCheckError' });
  });
});
