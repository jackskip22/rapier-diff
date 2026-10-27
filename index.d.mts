// SPDX-License-Identifier: MIT
export type Range = [start: number, end: number];
export interface Edit { before: Range; after: Range; coarse?: true; }
export type ChangeKind = 'insert' | 'delete' | 'replace' | 'move' | 'rename' | 'format';
export interface Change {
  id: number;
  kind: ChangeKind;
  unit: string;
  edits: number[];
  move?: number;
  name?: string;
  context?: {before: Range; after: Range};
  breaks?: {at: Range; to: string}[];
  affects?: Range[];
}
export interface Splice { pos: number; removed: string; inserted: string; }
export type BindingKey = string | number | boolean | null;
export interface Part { start: number; end: number; kind: string; name?: string; key?: BindingKey; nameAt?: Range; children?: Part[]; }
export interface Link { at: Range; to: string; key?: BindingKey; labelAt?: Range; }
export interface Observation { parts: Part[]; links?: Link[]; meaning?: unknown; }
export type StructureReader = (text: string) => Observation | null | undefined;
export interface DiffOptions {
  as?: 'auto' | 'prose' | 'code';
  unit?: 'token' | 'char';
  structure?: StructureReader;
  limit?: number;
  from?: Splice[];
}
export interface DiffResult {
  edits: Edit[];
  changes: Change[];
  fallback?: {structure?: 'threw' | 'invalid' | 'limit'; error?: unknown; from?: 'invalid' | 'limit'};
}
export function diff(before: string, after: string, options?: DiffOptions): DiffResult;
export interface MergeConflict { at: Range; theirs: string; }
export interface MergeResult { text: string; conflicts: MergeConflict[]; }
export function merge(base: string, mine: string, theirs: string, options?: Pick<DiffOptions, 'structure' | 'limit'>): MergeResult;
