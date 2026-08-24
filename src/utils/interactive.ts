import readline from 'readline';

export type InteractiveOptions = {
  /**
   * Explicit "disable prompts" flag passed by internal callers.
   */
  noInteractive?: boolean;
  /**
   * Commander-style negated option: `--no-interactive` sets this to false.
   */
  interactive?: boolean;
};

/**
 * Resolves whether non-interactive mode is requested.
 * Handles both explicit `noInteractive: true` and Commander.js style `interactive: false`.
 * Use this helper instead of manually checking options.noInteractive to avoid bugs.
 */
export function resolveNoInteractive(value?: boolean | InteractiveOptions): boolean {
  if (typeof value === 'boolean') return value;
  return value?.noInteractive === true || value?.interactive === false;
}

export function isInteractive(value?: boolean | InteractiveOptions): boolean {
  if (resolveNoInteractive(value)) return false;
  if (process.env.OPEN_SPEC_INTERACTIVE === '0') return false;
  // Respect the standard CI environment variable (set by GitHub Actions, GitLab CI, Travis, etc.)
  if ('CI' in process.env) return false;
  return !!process.stdin.isTTY;
}

export type ConfirmPrompt = {
  message: string;
  /** Answer taken for an empty or unrecognized line. Defaults to true, as inquirer does. */
  default?: boolean;
};

type PromptInput = NodeJS.ReadableStream & { isTTY?: boolean };
type PromptOutput = NodeJS.WritableStream & { isTTY?: boolean };

export type PromptStreams = {
  input?: PromptInput;
  output?: PromptOutput;
};

/**
 * Shaped like `@inquirer/core`'s `ExitPromptError` so callers can classify a
 * prompt that ended without an answer the same way whichever reader produced
 * it. The message deliberately never mentions SIGINT: a Ctrl+C is a user
 * decision, not an unanswerable prompt.
 */
export class NonInteractivePromptError extends Error {
  constructor(message = 'The prompt input ended before an answer was given.') {
    super(message);
    this.name = 'ExitPromptError';
  }
}

/**
 * True when a prompt failed because nothing could answer it (closed stdin,
 * redirected streams), false for a SIGINT cancellation and for every unrelated
 * error.
 */
export function isNonInteractivePromptError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name !== 'ExitPromptError') return false;
  return !/SIGINT/i.test(error.message);
}

/**
 * Every escape a terminal could act on: OSC sequences (`ESC ] ... BEL/ST`),
 * CSI sequences (`ESC [ ... final`), any other `ESC`-led sequence, and the
 * remaining C0/C1 control bytes (tab and newline stay). CSI-only stripping is
 * not enough - OSC hyperlinks, 8-bit C1 introducers, and a bare `\r` can all
 * rewrite or spoof a redirected stream.
 */
const TERMINAL_ESCAPE_PATTERN = new RegExp(
  '\u001B\\][^\u0007\u001B\u009C]*(?:\u0007|\u009C|\u001B\\\\)?' + // OSC, BEL- or ST-terminated (7- or 8-bit, or cut off)
    '|\u001B\\[[0-?]*[ -/]*[@-~]' + // CSI, 7-bit form
    '|\u009B[0-?]*[ -/]*[@-~]' + // CSI, 8-bit single-byte introducer
    '|\u001B[ -/]*[0-~]?' + // any other escape sequence (or a trailing bare ESC)
    '|[\u0000-\u0008\u000B-\u001F\u007F-\u009F]', // leftover C0 (not tab/newline) + DEL + C1
  'g'
);

/** Remove every terminal escape and control byte a caller could smuggle into output. */
export function stripTerminalEscapes(text: string): string {
  return text.replace(TERMINAL_ESCAPE_PATTERN, '');
}

/**
 * Mirrors inquirer's confirm parsing: a `y`/`yes` or `n`/`no` prefix decides,
 * anything else (including an empty line) takes the default.
 */
function parseConfirmAnswer(line: string, fallback: boolean): boolean {
  const value = line.trim();
  if (/^(y|yes)/i.test(value)) return true;
  if (/^(n|no)/i.test(value)) return false;
  return fallback;
}

type SharedLineQueue = {
  lines: string[];
  waiters: Array<(line: string | null) => void>;
  closed: boolean;
};

/**
 * One persistent reader per input stream. A fresh readline interface per
 * prompt consumes the whole buffered chunk and discards every line after the
 * first on close, so `printf 'y\ny\n' | openspec ...` would answer only the
 * first of two prompts. The input is paused whenever no prompt is waiting,
 * so an idle stdin cannot keep the process alive.
 */
const sharedLineQueues = new WeakMap<PromptInput, SharedLineQueue>();

function getLineQueue(input: PromptInput): SharedLineQueue {
  const existing = sharedLineQueues.get(input);
  if (existing) return existing;

  const queue: SharedLineQueue = { lines: [], waiters: [], closed: false };
  const rl = readline.createInterface({ input, terminal: false });
  rl.on('line', (line) => {
    const waiter = queue.waiters.shift();
    if (waiter) {
      waiter(line);
    } else {
      queue.lines.push(line);
    }
    if (queue.waiters.length === 0) input.pause();
  });
  rl.on('close', () => {
    queue.closed = true;
    while (queue.waiters.length > 0) {
      queue.waiters.shift()!(null);
    }
  });
  sharedLineQueues.set(input, queue);
  return queue;
}

/**
 * Reads one line with no terminal handling, so nothing ANSI reaches a
 * redirected stream. Resolves to null when the input ends unanswered.
 */
function readPlainLine(input: PromptInput, output: PromptOutput, question: string): Promise<string | null> {
  output.write(question);
  const queue = getLineQueue(input);
  const buffered = queue.lines.shift();
  if (buffered !== undefined) return Promise.resolve(buffered);
  if (queue.closed) return Promise.resolve(null);
  return new Promise((resolve) => {
    queue.waiters.push(resolve);
    input.resume();
  });
}

/**
 * Asks a yes/no question. With a terminal on both ends this is inquirer's
 * confirm; otherwise it is a single plain line that accepts one piped answer.
 * An input that ends without an answer rejects instead of silently defaulting.
 */
export async function confirmPrompt(
  prompt: ConfirmPrompt,
  io: PromptStreams = {}
): Promise<boolean> {
  const input = io.input ?? process.stdin;
  const output = io.output ?? process.stdout;
  const fallback = prompt.default !== false;

  if (input.isTTY && output.isTTY) {
    const { confirm } = await import('@inquirer/prompts');
    const config = { message: prompt.message, default: fallback };
    // Only hand inquirer explicit streams; the default context is its own.
    return io.input || io.output
      ? confirm(config, { input: input as NodeJS.ReadableStream, output: output as NodeJS.WritableStream })
      : confirm(config);
  }

  const suffix = fallback ? '[Y/n]' : '[y/N]';
  const plainMessage = stripTerminalEscapes(prompt.message);
  const line = await readPlainLine(input, output, `${plainMessage} ${suffix} `);
  if (line === null) {
    throw new NonInteractivePromptError(
      `The prompt "${plainMessage}" could not be answered: the input ended.`
    );
  }
  return parseConfirmAnswer(line, fallback);
}

