/**
 * Parser Service
 *
 * Wraps @babel/parser to convert raw JavaScript / TypeScript source code into
 * a Babel AST.  All results are returned as a discriminated union so callers
 * never have to deal with thrown exceptions.
 */

import { parse, type ParserOptions } from "@babel/parser";
import type { File as BabelFile } from "@babel/types";
import type { ParseError, ParseResult } from "../types";

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Default Babel parser options.
 *
 * - `sourceType: 'module'`  – supports ESM import/export and top-level await.
 * - `errorRecovery: false`  – hard stop on first syntax error for a precise message.
 * - The plugin list covers the JS / TS feature set users are likely to write.
 */
const DEFAULT_PARSER_OPTIONS: ParserOptions = {
  sourceType: "module",
  errorRecovery: false,
  plugins: [
    "typescript",
    "jsx",
    "decorators-legacy",
    "doExpressions",
    "functionBind",
  ],
};

// ─── Error Extraction ─────────────────────────────────────────────────────────

/**
 * Converts an unknown thrown value into a structured {@link ParseError}.
 *
 * Babel throws SyntaxError objects with an `loc` property (line/column) when it
 * encounters invalid syntax.  For all other errors we still capture the message
 * so callers always receive a consistent shape.
 */
function extractParseError(thrown: unknown): ParseError {
  if (thrown instanceof SyntaxError) {
    const babelError = thrown as SyntaxError & {
      loc?: { line?: number; column?: number };
    };

    return {
      message: babelError.message,
      line: babelError.loc?.line ?? null,
      column: babelError.loc?.column ?? null,
    };
  }

  if (thrown instanceof Error) {
    return { message: thrown.message, line: null, column: null };
  }

  return { message: String(thrown), line: null, column: null };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses `code` using @babel/parser and returns a typed {@link ParseResult}.
 *
 * @param code    - Raw source code string from the Monaco Editor.
 * @param options - Optional overrides merged on top of the default options.
 *
 * @example
 * ```ts
 * const result = parseCode('const x = 1 +');
 * if (result.success) {
 *   console.log(result.ast.type); // "File"
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function parseCode(
  code: string,
  options?: Partial<ParserOptions>,
): ParseResult {
  try {
    const ast: BabelFile = parse(code, {
      ...DEFAULT_PARSER_OPTIONS,
      ...options,
    });

    return { success: true, ast };
  } catch (thrown) {
    return { success: false, error: extractParseError(thrown) };
  }
}
