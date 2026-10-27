// SPDX-License-Identifier: MIT
import type {DiffOptions} from './index.mjs';
export function toPatch(before: string, after: string, options?: DiffOptions & {beforeName?: string; afterName?: string; context?: number}): string;
