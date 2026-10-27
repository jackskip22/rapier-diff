// SPDX-License-Identifier: MIT
import type {StructureReader, Observation} from './index.mjs';
export function markdown(parser: {parse(source: string, env: object): unknown[]}, options?: {code?: (content: string, info: {language: string}) => Observation | null | undefined}): StructureReader;
