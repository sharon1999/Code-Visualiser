/**
 * Transformer Service
 *
 * Takes raw JavaScript / TypeScript source code, parses it into a Babel AST,
 * walks the tree with @babel/traverse, and injects `__capture(step)` calls
 * after every targeted statement.  The instrumented AST is then serialised
 * back to JavaScript by @babel/generator, which also produces a v3 source map.
 *
 * Public surface:
 *   transformCode(code, options?) → TransformResult
 *
 * Architecture notes:
 *   - The visitor pipeline is composed from small, single-responsibility plugin
 *     functions (see VISITOR PLUGINS section).  Adding a new capture site means
 *     writing one more plugin and registering it in `buildVisitor`.
 *   - All state (step counter, capture-point list) is held in a `TransformContext`
 *     object that is threaded through every plugin – no module-level singletons.
 *   - The service never mutates the original AST; `parseCode` clones nothing, but
 *     traverse edits happen on a fresh parse each call.
 */

import traverse, { type NodePath, type Visitor } from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { parseCode } from "./parser";
import type {
  CapturePoint,
  ParseError,
  TransformOptions,
  TransformResult,
} from "../types";

// ─── Internal context ──────────────────────────────────────────────────────────

/**
 * Mutable context shared across all visitor plugins within a single
 * `transformCode` call.
 */
interface TransformContext {
  /** Monotonically increasing step counter (starts at 1). */
  step: number;
  /** Accumulates one entry per injected `__capture` call. */
  capturePoints: CapturePoint[];
  /** Resolved capture-function identifier name (default: `"__capture"`). */
  captureFnName: string;
  /** Merged, fully-resolved options (all flags boolean). */
  opts: Required<Omit<TransformOptions, "captureFunctionName">>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: Required<TransformOptions> = {
  captureVariableDeclarations: true,
  captureAssignments: true,
  captureExpressionStatements: true,
  captureFunctionCalls: true,
  captureReturnStatements: true,
  captureLoopIterations: true,
  captureIfBlocks: true,
  captureFunctionName: "__capture",
};

// ─── AST helpers ──────────────────────────────────────────────────────────────

/**
 * Builds the AST node for `__capture(step)` and records the capture point.
 *
 * @param ctx      - Shared transform context (mutated: step incremented).
 * @param nodeType - The originating AST node type string.
 * @param loc      - Optional source location from the triggering node.
 */
function buildCaptureCall(
  ctx: TransformContext,
  nodeType: string,
  loc?: t.SourceLocation | null,
): t.ExpressionStatement {
  const step = ctx.step++;

  ctx.capturePoints.push({
    step,
    nodeType,
    line: loc?.start.line ?? null,
    column: loc?.start.column ?? null,
  });

  return t.expressionStatement(
    t.callExpression(t.identifier(ctx.captureFnName), [t.numericLiteral(step)]),
  );
}

/**
 * Inserts a `__capture` statement immediately *after* `path` in its parent
 * block, falling back to wrapping in a block if the parent is a bare
 * single-statement branch (e.g. `if (x) stmt`).
 */
function insertAfter(
  path: NodePath<t.Statement>,
  captureStmt: t.ExpressionStatement,
): void {
  if (path.parentPath?.isBlockStatement() || path.parentPath?.isProgram()) {
    path.insertAfter(captureStmt);
    return;
  }

  // For bare `if/else/for/while` single-statement bodies we need to wrap
  const block = t.blockStatement([path.node, captureStmt]);
  path.replaceWith(block);
}

/**
 * Prepends a `__capture` statement at the **beginning** of a block body.
 * Used for loop-iteration capture (fires every iteration).
 */
function prependToBlock(
  block: t.BlockStatement,
  captureStmt: t.ExpressionStatement,
): void {
  block.body.unshift(captureStmt);
}

// ─── Visitor plugins ──────────────────────────────────────────────────────────
//
// Each plugin returns a partial Babel Visitor.  They are merged in buildVisitor.

/**
 * Captures VariableDeclaration statements:
 *   `let x = 5;`  →  `let x = 5;\n__capture(n);`
 */
function variableDeclarationPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureVariableDeclarations) return {};

  return {
    VariableDeclaration(path) {
      // Skip variable declarations inside for-loop initialisers to avoid
      // double-instrumentation (the loop plugin covers those bodies).
      if (
        path.parentPath?.isForStatement() ||
        path.parentPath?.isForInStatement() ||
        path.parentPath?.isForOfStatement()
      ) {
        return;
      }

      const capture = buildCaptureCall(
        ctx,
        "VariableDeclaration",
        path.node.loc,
      );
      insertAfter(path as NodePath<t.Statement>, capture);
    },
  };
}

