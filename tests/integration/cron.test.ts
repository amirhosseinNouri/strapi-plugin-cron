import request from 'supertest';
import { createAdmin, createRole, setupStrapi, teardownStrapi, type TestUser } from './strapi';

const BASE = '/strapi-plugin-cron';
const action = (name: string) => `plugin::strapi-plugin-cron.${name}`;
const tomorrow = () => new Date(Date.now() + 86400000).toISOString();

const jobInput = (overrides: Record<string, unknown> = {}) => ({
  name: `job-${Math.random().toString(36).slice(2, 8)}`,
  schedule: '0 3 * * *',
  script: 'console.log("hello from", cronJob.name)',
  iterationsLimit: -1,
  startDate: new Date().toISOString(),
  endDate: tomorrow(),
  ...overrides,
});

let strapi: any;
let tmp: string;
let superAdmin: TestUser;
let editor: TestUser;
let reader: TestUser;
let outsider: TestUser;
let events: Array<{ name: string; payload: any }> = [];

const http = () => request(strapi.server.httpServer);
const as = (user: TestUser) => ({
  get: (url: string) => http().get(url).set('Authorization', `Bearer ${user.token}`),
  post: (url: string, body?: object) =>
    http().post(url).set('Authorization', `Bearer ${user.token}`).send(body ?? {}),
  put: (url: string, body?: object) =>
    http().put(url).set('Authorization', `Bearer ${user.token}`).send(body ?? {}),
  del: (url: string) => http().delete(url).set('Authorization', `Bearer ${user.token}`),
});
const cronEvents = () => events.filter((event) => event.name.startsWith('strapi-plugin-cron.'));
const eventNames = () => cronEvents().map((event) => event.name.replace('strapi-plugin-cron.cron-job.', ''));

beforeAll(async () => {
  ({ strapi, tmp } = await setupStrapi());
  strapi.eventHub.subscribe((name: string, payload: any) => {
    events.push({ name, payload });
  });

  const superAdminRole = await strapi.service('admin::role').getSuperAdmin();
  const editorRole = await createRole(strapi, 'Cron editor', [
    action('read'),
    action('create'),
    action('update'),
  ]);
  const readerRole = await createRole(strapi, 'Cron reader', [action('read')]);
  const outsiderRole = await createRole(strapi, 'No cron', []);

  superAdmin = await createAdmin(strapi, { email: 'super@example.com', roleId: superAdminRole.id });
  editor = await createAdmin(strapi, { email: 'editor@example.com', roleId: editorRole.id });
  reader = await createAdmin(strapi, { email: 'reader@example.com', roleId: readerRole.id });
  outsider = await createAdmin(strapi, { email: 'outsider@example.com', roleId: outsiderRole.id });
});

afterAll(async () => {
  await teardownStrapi(strapi, tmp);
});

beforeEach(() => {
  events = [];
});

