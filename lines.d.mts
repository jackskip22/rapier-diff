// SPDX-License-Identifier: MIT
export interface DiffPart { value: string; added?: true; removed?: true; }
/** Line differences on their own: no concerns, moves, structure or merge. */
export function diffLines(before: string, after: string, options?: {limit?: number}): DiffPart[];
/** Word differences on their own: no concerns, moves, structure or merge. */
export function diffWords(before: string, after: string, options?: {limit?: number}): DiffPart[];
