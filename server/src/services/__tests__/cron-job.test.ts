import { createMockStrapi } from '../../__tests__/mock-strapi';
import cronJobService from '../cron-job';

const setup = () => {
  const mock = createMockStrapi();
  const cron = { updateSchedule: jest.fn(), cancel: jest.fn() };
  mock.services.cron = cron;
  const service = cronJobService(mock);
  return { ...mock, service, cron };
};

const populate = {
  createdBy: { fields: ['firstname', 'lastname', 'username'] },
  updatedBy: { fields: ['firstname', 'lastname', 'username'] },
};

describe('cron-job service', () => {
  it('uses the plugin content type', async () => {
    const { strapi, service } = setup();
    await service.getAll();
    expect(strapi.documents).toHaveBeenCalledWith('plugin::strapi-plugin-cron.cron-job');
  });

  it('populates creator fields when reading', async () => {
    const { service, documentsApi } = setup();
    await service.getAll();
    expect(documentsApi.findMany).toHaveBeenCalledWith({ populate });
    await service.getOne('abc');
    expect(documentsApi.findOne).toHaveBeenCalledWith({ documentId: 'abc', populate });
  });

  it('lists published jobs', async () => {
    const { service, documentsApi } = setup();
    await service.getPublished();
    expect(documentsApi.findMany).toHaveBeenCalledWith({ filters: { publicationDate: { $notNull: true } } });
  });

  it('records the creator on create', async () => {
    const { service, documentsApi } = setup();
    await service.create({ name: 'a' }, { id: 4 });
    expect(documentsApi.create).toHaveBeenCalledWith({
      data: { name: 'a', createdBy: 4, updatedBy: 4 },
      populate,
    });
    await service.create({ name: 'b' });
    expect(documentsApi.create).toHaveBeenLastCalledWith({ data: { name: 'b' }, populate });
  });

  it('records the updater only for user-driven updates', async () => {
    const { service, documentsApi } = setup();
    await service.update('abc', { name: 'x' }, { id: 5 });
    expect(documentsApi.update).toHaveBeenCalledWith({
      documentId: 'abc',
      data: { name: 'x', updatedBy: 5 },
      populate,
    });
    await service.update('abc', { iterationsCount: 2 });
    expect(documentsApi.update).toHaveBeenLastCalledWith({
      documentId: 'abc',
      data: { iterationsCount: 2 },
      populate,
    });
  });

  it('publishes by resetting counters and scheduling', async () => {
    const { service, documentsApi, cron } = setup();
    documentsApi.update.mockResolvedValue({ documentId: 'abc', publicationDate: 'now' });
    const result = await service.publish('abc', { id: 1 });
    const { data } = documentsApi.update.mock.calls[0][0];
    expect(data).toMatchObject({ iterationsCount: 0, updatedBy: 1 });
    expect(typeof data.publicationDate).toBe('string');
    expect(cron.updateSchedule).toHaveBeenCalledWith({ documentId: 'abc', publicationDate: 'now' });
    expect(result.documentId).toBe('abc');
  });

  it('unpublishes by clearing the publication date and rescheduling', async () => {
    const { service, documentsApi, cron } = setup();
    documentsApi.update.mockResolvedValue({ documentId: 'abc', publicationDate: null });
    await service.unpublish('abc');
    expect(documentsApi.update.mock.calls[0][0].data).toEqual({ publicationDate: null });
    expect(cron.updateSchedule).toHaveBeenCalled();
  });

  it('cancels the schedule before deleting', async () => {
    const { service, documentsApi, cron } = setup();
    await service.delete('abc');
    expect(cron.cancel).toHaveBeenCalledWith({ documentId: 'abc' });
    expect(documentsApi.delete).toHaveBeenCalledWith({ documentId: 'abc' });
  });
});
