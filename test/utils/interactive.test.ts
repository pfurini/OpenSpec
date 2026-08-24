import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PassThrough } from 'stream';
import {
  isInteractive,
  resolveNoInteractive,
  InteractiveOptions,
  confirmPrompt,
  isNonInteractivePromptError,
} from '../../src/utils/interactive.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

describe('interactive utilities', () => {
  let originalOpenSpecInteractive: string | undefined;
  let originalCI: string | undefined;
  let originalStdinIsTTY: boolean | undefined;

  beforeEach(() => {
    // Save original environment
    originalOpenSpecInteractive = process.env.OPEN_SPEC_INTERACTIVE;
    originalCI = process.env.CI;
    originalStdinIsTTY = process.stdin.isTTY;

    // Clear environment for clean testing
    delete process.env.OPEN_SPEC_INTERACTIVE;
    delete process.env.CI;
  });

  afterEach(() => {
    // Restore original environment
    if (originalOpenSpecInteractive !== undefined) {
      process.env.OPEN_SPEC_INTERACTIVE = originalOpenSpecInteractive;
    } else {
      delete process.env.OPEN_SPEC_INTERACTIVE;
    }
    if (originalCI !== undefined) {
      process.env.CI = originalCI;
    } else {
      delete process.env.CI;
    }
    // Restore stdin.isTTY
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalStdinIsTTY,
      writable: true,
      configurable: true,
    });
  });

  describe('resolveNoInteractive', () => {
    it('should return true when noInteractive is true', () => {
      expect(resolveNoInteractive({ noInteractive: true })).toBe(true);
    });

    it('should return true when interactive is false (Commander.js style)', () => {
      // This is how Commander.js handles --no-interactive flag
      expect(resolveNoInteractive({ interactive: false })).toBe(true);
    });

    it('should return false when noInteractive is false', () => {
      expect(resolveNoInteractive({ noInteractive: false })).toBe(false);
    });

    it('should return false when interactive is true', () => {
      expect(resolveNoInteractive({ interactive: true })).toBe(false);
    });

    it('should return false for empty options object', () => {
      expect(resolveNoInteractive({})).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(resolveNoInteractive(undefined)).toBe(false);
    });

    it('should handle boolean value true', () => {
      expect(resolveNoInteractive(true)).toBe(true);
    });

    it('should handle boolean value false', () => {
      expect(resolveNoInteractive(false)).toBe(false);
    });

    it('should prioritize noInteractive over interactive when both set', () => {
      // noInteractive: true should win
      expect(resolveNoInteractive({ noInteractive: true, interactive: true })).toBe(true);
      // If noInteractive is false, check interactive
      expect(resolveNoInteractive({ noInteractive: false, interactive: false })).toBe(true);
    });
  });

  describe('isInteractive', () => {
    it('should return false when noInteractive is true', () => {
      expect(isInteractive({ noInteractive: true })).toBe(false);
    });

    it('should return false when interactive is false (Commander.js --no-interactive)', () => {
      expect(isInteractive({ interactive: false })).toBe(false);
    });

    it('should return false when OPEN_SPEC_INTERACTIVE env var is 0', () => {
      process.env.OPEN_SPEC_INTERACTIVE = '0';
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive({})).toBe(false);
    });

    it('should return false when CI env var is set', () => {
      process.env.CI = 'true';
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive({})).toBe(false);
    });

    it('should return false when CI env var is set to any value', () => {
      // CI can be set to any value, not just "true"
      process.env.CI = '1';
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive({})).toBe(false);
    });

    it('should return false when stdin is not a TTY', () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true, configurable: true });
      expect(isInteractive({})).toBe(false);
    });

    it('should return true when stdin is TTY and no flags disable it', () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive({})).toBe(true);
    });

    it('should return true when stdin is TTY and options are undefined', () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive(undefined)).toBe(true);
    });
  });

  describe('confirmPrompt', () => {
    const ANSI = /\u001b\[/;

    function makeStreams(isTTY: boolean) {
      const input = new PassThrough() as PassThrough & { isTTY?: boolean };
      const output = new PassThrough() as PassThrough & { isTTY?: boolean };
      input.isTTY = isTTY;
      output.isTTY = isTTY;
      const written: string[] = [];
      output.on('data', (chunk: Buffer | string) => written.push(String(chunk)));
      return { input, output, written: () => written.join('') };
    }

    it('asks with a single plain line free of ANSI escapes on redirected streams', async () => {
      const { input, output, written } = makeStreams(false);
      const answered = confirmPrompt(
        { message: 'Proceed with spec updates?', default: false },
        { input, output }
      );
      input.write('y\n');
      input.end();

      await expect(answered).resolves.toBe(true);
      const question = written();
      expect(question).toContain('Proceed with spec updates?');
      expect(question).toContain('[y/N]');
      expect(question).not.toMatch(ANSI);
      expect(question.trimEnd().split('\n')).toHaveLength(1);
    });

    it('strips escapes the caller put in the message', async () => {
      const { input, output, written } = makeStreams(false);
      const answered = confirmPrompt(
        { message: '\u001b[33m\u26a0 Skipping validation. Continue?\u001b[39m', default: false },
        { input, output }
      );
      input.write('n\n');
      input.end();

      await expect(answered).resolves.toBe(false);
      const question = written();
      expect(question).toContain('Skipping validation. Continue?');
      expect(question).not.toMatch(ANSI);
    });

    it('strips OSC sequences, bare escapes, C1 bytes, and carriage returns too', async () => {
      const { input, output, written } = makeStreams(false);
      const message =
        '\u001b]8;;https://example.com\u0007Continue\u001b]8;;\u0007 with \u009b31mthe\r archive?\u001b(B';
      const answered = confirmPrompt({ message, default: false }, { input, output });
      input.write('n\n');
      input.end();

      await expect(answered).resolves.toBe(false);
      const question = written();
      expect(question).toContain('Continue with the archive?');
      expect(question).not.toMatch(/[\u001b\u009b\u0007\r]/);
    });

    it('stops an OSC at the 8-bit ST terminator instead of swallowing what follows', async () => {
      const { input, output, written } = makeStreams(false);
      const message = '\u001b]0;set title\u009cContinue?';
      const answered = confirmPrompt({ message, default: false }, { input, output });
      input.write('n\n');
      input.end();

      await expect(answered).resolves.toBe(false);
      const question = written();
      expect(question).toContain('Continue?');
      expect(question).not.toMatch(/[\u001b\u009c]/);
    });

    it('shows the default in the plain prompt', async () => {
      const { input, output, written } = makeStreams(false);
      const answered = confirmPrompt({ message: 'Continue?', default: true }, { input, output });
      input.write('\n');
      input.end();

      await expect(answered).resolves.toBe(true);
      expect(written()).toContain('[Y/n]');
    });

    it.each([
      ['y', true],
      ['Y', true],
      ['yes', true],
      ['YES', true],
      ['n', false],
      ['no', false],
      ['No', false],
    ])('parses the piped answer %s as %s', async (answer, expected) => {
      const { input, output } = makeStreams(false);
      const answered = confirmPrompt({ message: 'Continue?', default: !expected }, { input, output });
      input.write(`${answer}\n`);
      input.end();

      await expect(answered).resolves.toBe(expected);
    });

    it('takes the default for any other input', async () => {
      const noDefault = makeStreams(false);
      const declined = confirmPrompt(
        { message: 'Continue?', default: false },
        { input: noDefault.input, output: noDefault.output }
      );
      noDefault.input.write('maybe\n');
      noDefault.input.end();
      await expect(declined).resolves.toBe(false);

      const yesDefault = makeStreams(false);
      const accepted = confirmPrompt(
        { message: 'Continue?', default: true },
        { input: yesDefault.input, output: yesDefault.output }
      );
      yesDefault.input.write('maybe\n');
      yesDefault.input.end();
      await expect(accepted).resolves.toBe(true);
    });

    it('tolerates a CRLF-terminated piped answer', async () => {
      const { input, output } = makeStreams(false);
      const answered = confirmPrompt({ message: 'Continue?', default: false }, { input, output });
      input.write('yes\r\n');
      input.end();

      await expect(answered).resolves.toBe(true);
    });

    it('answers sequential prompts from one piped stream, even in a single chunk', async () => {
      const { input, output } = makeStreams(false);
      input.write('y\nn\n');
      input.end();

      await expect(
        confirmPrompt({ message: 'First?', default: false }, { input, output })
      ).resolves.toBe(true);
      await expect(
        confirmPrompt({ message: 'Second?', default: true }, { input, output })
      ).resolves.toBe(false);

      // The piped answers are spent; a third prompt has nothing to read.
      await expect(
        confirmPrompt({ message: 'Third?', default: true }, { input, output })
      ).rejects.toThrow(/could not be answered/);
    });

    it('rejects with an ExitPromptError-shaped error when the input ends unanswered', async () => {
      const { input, output, written } = makeStreams(false);
      const answered = confirmPrompt({ message: 'Continue?', default: false }, { input, output });
      input.end();

      await expect(answered).rejects.toMatchObject({ name: 'ExitPromptError' });
      await answered.catch((error) => {
        expect(isNonInteractivePromptError(error)).toBe(true);
      });
      expect(written()).not.toMatch(ANSI);
    });

    it('uses the inquirer prompt when both streams are a TTY', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockResolvedValueOnce(true);

      const { input, output, written } = makeStreams(true);
      await expect(
        confirmPrompt({ message: 'Continue?', default: false }, { input, output })
      ).resolves.toBe(true);

      expect(mockConfirm).toHaveBeenCalledWith(
        { message: 'Continue?', default: false },
        { input, output }
      );
      // The inquirer prompt owns the stream; confirmPrompt writes nothing itself.
      expect(written()).toBe('');
    });

    it('calls the inquirer prompt with a single argument when no streams are injected', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockResolvedValueOnce(false);

      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      const originalStdoutIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true, configurable: true });
      try {
        await expect(confirmPrompt({ message: 'Continue?', default: true })).resolves.toBe(false);
        expect(mockConfirm).toHaveBeenCalledWith({ message: 'Continue?', default: true });
      } finally {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalStdoutIsTTY,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('isNonInteractivePromptError', () => {
    it('classifies an EOF-shaped ExitPromptError as a failed prompt', () => {
      const error = new Error('User force closed the prompt with 0 null');
      error.name = 'ExitPromptError';
      expect(isNonInteractivePromptError(error)).toBe(true);
    });

    it('never classifies a SIGINT cancellation as a failed prompt', () => {
      const error = new Error('User force closed the prompt with SIGINT');
      error.name = 'ExitPromptError';
      expect(isNonInteractivePromptError(error)).toBe(false);
    });

    it('ignores unrelated errors and non-errors', () => {
      expect(isNonInteractivePromptError(new Error('boom'))).toBe(false);
      expect(isNonInteractivePromptError('ExitPromptError')).toBe(false);
      expect(isNonInteractivePromptError(undefined)).toBe(false);
    });
  });
});
