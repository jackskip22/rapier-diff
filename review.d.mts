// SPDX-License-Identifier: MIT
import type {DiffResult} from './index.mjs';
export type BlockKind = 'text' | 'heading' | 'fence' | 'list' | 'frontmatter';
export interface Block { from: number; to: number; line: number; kind: BlockKind; level?: number; language?: string; }
export interface SameBlock { kind: BlockKind; level?: number; language?: string; before: {from: number; to: number; line: number}; after: {from: number; to: number; line: number}; }
export interface ChangedBlock extends Block { marks: [number, number][]; }
export type ReviewItem =
  | {type: 'fold'; blocks: SameBlock[]}
  | {type: 'same'; block: SameBlock}
  | {type: 'change'; kind: 'replace' | 'insert' | 'delete' | 'move' | 'spacing'; line: {before: number | null; after: number | null};
      before: ChangedBlock[]; after: ChangedBlock[]; edits: number[]; changes: number[]};
export function blocks(text: string): Block[];
export function review(before: string, after: string, result: DiffResult): {items: ReviewItem[]};
export function marked(text: string, block: Block, marks: [number, number][]): string;
export const OPEN: '\uFDD0';
export const CLOSE: '\uFDD1';
