export type LogLine = string[];

export type ScopedConsole = Pick<Console, 'log' | 'info' | 'warn' | 'error' | 'debug'>;

const serializeArg = (arg: unknown): string => {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`;
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'function') return `[Function ${arg.name || 'anonymous'}]`;
  if (typeof arg === 'bigint' || typeof arg === 'symbol') return arg.toString();
  try {
    return JSON.stringify(arg) ?? String(arg);
  } catch {
    return String(arg);
  }
};

/**
 * A console object handed to a script instead of the global one, so concurrent
 * jobs never mix their output and scripts cannot capture other code's logs.
 */
export const createScopedConsole = (
  forward?: (level: keyof ScopedConsole, line: string) => void
): { lines: LogLine[]; console: ScopedConsole } => {
  const lines: LogLine[] = [];
  const write =
    (level: keyof ScopedConsole) =>
    (...args: unknown[]) => {
      const line = args.map(serializeArg);
      lines.push(level === 'log' || level === 'info' ? line : [`[${level}]`, ...line]);
      forward?.(level, line.join(' '));
    };
  return {
    lines,
    console: {
      log: write('log'),
      info: write('info'),
      warn: write('warn'),
      error: write('error'),
      debug: write('debug'),
    },
  };
};

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

/**
 * Runs a script as the body of an async function. Scripts may `await`, or call
 * the legacy `resolve()` / `reject()` callbacks kept for backwards compatibility.
 */
export const runScript = (
  script: string,
  args: { strapi: unknown; cronJob: unknown; console: ScopedConsole }
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    let fn: (...args: unknown[]) => Promise<unknown>;
    try {
      fn = new AsyncFunction('strapi', 'cronJob', 'console', 'resolve', 'reject', script);
    } catch (error) {
      reject(error);
      return;
    }
    fn(args.strapi, args.cronJob, args.console, () => resolve(), reject).then(
      () => resolve(),
      reject
    );
  });
