// SPDX-License-Identifier: MIT
import type {Observation} from './index.mjs';
/** A code reader over an acorn module you supply, for js, mjs, cjs and inline HTML scripts. */
export function js(acorn: {parse(input: string, options: object): unknown}): (content: string, info?: {language?: string}) => Observation | null | undefined;
