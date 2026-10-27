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
/** Top-level Markdown blocks: paragraphs, headings, fences, tables and lists. */
export function blocks(text: string): Block[];
/** A comparison as rendered blocks: unchanged runs fold, headings stay, each changed group keeps its old and new blocks whole. */
export function review(before: string, after: string, result: DiffResult): {items: ReviewItem[]};
/** One block's source with its marks written as U+FDD0 … U+FDD1. */
export function marked(text: string, block: Block, marks: [number, number][]): string;
export const OPEN: '\uFDD0';
export const CLOSE: '\uFDD1';
