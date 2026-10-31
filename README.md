# rapier-diff

Exact, readable changes in prose and code: moved paragraphs, renamed identifiers, three-way merge, and restoring one change while keeping the rest. No dependencies. MIT.

```sh
npm install rapier-diff
```

Compare in [Rapier](https://rapier.website) runs on it. Serve the package folder and open `demo.html` to try it.

```js
import {diff, merge} from 'rapier-diff';

const {edits, changes} = diff('We will chek the email.', 'We will check the email address.');
// edits:   [{before: [8, 12], after: [8, 13]}, {before: [22, 22], after: [23, 31]}]
// changes: two concerns, a replaced word and an added word
```

- `edits` are exact, ordered, disjoint UTF-16 ranges (`slice` offsets). Unchanged gaps plus either side's edits rebuild that string byte for byte, CRLF and surrogates included.
- `changes` group edits into concerns a person can read and undo: `{id, kind, unit, edits, move?, name?, context?, breaks?, affects?}`. `kind` is `insert`, `delete`, `replace`, `move`, `rename` or `format`.

## Options

| Option | Default | |
| --- | --- | --- |
| `as` | `'auto'` | `'prose'` (words and phrases) or `'code'` (lines, then changed words) |
| `unit` | `'token'` | `'char'` marks characters inside a changed word |
| `structure` | none | A parser adapter (below). If it throws or returns something unusable, the result says so in `fallback` and the text is compared plainly. |
| `limit` | `1e7` | Work budget. A range it cannot finish becomes one exact `coarse` edit; raise it to refine. Not a time limit: use a worker for huge inputs. |
| `from` | none | Recorded edits `[{pos, removed, inserted}]`, oldest first, so a repeated paragraph is attributed to the occurrence actually typed. Evidence that does not replay gives `fallback: {from: 'invalid'}`. |

Size never makes it give up: unique lines and words anchor the search, then positional alignment and bounded edit scripts fill the rest.

## Restore one change

```js
import {restore, restoreEdits} from 'rapier-diff/restore';

const result = diff(before, after);
restore(before, after, result, [2]);      // change 2 put back, everything else kept
restoreEdits(before, after, result, [2]); // the same, as {pos, removed, inserted} operations
```

A rename restores every occurrence. A moved section restores its position, its wording, or both. Keep the exact `before` and `after` and refuse a restore against a newer document.

## Merge

```js
import {merge} from 'rapier-diff/merge';

const {text, conflicts} = merge(base, mine, theirs, {structure});
// conflicts: [{at: [start, end], theirs: '…'}]
```

Independent edits combine; overlapping ones become conflicts with `mine` in `text` and the alternative in `theirs`. With a parser, edits in different sections, cells or functions merge, and a renamed or reordered part carries the other side's edits with it. Anything ambiguous stays a complete choice.

## Structure

```js
import MarkdownIt from 'markdown-it';
import * as acorn from 'acorn';
import {markdown} from 'rapier-diff/markdown';
import {js} from 'rapier-diff/js';

const structure = markdown(new MarkdownIt(), {code: js(acorn)});
diff(before, after, {structure});
```

You bring the parser. Markdown gives sections, lists, tasks, tables, cells, footnotes and links; JavaScript gives declarations, scopes, calls, imports and exports, so a renamed binding is one change. `format` is reported only when the parser proves both sides mean the same. A custom reader returns `{parts, links, meaning?}` in UTF-16 source coordinates.

## Output

```js
import {toHTML, toReview, reviewCSS} from 'rapier-diff/html';
import {review} from 'rapier-diff/review';
import {toPatch} from 'rapier-diff/patch';
import {summary} from 'rapier-diff/summary';

toHTML(before, after, result);        // escaped <del>/<ins> with data-change ids, no styles
toReview(before, after, result, {render}); // rendered Markdown blocks, old and new; reviewCSS styles it
review(before, after, result);        // the same review as data
toPatch(before, after, {context: 3});  // unified diff
summary(before, after, result, {chars: 2000}); // compact rows for an agent: kind, line, removed, inserted
```

## Lines and words only

```js
import {diffLines, diffWords} from 'rapier-diff/lines';

diffWords('let count = 1;', 'let amount = 1;');
// [{value: 'let '}, {value: 'count', removed: true}, {value: 'amount', added: true}, {value: ' = 1;'}]
```

The jsdiff-style parts, without concerns or merge, at about 2 KB gzip. Words never cross a line end; emoji, flags and numbers stay whole; Thai, Lao, Khmer, Myanmar, kana and Han are split with `Intl.Segmenter`.

## Size and speed

Needs ES2022 and `Intl.Segmenter`; types ship as `.d.mts`. Bundles: esbuild, minified, gzip 9. Modules: Terser, gzip 9.

<!-- sizes:start -->
| Bundled import | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| index | 28,905 | 12,419 |
| diff only | 23,443 | 10,154 |
| lines | 4,306 | 2,192 |
| merge | 28,894 | 12,415 |
| jsdiff 9.0.0 | 22,926 | 8,299 |
| jsdiff diffWordsWithSpace, diffLines | 6,986 | 2,708 |
| diff-match-patch 1.0.5 | 19,710 | 6,544 |

| Module | Source bytes | Minified bytes | Gzip bytes |
| --- | ---: | ---: | ---: |
| `concerns.mjs` | 9,235 | 5,582 | 2,491 |
| `diff.mjs` | 3,757 | 2,359 | 1,225 |
| `html.mjs` | 6,268 | 4,366 | 1,895 |
| `index.mjs` | 122 | 99 | 84 |
| `js.mjs` | 20,517 | 11,572 | 4,246 |
| `lines.mjs` | 2,124 | 1,194 | 726 |
| `markdown.mjs` | 18,510 | 9,499 | 4,093 |
| `matching.mjs` | 6,436 | 3,202 | 1,493 |
| `merge.mjs` | 11,509 | 5,764 | 2,593 |
| `moves.mjs` | 7,049 | 4,048 | 1,831 |
| `patch.mjs` | 2,830 | 1,468 | 811 |
| `restore.mjs` | 4,780 | 2,579 | 1,220 |
| `review.mjs` | 12,562 | 6,854 | 2,852 |
| `structure.mjs` | 2,560 | 1,363 | 707 |
| `summary.mjs` | 2,035 | 1,157 | 709 |
| `tokens.mjs` | 3,558 | 2,197 | 1,092 |
| `walk.mjs` | 10,827 | 5,819 | 2,715 |
<!-- sizes:end -->

Mean of per-comparison medians in milliseconds on pinned prose and code revisions. The 1 MiB inputs repeat most lines three times. Every output rebuilt both texts.

<!-- speed:start -->
| Input | Comparisons | rapier-diff | rapier-diff/lines | jsdiff 9.0.0 | diff-match-patch 1.0.5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 KB documents | 39 | 0.126 | 0.046 | 0.178 | 0.031 |
| 1 KB code | 33 | 0.070 | 0.033 | 0.272 | 0.211 |
| 100 KB documents | 8 | 2.64 | 4.40 | 9.89 | 0.56 |
| 100 KB code | 8 | 2.55 | 2.44 | 9.29 | 1.70 |
| 1 MiB documents | 1 | 44.02 | 90.71 | 146.30 | 21.22 |
| 1 MiB code | 1 | 56.78 | 31.51 | 156.59 | 41.64 |
<!-- speed:end -->

On the same revisions, `merge` rebuilt 25 of 25 two-branch merges without conflicts (diff-match-patch 24, jsdiff 17) and raised a conflict in all 24 cases where both branches inserted different text.

## License

MIT
