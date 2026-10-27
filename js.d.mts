// SPDX-License-Identifier: MIT
import type {Observation} from './index.mjs';
export function js(acorn: {parse(input: string, options: object): unknown}): (content: string, info?: {language?: string}) => Observation | null | undefined;
