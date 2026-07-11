/**
 * Transformer Service
 *
 * Takes raw JavaScript / TypeScript source code, parses it into a Babel AST,
 * walks the tree with @babel/traverse, and injects instrumentation calls that
 * power the Phase 5 snapshot recorder.
 *
 * Injected runtime hooks (all provided by the executor worker):
 *
 *   __capture(step)            – fires at every tracked statement; triggers a
 *                                 snapshot post to the main thread.
 *   __trackVar(name, value)    – records the current value of a variable so the
 *                                 snapshot can include up-to-date variable state.
 *   __enterScope(fnName, line) – pushed when entering a function body; updates
 *                                 call-stack tracking.
 *   __exitScope()              – popped on every return / function end.
 *   __enterLoop()              – increments the loop-depth counter.
 *   __exitLoop()               – decrements the loop-depth counter.
 *
 * Public surface:
 *   transformCode(code, options?) → TransformResult
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

interface TransformContext {
  step: number;
  capturePoints: CapturePoint[];
  captureFnName: string;
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

// ─── AST node builders ────────────────────────────────────────────────────────

/**
 * Builds `__capture(step)` and records the capture point.
 * The step counter is incremented after recording.
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
 * Builds `__trackVar("name", name)` — a variable snapshot hook.
 */
function buildTrackVarCall(name: string): t.ExpressionStatement {
  return t.expressionStatement(
    t.callExpression(t.identifier("__trackVar"), [
      t.stringLiteral(name),
      t.identifier(name),
    ]),
  );
}

/**
 * Builds `__enterScope("fnName", line)` — pushed when a function is entered.
 */
function buildEnterScopeCall(
  fnName: string,
  line: number | null,
): t.ExpressionStatement {
  return t.expressionStatement(
    t.callExpression(t.identifier("__enterScope"), [
      t.stringLiteral(fnName),
      line != null ? t.numericLiteral(line) : t.nullLiteral(),
    ]),
  );
}

/**
 * Builds `__exitScope()` — popped on return or function end.
 */
function buildExitScopeCall(): t.ExpressionStatement {
  return t.expressionStatement(
    t.callExpression(t.identifier("__exitScope"), []),
  );
}

/**
 * Builds `__enterLoop()` — increments loop-depth counter.
 */
function buildEnterLoopCall(): t.ExpressionStatement {
  return t.expressionStatement(
    t.callExpression(t.identifier("__enterLoop"), []),
  );
}

/**
 * Builds `__exitLoop()` — decrements loop-depth counter.
 * Wraps in a try/finally if we need guaranteed cleanup.
 */
function buildExitLoopCall(): t.ExpressionStatement {
  return t.expressionStatement(
    t.callExpression(t.identifier("__exitLoop"), []),
  );
}

// ─── Insertion helpers ────────────────────────────────────────────────────────

/**
 * Inserts `statements` immediately *after* `path` in its parent block.
 * Falls back to wrapping in a BlockStatement for bare single-statement
 * branches (e.g. `if (x) doThis;`).
 */
function insertAfter(
  path: NodePath<t.Statement>,
  statements: t.ExpressionStatement[],
): void {
  if (path.parentPath?.isBlockStatement() || path.parentPath?.isProgram()) {
    // insertAfter inserts in reverse order when given multiple nodes
    for (let i = statements.length - 1; i >= 0; i--) {
      path.insertAfter(statements[i]);
    }
    return;
  }
  const block = t.blockStatement([path.node, ...statements]);
  path.replaceWith(block);
}

/**
 * Prepends `statements` at the **beginning** of a block body.
 */
function prependToBlock(
  block: t.BlockStatement,
  statements: t.ExpressionStatement[],
): void {
  block.body.unshift(...statements);
}

// ─── Visitor plugins ──────────────────────────────────────────────────────────

/**
 * After every `let/const/var` declaration, emit:
 *   `__trackVar("x", x); __capture(n);`
 * for each declared binding.
 */
function variableDeclarationPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureVariableDeclarations) return {};

  return {
    VariableDeclaration(path) {
      // Skip for-loop initialisers (the loop plugin handles those scopes)
      if (
        path.parentPath?.isForStatement() ||
        path.parentPath?.isForInStatement() ||
        path.parentPath?.isForOfStatement()
      ) {
        return;
      }

      const trackCalls: t.ExpressionStatement[] = [];
      for (const declarator of path.node.declarations) {
        // Collect all bound names (handles destructuring patterns too)
        const names = collectBindingNames(declarator.id);
        for (const name of names) {
          trackCalls.push(buildTrackVarCall(name));
        }
      }

      const capture = buildCaptureCall(
        ctx,
        "VariableDeclaration",
        path.node.loc,
      );
      insertAfter(path as NodePath<t.Statement>, [...trackCalls, capture]);
    },
  };
}

/**
 * After assignment expressions, emit:
 *   `__trackVar("x", x); __capture(n);`
 */
function assignmentPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureAssignments) return {};

  return {
    ExpressionStatement(path) {
      const expr = path.node.expression;
      if (!t.isAssignmentExpression(expr)) return;

      const trackCalls: t.ExpressionStatement[] = [];
      const names = collectLValueNames(expr.left);
      for (const name of names) {
        trackCalls.push(buildTrackVarCall(name));
      }

      const capture = buildCaptureCall(
        ctx,
        "AssignmentExpression",
        path.node.loc,
      );
      insertAfter(path as NodePath<t.Statement>, [...trackCalls, capture]);
    },
  };
}

/**
 * After update expressions (`x++`, `--y`), emit:
 *   `__trackVar("x", x); __capture(n);`
 */
function updateExpressionPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureAssignments) return {};

  return {
    ExpressionStatement(path) {
      const expr = path.node.expression;
      if (!t.isUpdateExpression(expr)) return;

      const trackCalls: t.ExpressionStatement[] = [];
      if (t.isIdentifier(expr.argument)) {
        trackCalls.push(buildTrackVarCall(expr.argument.name));
      }

      const capture = buildCaptureCall(
        ctx,
        "UpdateExpression",
        path.node.loc,
      );
      insertAfter(path as NodePath<t.Statement>, [...trackCalls, capture]);
    },
  };
}

/**
 * Captures generic expression statements not covered by the more specific
 * plugins above (not assignments, updates, or calls).
 */
function expressionStatementPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureExpressionStatements) return {};

  return {
    ExpressionStatement(path) {
      const expr = path.node.expression;
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
      insertAfter(path as NodePath<t.Statement>, [capture]);
    },
  };
}

/**
 * After standalone function-call statements, emit `__capture(n)`.
 */
function functionCallPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureFunctionCalls) return {};

  return {
    ExpressionStatement(path) {
      const expr = path.node.expression;
      if (!t.isCallExpression(expr) && !t.isOptionalCallExpression(expr)) {
        return;
      }
      // Don't re-instrument our own injected runtime hooks
      if (t.isCallExpression(expr) && t.isIdentifier(expr.callee)) {
        const name = expr.callee.name;
        if (
          name === ctx.captureFnName ||
          name === "__trackVar" ||
          name === "__enterScope" ||
          name === "__exitScope" ||
          name === "__enterLoop" ||
          name === "__exitLoop"
        ) {
          return;
        }
      }
      const capture = buildCaptureCall(ctx, "CallExpression", path.node.loc);
      insertAfter(path as NodePath<t.Statement>, [capture]);
    },
  };
}

/**
 * Before every `return` statement, emit:
 *   `__capture(n); __exitScope();`
 *
 * `__capture` is placed BEFORE the return (it exits immediately after).
 * `__exitScope` pops the current function frame from the call stack.
 */
function returnStatementPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureReturnStatements) return {};

  return {
    ReturnStatement(path) {
      const capture = buildCaptureCall(ctx, "ReturnStatement", path.node.loc);
      const exitScope = buildExitScopeCall();
      // Insert in order: capture fires, then scope pops, then return executes
      path.insertBefore(exitScope);
      path.insertBefore(capture);
      path.skip();
    },
  };
}

