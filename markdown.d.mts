// SPDX-License-Identifier: MIT
import type {StructureReader, Observation} from './index.mjs';
/** A structure reader over a markdown-it instance you configure; `code` reads fenced code by its language. */
export function markdown(parser: {parse(source: string, env: object): unknown[]}, options?: {code?: (content: string, info: {language: string}) => Observation | null | undefined}): StructureReader;
