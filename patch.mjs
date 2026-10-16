// SPDX-License-Identifier: MIT
import {diff} from './index.mjs';

export function toPatch(before, after, options = {}) {
  const {edits} = diff(before, after, {...options, _unit: 'line'});
  if (!edits.length) return '';
  const rows = [];
  let oldLine = 1, newLine = 1, at = 0;
  const add = (text, kind) => {
    for (const line of text.match(/[^\n]*\n|[^\n]+$/g) || []) {
      rows.push({kind, line, oldLine, newLine});
      if (kind !== '+') oldLine++;
      if (kind !== '-') newLine++;
    }
  };
  let pending = '', oldText = '', newText = '', changing = false;
  const flush = () => {add(oldText, '-'); add(newText, '+'); oldText = newText = ''; changing = false;};
  const equal = (text, final = false) => {
    if (changing) {
      if ((!oldText || oldText.endsWith('\n')) && (!newText || newText.endsWith('\n'))) flush();
      else {
        const end = text.indexOf('\n') + 1;
        if (!end) {oldText += text; newText += text; if (final) flush(); return;}
        oldText += text.slice(0, end); newText += text.slice(0, end); text = text.slice(end); flush();
      }
    }
    const end = final ? text.length : text.lastIndexOf('\n') + 1;
    add(text.slice(0, end), ' '); pending = text.slice(end);
  };
  for (const edit of edits) {
    equal(before.slice(at, edit.before[0]));
    if (!changing) {oldText = newText = pending; pending = ''; changing = true;}
    oldText += before.slice(...edit.before); newText += after.slice(...edit.after);
    at = edit.before[1];
  }
  equal(before.slice(at), true);
  const context = Number.isFinite(options.context) ? Math.max(0, Math.floor(options.context)) : 3, spans = [];
  for (let index = 0; index < rows.length; index++) if (rows[index].kind !== ' ') {
    const start = Math.max(0, index - context), end = Math.min(rows.length, index + context + 1), last = spans.at(-1);
    if (last && start <= last[1]) last[1] = end;
    else spans.push([start, end]);
  }
  const path = value => /["\\\t\r\n]/.test(value) ? JSON.stringify(value) : value;
  const out = ['--- ' + path(String(options.beforeName || 'a/text')), '+++ ' + path(String(options.afterName || 'b/text'))];
  for (const [start, end] of spans) {
    let oldCount = 0, newCount = 0;
    for (let index = start; index < end; index++) {
      if (rows[index].kind !== '+') oldCount++;
      if (rows[index].kind !== '-') newCount++;
    }
    out.push('@@ -' + (rows[start].oldLine - Number(!oldCount)) + ',' + oldCount +
      ' +' + (rows[start].newLine - Number(!newCount)) + ',' + newCount + ' @@');
    for (let index = start; index < end; index++) {
      const {kind, line} = rows[index], terminated = line.endsWith('\n');
      out.push(kind + (terminated ? line.slice(0, -1) : line));
      if (!terminated) out.push('\\ No newline at end of file');
    }
  }
  return out.join('\n') + '\n';
}
