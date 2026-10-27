// SPDX-License-Identifier: MIT
import type {DiffResult} from './index.mjs';
export function toHTML(before: string, after: string, result: DiffResult): string;
export function toReview(before: string, after: string, result: DiffResult, options?: {render?: (markdown: string) => string}): string;
export const reviewCSS: string;
