// SPDX-License-Identifier: MIT
/** A half-open UTF-16 range: `start` is included, `end` is not. All offsets in rapier-diff use it. */
export type Range = [start: number, end: number];
export interface Edit { before: Range; after: Range; /** The work limit stopped refinement; the edit stays exact. */ coarse?: true; }
export type ChangeKind = 'insert' | 'delete' | 'replace' | 'move' | 'rename' | 'format';
export interface Change {
  id: number;
  kind: ChangeKind;
  /** char, word, line, block, or a parser's part kind such as section, task, cell or declaration. */
  unit: string;
  /** Indices into the edit array. */
  edits: number[];
  /** On a wording change inside a moved part, the id of that move. */
  move?: number;
  name?: string;
  /** For display only; never source for reconstruction or restore. */
  context?: {before: Range; after: Range};
  breaks?: {at: Range; to: string}[];
  affects?: Range[];
}
export interface Splice { pos: number; removed: string; inserted: string; }
export type BindingKey = string | number | boolean | null;
export interface Part { start: number; end: number; kind: string; name?: string; key?: BindingKey; nameAt?: Range; children?: Part[]; }
export interface Link { at: Range; to: string; key?: BindingKey; labelAt?: Range; }
export interface Observation { parts: Part[]; links?: Link[]; /** An opaque equality fingerprint; equal on both sides makes a change `format`. */ meaning?: unknown; }
export type StructureReader = (text: string) => Observation | null | undefined;
export interface DiffOptions {
  as?: 'auto' | 'prose' | 'code';
  unit?: 'token' | 'char';
  structure?: StructureReader;
  /** Counted work steps; default 1e7. */
  limit?: number;
  /** Recorded operations, oldest first; each pos is measured in the string just before it. */
  from?: Splice[];
}
export interface DiffResult {
  edits: Edit[];
  changes: Change[];
  fallback?: {structure?: 'threw' | 'invalid' | 'limit'; error?: unknown; from?: 'invalid' | 'limit'};
}
/** Exact edits and readable changes between two strings, prose or code. */
export function diff(before: string, after: string, options?: DiffOptions): DiffResult;
export interface MergeConflict { /** A range in the returned text holding `mine`. */ at: Range; theirs: string; }
export interface MergeResult { text: string; conflicts: MergeConflict[]; }
/** Three-way merge; overlapping edits keep `mine` in the text and the alternative in `theirs`. */
export function merge(base: string, mine: string, theirs: string, options?: Pick<DiffOptions, 'structure' | 'limit'>): MergeResult;
