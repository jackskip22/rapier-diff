// SPDX-License-Identifier: MIT
import type {DiffOptions} from './index.mjs';
/** A unified diff; it does not apply patches. */
export function toPatch(before: string, after: string, options?: DiffOptions & {beforeName?: string; afterName?: string; context?: number}): string;
