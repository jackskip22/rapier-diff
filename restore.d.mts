// SPDX-License-Identifier: MIT
import type {DiffResult, Splice} from './index.mjs';
/** `after` with the chosen concerns put back; throws TypeError for a malformed result. */
export function restore(before: string, after: string, result: DiffResult, ids: number[]): string;
/** The same restoration as sequential operations; each pos is measured after the earlier ones. */
export function restoreEdits(before: string, after: string, result: DiffResult, ids: number[]): Splice[];
