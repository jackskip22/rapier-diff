// SPDX-License-Identifier: MIT
import {matcher} from './matching.mjs';
import {SPACELESS} from './tokens.mjs';

function parts(before, after, split, limit, lines) {
  if (before === after) return before ? [{value: before}] : [];
  const budget = {left: Number.isFinite(limit) ? Math.max(0, limit) : 1e7};
  const match = matcher((n = 1) => (budget.left -= n) >= 0, budget), out = [];
  const push = (value, kind) => {
    if (!value) return;
    const last = out.at(-1);
    if (last && (kind ? last[kind] : !last.added && !last.removed)) last.value += value;
    else out.push(kind ? {value, [kind]: true} : {value});
  };
  const walk = (a, b, change) => {
    const found = match(a, b);
    let j = 0, removed = '', added = '';
    for (let i = 0; i <= a.length; i++) {
      const to = i === a.length ? b.length : found[i];
      if (to === undefined) { removed += a[i]; continue; }
      while (j < to) added += b[j++];
      if (removed || added) change(removed, added);
      removed = added = '';
      if (i < a.length) { push(a[i], ''); j++; }
    }
  };
  const mark = (removed, added) => { push(removed, 'removed'); push(added, 'added'); };
  if (lines) walk(lineSplit(before), lineSplit(after), (removed, added) => removed && added ? walk(split(removed), split(added), mark) : mark(removed, added));
  else walk(split(before), split(after), mark);
  return out;
}

const lineSplit = text => text.match(/[^\n]*\n|[^\n]+$/g) || [];
const WORD = /\p{N}+(?:[.,:/-]\p{N}+)+|(?:[\p{L}\p{N}_]|\p{M})+|[^\S\r\n]+|\r?\n|(?:\p{RI}\p{RI}|\p{Extended_Pictographic}\p{EMod}?(?:\u200d\p{Extended_Pictographic}\p{EMod}?\ufe0f?)*|[^])[\p{M}\u200d]*/gu;
let segmenter;
const wordSplit = text => (text.match(WORD) || []).flatMap(token => token.length > 1 && SPACELESS.test(token)
  ? Array.from((segmenter ||= new Intl.Segmenter('und', {granularity: 'word'})).segment(token), s => s.segment) : [token]);

export function diffLines(before, after, {limit} = {}) {
  return parts(before, after, lineSplit, limit);
}

export function diffWords(before, after, {limit} = {}) {
  return parts(before, after, wordSplit, limit, true);
}
