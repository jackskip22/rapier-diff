// SPDX-License-Identifier: MIT
export interface DiffPart { value: string; added?: true; removed?: true; }
export function diffLines(before: string, after: string, options?: {limit?: number}): DiffPart[];
export function diffWords(before: string, after: string, options?: {limit?: number}): DiffPart[];