describe('authentication (the original unauthenticated RCE)', () => {
  it.each([
    ['post', `${BASE}/cron-jobs`],
    ['get', `${BASE}/cron-jobs`],
    ['get', `${BASE}/cron-jobs/anything`],
    ['put', `${BASE}/cron-jobs/anything`],
    ['put', `${BASE}/cron-jobs/publish/anything`],
    ['delete', `${BASE}/cron-jobs/anything`],
    ['post', `${BASE}/cron-jobs/trigger/anything`],
    ['post', `${BASE}/cron-jobs/validate-script`],
    ['get', `${BASE}/settings`],
  ])('anonymous %s %s is rejected with 401', async (method, url) => {
    const response = await (http() as any)[method](url).send({});
    expect(response.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const response = await http().get(`${BASE}/cron-jobs`).set('Authorization', 'Bearer nope');
    expect(response.status).toBe(401);
  });

  it('no longer exposes trigger over GET', async () => {
    const response = await as(superAdmin).get(`${BASE}/cron-jobs/trigger/anything`);
    expect([404, 405]).toContain(response.status);
  });
});

describe('RBAC', () => {
  it('registers the five plugin actions', () => {
    const provider = strapi.service('admin::permission').actionProvider;
    for (const name of ['read', 'create', 'update', 'delete', 'trigger']) {
      expect(provider.get(action(name))).toMatchObject({ pluginName: 'strapi-plugin-cron', section: 'plugins' });
    }
  });

  it('denies admins without any cron permission', async () => {
    expect((await as(outsider).get(`${BASE}/cron-jobs`)).status).toBe(403);
    expect((await as(outsider).get(`${BASE}/settings`)).status).toBe(403);
  });

  it('lets readers read but not write', async () => {
    expect((await as(reader).get(`${BASE}/cron-jobs`)).status).toBe(200);
    expect((await as(reader).get(`${BASE}/settings`)).body).toEqual({
      securityCheck: true,
      syntaxHighlighting: true,
    });
    expect((await as(reader).post(`${BASE}/cron-jobs`, jobInput())).status).toBe(403);
    expect((await as(reader).post(`${BASE}/cron-jobs/validate-script`, { script: '1' })).status).toBe(403);
  });

  it('lets editors validate scripts but not delete or trigger', async () => {
    const created = await as(editor).post(`${BASE}/cron-jobs`, jobInput());
    expect(created.status).toBe(200);
    const { documentId } = created.body;
    expect((await as(editor).post(`${BASE}/cron-jobs/validate-script`, { script: '1' })).status).toBe(200);
    expect((await as(editor).post(`${BASE}/cron-jobs/trigger/${documentId}`)).status).toBe(403);
    expect((await as(editor).del(`${BASE}/cron-jobs/${documentId}`)).status).toBe(403);
  });
});

describe('attribution and audit events', () => {
  it('records createdBy and updatedBy and emits audit events', async () => {
    const created = await as(superAdmin).post(`${BASE}/cron-jobs`, jobInput({ script: 'console.log(1)' }));
    expect(created.status).toBe(200);
    expect(created.body.createdBy).toMatchObject({ id: superAdmin.id, firstname: 'super' });
    expect(created.body.updatedBy).toMatchObject({ id: superAdmin.id });
    expect(created.body.createdBy).not.toHaveProperty('password');
    expect(eventNames()).toEqual(['create']);
    expect(cronEvents()[0].payload).toMatchObject({
      user: { id: superAdmin.id, email: superAdmin.email },
      entity: { type: 'cron-job', id: created.body.documentId },
    });

    events = [];
    const { documentId } = created.body;
    const updated = await as(editor).put(`${BASE}/cron-jobs/${documentId}`, {
      ...jobInput({ name: created.body.name }),
      script: 'console.log(2)',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.createdBy).toMatchObject({ id: superAdmin.id });
    expect(updated.body.updatedBy).toMatchObject({ id: editor.id, firstname: 'editor' });
    expect(eventNames()).toEqual(['update']);
    expect(cronEvents()[0].payload.details).toMatchObject({
      changedFields: expect.arrayContaining(['script']),
      script: { diff: expect.stringContaining('+console.log(2)') },
    });

    const fetched = await as(reader).get(`${BASE}/cron-jobs/${documentId}`);
    expect(fetched.body.updatedBy).toMatchObject({ id: editor.id });
    const list = await as(reader).get(`${BASE}/cron-jobs`);
    expect(list.body.find((job: any) => job.documentId === documentId).createdBy).toMatchObject({ id: superAdmin.id });
  });

  it('returns 404 for unknown jobs', async () => {
    expect((await as(reader).get(`${BASE}/cron-jobs/does-not-exist`)).status).toBe(404);
  });
});

describe('security check', () => {
  it('blocks dangerous scripts and audits the attempt', async () => {
    const response = await as(superAdmin).post(
      `${BASE}/cron-jobs`,
      jobInput({ script: "const { execSync } = require('child_process'); execSync('id')" })
    );
    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({
      name: 'SecurityCheckError',
      details: { requiresAcknowledgement: false },
    });
    expect(response.body.error.details.findings.map((f: any) => f.ruleId)).toContain('no-dangerous-modules');
    expect(eventNames()).toEqual(['blocked']);
  });

  it('requires acknowledging warnings, then records the acknowledgement', async () => {
    const input = jobInput({ script: "await fetch('https://hooks.example.com/ping')" });
    const rejected = await as(superAdmin).post(`${BASE}/cron-jobs`, input);
    expect(rejected.status).toBe(422);
    expect(rejected.body.error.details.requiresAcknowledgement).toBe(true);

    const accepted = await as(superAdmin).post(`${BASE}/cron-jobs`, { ...input, acknowledgeWarnings: true });
    expect(accepted.status).toBe(200);
    expect(eventNames()).toEqual(['create', 'warnings-acknowledged']);
  });

  it('validates scripts live', async () => {
    const response = await as(editor).post(`${BASE}/cron-jobs/validate-script`, { script: 'process.env' });
    expect(response.body).toMatchObject({ enabled: true, passed: false, errors: 1 });
  });
});

describe('scheduling and execution', () => {
  it('reschedules a published job when its script changes', async () => {
    const { scheduledJobs } = require('node-schedule');
    const created = await as(superAdmin).post(`${BASE}/cron-jobs`, jobInput({ script: 'console.log("v1")' }));
    const { documentId, name } = created.body;

    const published = await as(superAdmin).put(`${BASE}/cron-jobs/publish/${documentId}`);
    expect(published.status).toBe(200);
    const first = scheduledJobs[documentId];
    expect(first).toBeDefined();

    const updated = await as(editor).put(`${BASE}/cron-jobs/${documentId}`, {
      ...jobInput({ name }),
      script: 'console.log("v2")',
    });
    expect(updated.status).toBe(200);
    const second = scheduledJobs[documentId];
    expect(second).toBeDefined();
    expect(second).not.toBe(first);

    await second.job();
    const after = await as(reader).get(`${BASE}/cron-jobs/${documentId}`);
    expect(after.body.latestExecutionLog.flat()).toContain('v2');
    expect(after.body.iterationsCount).toBe(1);
    // A scheduled run must not change the attribution.
    expect(after.body.updatedBy).toMatchObject({ id: editor.id });

    const unpublished = await as(superAdmin).put(`${BASE}/cron-jobs/unpublish/${documentId}`);
    expect(unpublished.status).toBe(200);
    expect(scheduledJobs[documentId]).toBeUndefined();
  });

  it('triggers a job manually with POST and returns its log', async () => {
    const created = await as(superAdmin).post(
      `${BASE}/cron-jobs`,
      jobInput({ script: 'const n = await strapi.documents("plugin::strapi-plugin-cron.cron-job").count(); console.log("count", n)', acknowledgeWarnings: true })
    );
    expect(created.status).toBe(200);
    events = [];
    const response = await as(superAdmin).post(`${BASE}/cron-jobs/trigger/${created.body.documentId}`);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.logs.some((line: string[]) => line[0] === 'count')).toBe(true);
    expect(eventNames()).toEqual(['trigger', 'run.succeeded']);
  });

  it('reports failing manual runs', async () => {
    const created = await as(superAdmin).post(`${BASE}/cron-jobs`, jobInput({ script: 'throw new Error("expected failure")' }));
    events = [];
    const response = await as(superAdmin).post(`${BASE}/cron-jobs/trigger/${created.body.documentId}`);
    expect(response.body).toMatchObject({ success: false, error: 'expected failure' });
    expect(eventNames()).toEqual(['trigger', 'run.failed']);
  });

  it('deletes jobs and audits the deletion', async () => {
    const created = await as(superAdmin).post(`${BASE}/cron-jobs`, jobInput());
    events = [];
    const response = await as(superAdmin).del(`${BASE}/cron-jobs/${created.body.documentId}`);
    expect(response.status).toBe(200);
    expect(eventNames()).toEqual(['delete']);
    expect((await as(reader).get(`${BASE}/cron-jobs/${created.body.documentId}`)).status).toBe(404);
  });
});