/**
 * For every loop (`for`, `for…in`, `for…of`, `while`, `do…while`):
 *
 * 1. Wrap the loop in a try/finally that calls `__enterLoop()` before
 *    and `__exitLoop()` after (guaranteed even on `break`/`continue`).
 * 2. Prepend `__capture(n)` to the loop body so it fires every iteration.
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
    // ── Normalise body to a block ──────────────────────────────────────────
    if (!t.isBlockStatement(path.node.body)) {
      path.node.body = t.blockStatement([path.node.body]);
    }
    const block = path.node.body as t.BlockStatement;

    // ── Prepend per-iteration capture ──────────────────────────────────────
    const iterCapture = buildCaptureCall(ctx, path.node.type, path.node.loc);
    prependToBlock(block, [iterCapture]);

    // ── Wrap the whole loop in try/finally for __enterLoop/__exitLoop ──────
    const enterLoop = buildEnterLoopCall();
    const exitLoop = buildExitLoopCall();

    const tryFinally = t.tryStatement(
      t.blockStatement([path.node as t.Statement]),
      null,
      t.blockStatement([exitLoop]),
    );

    // Replace the loop with: __enterLoop(); try { <loop> } finally { __exitLoop(); }
    path.replaceWithMultiple([enterLoop, tryFinally]);
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
 * Inside `if` / `else` branches, append `__capture(n)` at the end of each body.
 */
function ifBlockPlugin(ctx: TransformContext): Visitor {
  if (!ctx.opts.captureIfBlocks) return {};

  const instrumentBranch = (
    branch: t.Statement,
    nodeType: string,
    loc?: t.SourceLocation | null,
  ): t.Statement => {
    const capture = buildCaptureCall(ctx, nodeType, loc);
    if (t.isBlockStatement(branch)) {
      branch.body.push(capture);
      return branch;
    }
    return t.blockStatement([branch, capture]);
  };

  return {
    IfStatement(path) {
      const node = path.node;
      node.consequent = instrumentBranch(node.consequent, "IfConsequent", node.loc);
      if (node.alternate && !t.isIfStatement(node.alternate)) {
        node.alternate = instrumentBranch(node.alternate, "IfAlternate", node.loc);
      }
    },
  };
}

/**
 * At the entry of every function declaration / expression / arrow function,
 * prepend `__enterScope(name, line)`.
 * At the end of the body (for functions without an explicit return that exits
 * via `__exitScope` already), append `__exitScope()`.
 */
function functionScopePlugin(): Visitor {
  const handleFunction = (
    path: NodePath<
      | t.FunctionDeclaration
      | t.FunctionExpression
      | t.ArrowFunctionExpression
    >,
  ) => {
    const node = path.node;

    // Resolve a display name for the frame
    let fnName = "<anonymous>";
    if (t.isFunctionDeclaration(node) && node.id) {
      fnName = node.id.name;
    } else if (
      t.isFunctionExpression(node) &&
      node.id
    ) {
      fnName = node.id.name;
    } else if (path.parentPath?.isVariableDeclarator()) {
      const id = (path.parentPath.node as t.VariableDeclarator).id;
      if (t.isIdentifier(id)) fnName = id.name;
    } else if (path.parentPath?.isAssignmentExpression()) {
      const left = (path.parentPath.node as t.AssignmentExpression).left;
      if (t.isIdentifier(left)) fnName = left.name;
    } else if (path.parentPath?.isObjectProperty()) {
      const key = (path.parentPath.node as t.ObjectProperty).key;
      if (t.isIdentifier(key)) fnName = key.name;
    }

    const line = node.loc?.start.line ?? null;
    const enterCall = buildEnterScopeCall(fnName, line);
    const exitCall = buildExitScopeCall();

    // Arrow functions can have an expression body — normalise to a block
    if (t.isArrowFunctionExpression(node) && !t.isBlockStatement(node.body)) {
      const returnStmt = t.returnStatement(node.body as t.Expression);
      node.body = t.blockStatement([returnStmt]);
    }

    const body = node.body as t.BlockStatement;
    // Prepend __enterScope
    body.body.unshift(enterCall);
    // Append __exitScope (handles the implicit-return / fall-through case)
    body.body.push(exitCall);
  };

  return {
    FunctionDeclaration: handleFunction,
    FunctionExpression: handleFunction,
    ArrowFunctionExpression: handleFunction,
  };
}

