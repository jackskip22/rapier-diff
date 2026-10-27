// SPDX-License-Identifier: MIT
import type {DiffResult, Splice} from './index.mjs';
export function restore(before: string, after: string, result: DiffResult, ids: number[]): string;
export function restoreEdits(before: string, after: string, result: DiffResult, ids: number[]): Splice[];
