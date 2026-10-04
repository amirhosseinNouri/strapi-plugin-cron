import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';

const APP_DIR = path.resolve(__dirname, '..', 'app');

export type TestUser = { id: number; email: string; token: string };

export const setupStrapi = async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'secure-cron-'));
  process.env.TEST_DATABASE_FILENAME = path.join(tmp, 'test.db');
  process.env.NODE_ENV = 'test';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createStrapi } = require('@strapi/strapi');
  const strapi = await createStrapi({ appDir: APP_DIR, distDir: APP_DIR, autoReload: false }).load();
  strapi.server.mount();
  return { strapi, tmp };
};

export const teardownStrapi = async (strapi: any, tmp: string) => {
  await strapi?.destroy();
  fs.rmSync(tmp, { recursive: true, force: true });
};

const PASSWORD = 'Test-password-123';

export const createAdmin = async (
  strapi: any,
  { email, roleId }: { email: string; roleId: number }
): Promise<TestUser> => {
  const user = await strapi.service('admin::user').create({
    email,
    firstname: email.split('@')[0],
    lastname: 'Tester',
    password: PASSWORD,
    isActive: true,
    registrationToken: null,
    roles: [roleId],
  });
  const response = await request(strapi.server.httpServer)
    .post('/admin/login')
    .send({ email, password: PASSWORD });
  if (response.status !== 200) {
    throw new Error(`login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { id: user.id, email, token: response.body.data.token ?? response.body.data.accessToken };
};

export const createRole = async (strapi: any, name: string, actions: string[]) => {
  const role = await strapi.service('admin::role').create({ name, description: name });
  await strapi.service('admin::role').assignPermissions(
    role.id,
    actions.map((action) => ({ action, subject: null, properties: {}, conditions: [] }))
  );
  return role;
};