/**
 * Captures assignment expressions that appear as standalone expression
 * statements:
 *   `x = 10;`  →  `x = 10;\n__capture(n);`
 */
function assignmentPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureAssignments) return {};

  return {
    ExpressionStatement(path) {
      if (!t.isAssignmentExpression(path.node.expression)) return;

      const capture = buildCaptureCall(
        ctx,
        "AssignmentExpression",
        path.node.loc,
      );
      insertAfter(path as NodePath<t.Statement>, capture);
    },
  };
}

/**
 * Captures update expressions used as standalone statements:
 *   `x++;`  →  `x++;\n__capture(n);`
 */
function updateExpressionPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureAssignments) return {};

  return {
    ExpressionStatement(path) {
      if (!t.isUpdateExpression(path.node.expression)) return;

      const capture = buildCaptureCall(
        ctx,
        "UpdateExpression",
        path.node.loc,
      );
      insertAfter(path as NodePath<t.Statement>, capture);
    },
  };
}

/**
 * Captures generic expression statements not covered by the more specific
 * plugins above (i.e. not assignments, updates, or calls).
 */
function expressionStatementPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureExpressionStatements) return {};

  return {
    ExpressionStatement(path) {
      const expr = path.node.expression;

      // Skip types already handled by more specific plugins
      if (
        t.isAssignmentExpression(expr) ||
        t.isUpdateExpression(expr) ||
        t.isCallExpression(expr) ||
        t.isOptionalCallExpression(expr)
      ) {
        return;
      }

      const capture = buildCaptureCall(
        ctx,
        "ExpressionStatement",
        path.node.loc,
      );
      insertAfter(path as NodePath<t.Statement>, capture);
    },
  };
}

/**
 * Captures standalone function-call expression statements:
 *   `foo();`  →  `foo();\n__capture(n);`
 */
function functionCallPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureFunctionCalls) return {};

  return {
    ExpressionStatement(path) {
      const expr = path.node.expression;
      if (!t.isCallExpression(expr) && !t.isOptionalCallExpression(expr)) {
        return;
      }

      // Don't re-instrument our own injected __capture() calls
      if (
        t.isCallExpression(expr) &&
        t.isIdentifier(expr.callee, { name: ctx.captureFnName })
      ) {
        return;
      }

      const capture = buildCaptureCall(ctx, "CallExpression", path.node.loc);
      insertAfter(path as NodePath<t.Statement>, capture);
    },
  };
}

/**
 * Captures return statements by inserting `__capture(n)` BEFORE the return
 * (the return exits the function so nothing after it would execute).
 */
function returnStatementPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureReturnStatements) return {};

  return {
    ReturnStatement(path) {
      const capture = buildCaptureCall(ctx, "ReturnStatement", path.node.loc);
      path.insertBefore(capture);
      path.skip();
    },
  };
}

/**
 * Captures every loop iteration by prepending `__capture(n)` to loop bodies.
 *
 * Covers: `for`, `for…in`, `for…of`, `while`, `do…while`.
 */
function loopIterationPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureLoopIterations) return {};

  const handleLoop = (
    path: NodePath<
      | t.ForStatement
      | t.ForInStatement
      | t.ForOfStatement
      | t.WhileStatement
      | t.DoWhileStatement
    >,
  ) => {
    const bodyNode = path.node.body;

    if (!t.isBlockStatement(bodyNode)) {
      const block = t.blockStatement([bodyNode]);
      path.node.body = block;
    }

    const block = path.node.body as t.BlockStatement;
    const capture = buildCaptureCall(ctx, path.node.type, path.node.loc);
    prependToBlock(block, capture);
  };

  return {
    ForStatement: handleLoop,
    ForInStatement: handleLoop,
    ForOfStatement: handleLoop,
    WhileStatement: handleLoop,
    DoWhileStatement: handleLoop,
  };
}

/**
 * Captures inside `if` and `else` branches by appending `__capture(n)` at the
 * end of each branch body.
 */
function ifBlockPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureIfBlocks) return {};

  const instrumentBranch = (
    branch: t.Statement,
    nodeType: string,
    loc?: t.SourceLocation | null,
  ): t.Statement => {
    if (t.isBlockStatement(branch)) {
      branch.body.push(buildCaptureCall(ctx, nodeType, loc));
      return branch;
    }
    // Wrap bare single-statement branch in a block
    return t.blockStatement([branch, buildCaptureCall(ctx, nodeType, loc)]);
  };

  return {
    IfStatement(path) {
      const node = path.node;

      node.consequent = instrumentBranch(
        node.consequent,
        "IfConsequent",
        node.loc,
      );

      if (node.alternate && !t.isIfStatement(node.alternate)) {
        node.alternate = instrumentBranch(
          node.alternate,
          "IfAlternate",
          node.loc,
        );
      }
    },
  };
}

// ─── Visitor composition ──────────────────────────────────────────────────────

function buildVisitor(ctx: TransformContext): Visitor {
  const plugins: Visitor[] = [
    loopIterationPlugin(ctx),
    ifBlockPlugin(ctx),
    returnStatementPlugin(ctx),
    variableDeclarationPlugin(ctx),
    assignmentPlugin(ctx),
    updateExpressionPlugin(ctx),
    functionCallPlugin(ctx),
    expressionStatementPlugin(ctx),
  ];

  // Use Babel's built-in visitor merge if available, otherwise plain merge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mergeVisitors = (traverse as any).visitors?.merge as
    | ((visitors: Visitor[]) => Visitor)
    | undefined;

  return mergeVisitors ? mergeVisitors(plugins) : Object.assign({}, ...plugins);
}

// ─── Error normalisation ───────────────────────────────────────────────────────

function toParseError(thrown: unknown): ParseError {
  if (thrown instanceof SyntaxError || thrown instanceof Error) {
    const e = thrown as Error & { loc?: { line?: number; column?: number } };
    return {
      message: e.message,
      line: e.loc?.line ?? null,
      column: e.loc?.column ?? null,
    };
  }
  return { message: String(thrown), line: null, column: null };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Transforms `code` by injecting `__capture(step)` calls at every configured
 * statement site and returns the instrumented JavaScript together with a v3
 * source map.
 *
 * @param code    - Raw JavaScript / TypeScript source accepted by the parser.
 * @param options - Optional per-site feature flags and capture-function name.
 *
 * @example
 * ```ts
 * const result = transformCode('let x = 5;\nx++;');
 * if (result.success) {
 *   console.log(result.transformedCode);
 *   // let x = 5;
 *   // __capture(1);
 *   // x++;
 *   // __capture(2);
 * }
 * ```
 */
export function transformCode(
  code: string,
  options?: TransformOptions,
): TransformResult {
  // ── 1. Parse ──────────────────────────────────────────────────────────────
  const parseResult = parseCode(code);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error };
  }

  const ast = parseResult.ast;

  // ── 2. Build context ──────────────────────────────────────────────────────
  const resolvedOptions: Required<TransformOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const ctx: TransformContext = {
    step: 1,
    capturePoints: [],
    captureFnName: resolvedOptions.captureFunctionName,
    opts: {
      captureVariableDeclarations: resolvedOptions.captureVariableDeclarations,
      captureAssignments: resolvedOptions.captureAssignments,
      captureExpressionStatements: resolvedOptions.captureExpressionStatements,
      captureFunctionCalls: resolvedOptions.captureFunctionCalls,
      captureReturnStatements: resolvedOptions.captureReturnStatements,
      captureLoopIterations: resolvedOptions.captureLoopIterations,
      captureIfBlocks: resolvedOptions.captureIfBlocks,
    },
  };

  // ── 3. Traverse & instrument ──────────────────────────────────────────────
  try {
    traverse(ast, buildVisitor(ctx));
  } catch (thrown) {
    return { success: false, error: toParseError(thrown) };
  }

  // ── 4. Generate instrumented code + source map ────────────────────────────
  try {
    const generated = generate(
      ast,
      {
        sourceMaps: true,
        sourceFileName: "source.js",
        retainLines: false,
        compact: false,
        concise: false,
        comments: true,
      },
      code,
    );

    return {
      success: true,
      transformedCode: generated.code,
      sourceMap: JSON.stringify(generated.map ?? {}),
      capturePoints: ctx.capturePoints,
    };
  } catch (thrown) {
    return { success: false, error: toParseError(thrown) };
  }
}
