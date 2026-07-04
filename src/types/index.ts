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

// ─── Transformer Types ─────────────────────────────────────────────────────────

/**
 * A single capture point injected by the transformer.
 *
 * Each `__capture(step)` call corresponds to one of these entries, allowing
 * the runtime to map a step index back to the originating source location.
 */
export interface CapturePoint {
  /** Sequential 1-based step index matching the `__capture(step)` argument. */
  step: number;
  /**
   * The AST node type that triggered this capture
   * (e.g. "VariableDeclaration", "ReturnStatement").
   */
  nodeType: string;
  /** 1-based source line of the captured statement, or null when unavailable. */
  line: number | null;
  /** 0-based source column, or null when unavailable. */
  column: number | null;
}

/**
 * Successful result returned by `transformCode`.
 */
export interface TransformSuccess {
  success: true;
  /** The instrumented JavaScript source ready to be executed. */
  transformedCode: string;
  /**
   * Inline source map in JSON string form (v3 format).
   * Maps positions in `transformedCode` back to the original source.
   */
  sourceMap: string;
  /** Ordered list of every capture point inserted during transformation. */
  capturePoints: CapturePoint[];
}

/**
 * Failure result returned by `transformCode`.
 */
export interface TransformFailure {
  success: false;
  /** Structured error describing what went wrong (parse or internal error). */
  error: ParseError;
}

/** Discriminated union returned by `transformCode`. */
export type TransformResult = TransformSuccess | TransformFailure;

// ─── Transformer Options ───────────────────────────────────────────────────────

/**
 * Fine-grained control over which statement types get instrumented.
 * All flags default to `true`.
 */
export interface TransformOptions {
  /** Insert `__capture` after `VariableDeclaration` nodes. */
  captureVariableDeclarations?: boolean;
  /** Insert `__capture` after assignment expressions. */
  captureAssignments?: boolean;
  /** Insert `__capture` after bare expression statements. */
  captureExpressionStatements?: boolean;
  /** Insert `__capture` after standalone function call expressions. */
  captureFunctionCalls?: boolean;
  /** Insert `__capture` after `ReturnStatement` nodes. */
  captureReturnStatements?: boolean;
  /** Insert `__capture` at the start of every loop body iteration. */
  captureLoopIterations?: boolean;
  /** Insert `__capture` after each branch (`if` / `else`) block. */
  captureIfBlocks?: boolean;
  /**
   * Name of the runtime capture function injected into the output.
   * Defaults to `"__capture"`.
   */
  captureFunctionName?: string;
}
