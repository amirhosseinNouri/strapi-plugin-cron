/** Minimal in-memory strapi double for unit tests. */
export const createMockStrapi = (config: Record<string, unknown> = {}) => {
  const services: Record<string, any> = {};
  const documentsApi = {
    findMany: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const strapi: any = {
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    eventHub: { emit: jest.fn().mockResolvedValue(undefined) },
    documents: jest.fn(() => documentsApi),
    admin: {
      services: { permission: { actionProvider: { registerMany: jest.fn() } } },
    },
    plugin: jest.fn(() => ({
      service: (name: string) => services[name],
      config: (key: string, defaultValue?: unknown) => (key in config ? config[key] : defaultValue),
    })),
  };
  return { strapi, services, documentsApi };
};

export const createCtx = ({
  body,
  params = {},
  user = { id: 7, documentId: 'u7', firstname: 'Ada', lastname: 'Lovelace', username: null, email: 'ada@example.com' },
  ip = '10.0.0.1',
}: { body?: any; params?: Record<string, string>; user?: any; ip?: string } = {}) => {
  const ctx: any = {
    request: { body, ip },
    params,
    state: { user },
    status: 200,
    body: undefined,
    badRequest: jest.fn((message: string, details: unknown) => {
      ctx.status = 400;
      ctx.body = { error: { status: 400, name: 'BadRequestError', message, details } };
    }),
    notFound: jest.fn((message: string) => {
      ctx.status = 404;
      ctx.body = { error: { status: 404, name: 'NotFoundError', message } };
    }),
  };
  return ctx;
};
