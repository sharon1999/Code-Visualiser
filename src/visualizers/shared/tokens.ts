/**
 * Shared design tokens and Tailwind class helpers for all visualizers.
 * Keeps the visual language consistent without coupling components.
 */

// ─── Pointer colours ─────────────────────────────────────────────────────────
// Each well-known pointer name gets a deterministic colour so `left` is always
// teal, `right` always violet, etc. across all renders.

export const POINTER_COLORS: Record<string, string> = {
  left:    "bg-teal-500   text-white border-teal-400",
  right:   "bg-violet-500 text-white border-violet-400",
  slow:    "bg-orange-500 text-white border-orange-400",
  fast:    "bg-pink-500   text-white border-pink-400",
  mid:     "bg-yellow-500 text-black border-yellow-400",
  i:       "bg-sky-500    text-white border-sky-400",
  j:       "bg-emerald-500 text-white border-emerald-400",
  k:       "bg-indigo-500 text-white border-indigo-400",
  start:   "bg-green-500  text-white border-green-400",
  end:     "bg-red-500    text-white border-red-400",
  current: "bg-amber-500  text-black border-amber-400",
  pivot:   "bg-rose-500   text-white border-rose-400",
  head:    "bg-cyan-500   text-white border-cyan-400",
  tail:    "bg-purple-500 text-white border-purple-400",
};

export const POINTER_DOT_COLORS: Record<string, string> = {
  left:    "bg-teal-400",
  right:   "bg-violet-400",
  slow:    "bg-orange-400",
  fast:    "bg-pink-400",
  mid:     "bg-yellow-400",
  i:       "bg-sky-400",
  j:       "bg-emerald-400",
  k:       "bg-indigo-400",
  start:   "bg-green-400",
  end:     "bg-red-400",
  current: "bg-amber-400",
  pivot:   "bg-rose-400",
  head:    "bg-cyan-400",
  tail:    "bg-purple-400",
};

export const DEFAULT_POINTER_COLOR = "bg-slate-500 text-white border-slate-400";
export const DEFAULT_POINTER_DOT   = "bg-slate-400";

export function getPointerClasses(name: string): string {
  return POINTER_COLORS[name] ?? DEFAULT_POINTER_COLOR;
}

export function getPointerDotClass(name: string): string {
  return POINTER_DOT_COLORS[name] ?? DEFAULT_POINTER_DOT;
}

// ─── Glass card ───────────────────────────────────────────────────────────────

export const GLASS_CARD =
  "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl";

export const GLASS_HEADER =
  "text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3";

// ─── Section wrapper ──────────────────────────────────────────────────────────

export const SECTION_WRAPPER = "flex flex-col gap-2";

// ─── Node colours ─────────────────────────────────────────────────────────────

export const NODE_DEFAULT  = "bg-slate-700 border-slate-500 text-slate-100";
export const NODE_VISITED  = "bg-violet-700 border-violet-400 text-white";
export const NODE_CURRENT  = "bg-amber-500  border-amber-300  text-black";
export const NODE_SELECTED = "bg-teal-600   border-teal-300   text-white";

// ─── Format helpers ───────────────────────────────────────────────────────────

/** Converts any unknown value to a short display string. */
export function displayValue(val: unknown, maxLen = 16): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "string") {
    const s = JSON.stringify(val);
    return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
  }
  const s = String(val);
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
}
