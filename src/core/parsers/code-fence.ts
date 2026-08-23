/**
 * Shared fenced-code-block masking.
 *
 * Markdown headers inside fenced code blocks are examples, not structure. Every
 * parser that scans for `##`/`###`/`####` headers needs the same notion of
 * "this line is inside a fence", so the mask lives here as a plain function:
 * `requirement-blocks.ts` and `spec-structure.ts` can use it without importing
 * `MarkdownParser` (which would create a parser-class dependency and a cycle).
 */

interface FenceMarker {
  marker: '`' | '~';
  length: number;
}

/**
 * Returns one boolean per input line: true when the line is a fence delimiter
 * or lives inside a fenced block.
 */
export function buildCodeFenceMask(lines: string[]): boolean[] {
  const mask = new Array<boolean>(lines.length).fill(false);
  let activeFence: FenceMarker | null = null;

  for (let i = 0; i < lines.length; i++) {
    const fence = getFenceMarker(lines[i]);

    if (!activeFence) {
      if (fence) {
        activeFence = fence;
        mask[i] = true;
      }
      continue;
    }

    mask[i] = true;
    if (isClosingFence(lines[i], activeFence)) {
      activeFence = null;
    }
  }

  return mask;
}

function getFenceMarker(line: string): FenceMarker | null {
  const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
  if (!fenceMatch) {
    return null;
  }

  return {
    marker: fenceMatch[1][0] as '`' | '~',
    length: fenceMatch[1].length,
  };
}

function isClosingFence(line: string, activeFence: FenceMarker): boolean {
  const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*$/);
  return Boolean(
    fenceMatch &&
    fenceMatch[1][0] === activeFence.marker &&
    fenceMatch[1].length >= activeFence.length
  );
}