// ─── Visitor composition ──────────────────────────────────────────────────────

function buildVisitor(ctx: TransformContext): Visitor {
  const plugins: Visitor[] = [
    // functionScopePlugin must run first so it wraps all function bodies
    // before other plugins insert statements inside them.
    functionScopePlugin(),
    loopIterationPlugin(ctx),
    ifBlockPlugin(ctx),
    returnStatementPlugin(ctx),
    variableDeclarationPlugin(ctx),
    assignmentPlugin(ctx),
    updateExpressionPlugin(ctx),
    functionCallPlugin(ctx),
    expressionStatementPlugin(ctx),
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mergeVisitors = (traverse as any).visitors?.merge as
    | ((visitors: Visitor[]) => Visitor)
    | undefined;

  return mergeVisitors ? mergeVisitors(plugins) : Object.assign({}, ...plugins);
}

// ─── Binding name helpers ─────────────────────────────────────────────────────

/**
 * Recursively collects all identifier names from an LVal (assignment target).
 * Handles simple identifiers, array patterns, and object patterns.
 */
function collectBindingNames(node: t.LVal | t.Expression): string[] {
  if (t.isIdentifier(node)) return [node.name];
  if (t.isArrayPattern(node)) {
    return node.elements.flatMap((el) =>
      el && !t.isRestElement(el) ? collectBindingNames(el as t.LVal) : [],
    );
  }
  if (t.isObjectPattern(node)) {
    return node.properties.flatMap((prop) => {
      if (t.isRestElement(prop)) {
        return t.isIdentifier(prop.argument) ? [prop.argument.name] : [];
      }
      return collectBindingNames((prop as t.ObjectProperty).value as t.LVal);
    });
  }
  if (t.isAssignmentPattern(node)) {
    return collectBindingNames(node.left);
  }
  return [];
}

/**
 * Collects names from the left-hand side of an assignment expression.
 */
function collectLValueNames(node: t.LVal | t.Expression): string[] {
  if (t.isIdentifier(node)) return [node.name];
  if (t.isMemberExpression(node)) {
    // `obj.prop = …` or `arr[i] = …` — track the root object
    const root = getMemberRoot(node);
    return root ? [root] : [];
  }
  return collectBindingNames(node as t.LVal);
}

function getMemberRoot(node: t.MemberExpression): string | null {
  if (t.isIdentifier(node.object)) return node.object.name;
  if (t.isMemberExpression(node.object)) return getMemberRoot(node.object);
  return null;
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
 * Transforms `code` by injecting snapshot-recorder instrumentation and returns
 * the instrumented JavaScript together with a v3 source map.
 *
 * The transformed output will call these runtime hooks (provided by the worker):
 *   - `__capture(step)`           – snapshot trigger
 *   - `__trackVar(name, value)`   – variable tracker
 *   - `__enterScope(name, line)`  – call-stack push
 *   - `__exitScope()`             – call-stack pop
 *   - `__enterLoop()`             – loop-depth increment
 *   - `__exitLoop()`              – loop-depth decrement
 *
 * @example
 * ```ts
 * const result = transformCode('let x = 5;\nx++;');
 * if (result.success) {
 *   console.log(result.transformedCode);
 *   // __enterScope("<global>", 1);
 *   // let x = 5;
 *   // __trackVar("x", x); __capture(1);
 *   // x++;
 *   // __trackVar("x", x); __capture(2);
 *   // __exitScope();
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
