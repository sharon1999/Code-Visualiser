import type { File as BabelFile } from "@babel/types";

// ─── Parser Types ──────────────────────────────────────────────────────────────

/**
 * Structured representation of a syntax error returned by the parser service.
 */
export interface ParseError {
  /** Human-readable error message from Babel. */
  message: string;
  /** 1-based line number where the error occurred, or null if unavailable. */
  line: number | null;
  /** 0-based column number where the error occurred, or null if unavailable. */
  column: number | null;
}

/**
 * Discriminated union returned by `parseCode`.
 *
 * - On success: `{ success: true; ast: BabelFile }`
 * - On failure: `{ success: false; error: ParseError }`
 */
export type ParseResult =
  | { success: true; ast: BabelFile }
  | { success: false; error: ParseError };
