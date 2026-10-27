// SPDX-License-Identifier: MIT
import type {DiffResult} from './index.mjs';
/** Escaped HTML with <del> and <ins> for exact edits, classed by concern kind and unit, data-change for its id. */
export function toHTML(before: string, after: string, result: DiffResult): string;
/** The comparison as rendered Markdown blocks, one HTML fragment. `render` turns one block's Markdown into HTML and keeps U+FDD0 and U+FDD1 as text. */
export function toReview(before: string, after: string, result: DiffResult, options?: {render?: (markdown: string) => string}): string;
/** Styles for toReview's fragment: pale old and new grounds, quiet labels, folded runs. Light and dark. */
export const reviewCSS: string;
