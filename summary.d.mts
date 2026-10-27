// SPDX-License-Identifier: MIT
import type {ChangeKind, DiffResult} from './index.mjs';
export interface SummaryRow { id: number; kind: ChangeKind; line: number; removed?: string; inserted?: string; from?: number; text?: string; }
/** One compact row per concern, within a JSON character budget. */
export function summary(before: string, after: string, result: DiffResult, options?: {chars?: number}): {changes: SummaryRow[]; omitted: number};
