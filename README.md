# rapier-diff

Version 2.1.1.

Show people what changed in prose or code, then restore one concern without losing the rest. The core exports
`diff` and `merge`: plain JSON, no dependencies or top-level state. `rapier-diff/lines` shows line and word
differences on its own. Optional modules add parser adapters, HTML, unified patches, selective restore and compact
summaries.

```js
import {diff, merge} from 'rapier-diff';

const before = 'We will chek the email.';
const after = 'We will check the email address.';
const {edits, changes} = diff(before, after);
// edits: [{before: [8, 12], after: [8, 13]},
//         {before: [22, 22], after: [23, 31]}]
// The two concerns own [0] and [1]: a replaced word and an added word.
```

`edits` hold the exact source ranges. `changes` group those edits into concerns a person can read and restore.
A renderer can show a surrounding sentence or section without making that context part of an edit.

## Exact edits and readable changes

`diff(before, after, options)` returns `{edits, changes}`, plus `fallback` when it could not use a `structure` or
`from` the caller supplied (see the options). Identical strings return two empty arrays.
All offsets are half-open UTF-16 indices, as used by JavaScript `slice`; they are not byte offsets.

Each edit is `{before: [start, end], after: [start, end]}`, with `coarse: true` when the work limit stopped refinement.
An insert has an empty `before`; a delete has an empty `after`. Edits are ordered and disjoint on both sides. Every
unchanged gap, including the prefix and suffix, is equal in both strings. Interleave those gaps with either side's
edit slices to rebuild that original string exactly. CRLF, combined characters and unpaired surrogates are preserved.
A coarse edit remains exact; its range can include unchanged text and need not be a minimal edit.

Every edit index belongs to exactly one change. Changes are ordered by their first owned edit and contain:

| Field | Meaning |
| --- | --- |
| `id` | A positive integer, deterministic for the same source, options, evidence, parser configuration and Unicode rules. Keep it with that comparison. |
| `kind` | `insert`, `delete`, `replace`, `move`, `rename` or `format`. |
| `unit` | `char`, `word`, `line`, `block`, or a parser's part kind, such as `section`, `task`, `cell` or `declaration`. |
| `edits` | Indices into the exact edit array. A rename owns its distant occurrences. A move owns equal transported fragments; edits to its wording belong to separate changes. |
| `move` | On a wording change inside a moved part, the id of that move. Keep or drop them together to act on the whole move. |
| `name` | Optional part name supplied by structure, such as `## Tasks` or `save`. |
| `context` | Optional `{before: [start, end], after: [start, end]}` for display. Context can overlap and never supplies source for reconstruction or restore. |
| `breaks` | Optional `[{at: [start, end], to: name}]` identifying formerly known targets absent from the new reference graph. |
| `affects` | Optional ranges in `after` whose referenced part changed while the range itself stayed unchanged. |

Prose and code read like an editor's markup. A changed word, identifier or number is one replacement: `count` to
`amount` replaces the identifier, `total` to `subtotal` replaces the word, `30` to `300` replaces the number. Pass
`unit: 'char'` to mark the characters inside a changed word instead. Whole-word replacements separated only by spaces
form one phrase edit, and a time, date, version or decimal stays one number. Paired markers such as `**`, `~~` or a link's `[` and `](url)` added or removed around unchanged
text on one line form one concern. A line that shares under a quarter of its words with every changed line beside
it is replaced whole, and table rows with equal cell counts change cell by cell. Thai, Lao, Khmer, Myanmar, kana
and Han text, written without spaces, is split into words by `Intl.Segmenter`. A separator-only insertion or
deletion joins the edit beside it. Each emitted concern is separately selectable; these are reading rules, not
semantic claims. Read the changed text with
`before.slice(...edits[index].before)` and `after.slice(...edits[index].after)`.

| Option | Default | Meaning |
| --- | --- | --- |
| `as` | `'auto'` | `'prose'`, `'code'`, or automatic detection. Prose uses word and phrase presentation; code uses lines and changed words. |
| `unit` | `'token'` | `'char'` marks the characters inside a changed word, identifier or number. |
| `structure` | none | `text => {parts, links, meaning?}`. Named nested parts and reference links supply structural alignment, rename groups and consequences. When the reader throws or returns an observation it cannot use, the comparison preserves `as: 'prose'` when requested, otherwise continues as code text, and the result carries `fallback: {structure: 'threw', error}`, `{structure: 'invalid'}` or `{structure: 'limit'}`. |
| `limit` | `1e7` | Counted search, refinement and structural-validation steps. Finite negative values become zero; nonfinite values use the default. Raise it for very large or heavily changed inputs. |
| `from` | none | Sequential recorded operations, oldest first: `[{pos, removed, inserted}]`. Verified evidence preserves the occurrence the host observed. Evidence that does not replay is reported as `fallback: {from: 'invalid'}` (or `'limit'`), and the snapshots are compared instead. |

The work limit bounds search, refinement and structural validation. Common source-edge scans charge each chunk
of at most 256 UTF-16 units; safe-boundary retreat and readable-context expansion also spend work. Native
string/Unicode operations, allocation and caller parser work still depend on input size; it is not a wall-clock deadline or an out-of-memory guarantee. Use a worker to protect
page responsiveness. Completed move and rename groups survive later budget exhaustion; additional grouping or reference
annotations may remain incomplete.

Size alone never makes a comparison give up. Lines or words that occur once on each side anchor the search. Where
every line or word repeats, equal-length ranges first try positional alignment. Other ranges try a shortest edit
script limited to work proportional to the range, unique runs of 4, 16 or 64 tokens, and alignment on the start and
end diagonals. With 20,000 equal lines and every seventh changed, starting at line 1, the result has 2,858 exact edits. Only a range that none of these can finish within the remaining `limit` is one `coarse` edit, and
only that range: raise `limit` to refine it. A structure reader's observation is limited to nesting depth 128 and
131,072 parts or links; a larger observation is reported as `fallback: {structure: 'invalid'}`.

### Recorded operations

`pos` is measured in the string immediately before that operation. Every `removed` substring must match; replay must
finish at `after`. The engine condenses cancellations and overwrites into surviving source pieces, then refines only
the touched spans. It does not search the untouched document for another equal occurrence.

```js
const before = 'Same paragraph.\n\nSame paragraph.\n';
const pos = before.lastIndexOf('.');
const from = [{pos, removed: '', inserted: ' revised'}];
const after = before.slice(0, pos) + ' revised' + before.slice(pos);
const result = diff(before, after, {from});
```

A zero search budget still retains valid evidence, with touched edits marked coarse when necessary. Evidence
verification has a separate fixed step bound. If that bound is exhausted, the result is a coarse exact comparison
with `fallback: {from: 'limit'}`; malformed evidence gives a snapshot comparison with `fallback: {from: 'invalid'}`. Offsets that cross a combined character expand to safe
boundaries. Keep the source strings and the original operation order; an undo is another operation in that sequence.

## Restore chosen concerns

```js
import {restore, restoreEdits} from 'rapier-diff/restore';

const result = diff(before, after, options);
const restored = restore(before, after, result, [2]);
// Change 2 is put back. Other concerns keep their after values.
```

An empty selection returns `after`; selecting every id returns `before`. A grouped rename restores every owned
occurrence. For a recognized move with inner edits, restoring position keeps the new wording at the old position;
restoring wording keeps the section at its new position. Selecting both restores both. Display context is ignored,
even if omitted or widened.

Move recognition is heuristic and uses equal transported fragments to bind both ends of the source extent. Repeated
text may remain ordinary edits; if several insertions match one deletion, source order can choose the first eligible
match. Wording changes without equal boundary anchors remain ordinary exact edits. Every emitted move retains the
exact source fragments needed for independent position and wording restoration.

`restoreEdits(before, after, result, ids)` returns the same restoration as sequential `{pos, removed, inserted}`
operations. Each `pos` is measured after all earlier returned operations. Hosts can commit these directly without
a second diff that might select a different repeated occurrence.

Both functions share range, unchanged-gap, ownership, id and move validation, throwing `TypeError` for malformed
input. They then build only the requested output. `restore` produces text; `restoreEdits` tracks UTF-16 lengths for
its positions without constructing a complete restored document.

A result does not authenticate its source: retain the exact original `before` and `after`, bind them to the current
document/revision, and refuse stale restoration before committing operations.

## Structure: documents and code

The adapters use a parser you supply. The core has no parser dependency.

```js
import MarkdownIt from 'markdown-it';
import * as acorn from 'acorn';
import {markdown} from 'rapier-diff/markdown';
import {js} from 'rapier-diff/js';

const structure = markdown(new MarkdownIt(), {code: js(acorn)});
const result = diff(before, after, {structure});
```

Configure Markdown plugins before creating the adapter. Ordinary list tokens and checkbox source supply tasks;
footnotes require a parser plugin. Markdown provides sections, paragraphs, lists, items, tasks, tables, rows, cells,
quotes, footnotes, links and images when the configured parser emits them. Its reference graph joins heading links,
footnotes and reference-style links to their definitions. The optional `code(content, {language})` reader receives the fence language explicitly.
Return no observation or throw for an unsupported language; that fence remains an ordinary block.
The built-in JavaScript reader accepts `js`, `javascript`, `mjs`, `cjs`, `ecmascript`, `html`, `htm` and `xhtml`
labels (case insensitive). It leaves other labels and unlabelled fences opaque. A host can deliberately select
another reader or explicitly invoke a reader without that metadata.

The Markdown adapter maps parser-normalized text back to the original UTF-16 source. Table rows record only the
positions where escaped-pipe normalization removes a backslash, so wide cells do not require a per-character
offset array. CRLF, combining characters and unpaired surrogates retain their original source coordinates.
Nested part ranges, definition names, links and link labels use the same checked carrier mapping. Quoted/listed
fences map the actual content suffix on each line; synthetic indentation without an exact source span remains opaque.
A malformed nested observation is discarded as a unit.

The JavaScript adapter describes declarations, scopes, calls, imports, exports and inline JavaScript scripts in HTML.
It connects identifier uses to known bindings. Import/export targets can use `module#export`; the adapter does not
fetch another file or resolve an entire project. Parts match by name where correspondence is unambiguous; stable
binding keys connect renamed declarations to their uses. In a getter and setter pair, the second accessor is its own part
named with `get:` or `set:`, and its key refers to the first, so the pair renames as one.

A custom structure supplies source-ordered parts:
`{start, end, kind, name?, key?, nameAt?, children?}` and links:
`{at: [start, end], to, key?, labelAt?}`. Spans use integer UTF-16 coordinates in the original source and must
respect grapheme and CRLF boundaries. Sibling parts must be ordered and nonoverlapping; child spans and `nameAt`
must stay inside their parent. Use strings for kinds, names and link targets. A binding key may be a string,
finite number or boolean, including `0` and `false`; omitted or null keys are unkeyed. Object identity is not a binding key.

`nameAt` identifies the definition's spelling; `key` connects a binding across a rename. Without those fields,
some renames cannot be identified. `breaks` and `affects` describe the supplied reference graph. Names and keys
can contain ordinal labels, so keep them with their comparison rather than treating them as persistent occurrence
identity.

The engine captures and validates the fields it needs immediately after each reader call. A reader may reuse its
result object, nested arrays and span pairs: a later call cannot overwrite an earlier captured observation.
These observations belong to one operation. Structure supplies alignment and reference evidence; the original
strings remain the source for edits and restoration. Malformed evidence cannot authorize semantic classification
or transport; with an unusable reader `diff` compares text and reports `fallback`, while partially available or
inconsistent merge evidence retains complete original alternatives.

### Formatting requires evidence

`format` is a parser-relative classification: the adapter supplied equal `meaning` fingerprints for both complete
inputs. It preserves the observations represented by that fingerprint. Plain text and code without equal fingerprints
stay substantive, including Python indentation that moves a statement into another block. A link destination change
remains visible even when its label stays the same.

The Markdown fingerprint retains token structure, destinations, hard breaks, code content and parser environment.
The JavaScript fingerprint serializes the parsed tree and comments once, excluding source positions and ordinary
`Literal.raw` spelling. Numeric and string literal values remain distinct. An overflowing numeric literal such as
`1e400` also remains distinct from `null` and `"Infinity"`.

Template-element raw text is retained, including in untagged templates. An escape change stays substantive even
when the cooked values agree; tags such as `String.raw` can observe that raw text. HTML outside parsed scripts stays
exact. Ordinary literal spelling is normalized, so source introspection remains outside this equivalence.

Treat `meaning` as an opaque equality fingerprint; its internal encoding can change between releases. A custom
fingerprint must retain the distinctions its host needs. A mixed substantive/formatting revision stays substantive.
Formatting keeps its exact edits and remains restorable; hosts decide how to present it.

## Merge concurrent edits

```js
const {text, conflicts} = merge(base, personText, agentText, {structure});
// conflicts: [{at: [start, end], theirs: 'the agent’s version'}]
```

Independent source edits combine. Edits that overlap or insert at the same point form conflict groups, with `mine`
kept for the conflicting content in `text` and the alternative in `theirs`. Each `at` is a UTF-16 range in the returned text. Apply selected
alternatives from the end backward to keep offsets valid. An insertion that only touches the other branch's change
merges beside it without a conflict. Parser structure can separate adjacent section, table-cell or function edits
within the same search budget.

For merge only, a part with an unsafe grapheme or CRLF edge is omitted with its subtree; an unsafe `nameAt` is omitted.
Each part’s fields and all descendants are validated before their evidence can be discarded. Malformed evidence rejects the
whole observation. Diff keeps strict boundary admission.

With consistent valid structure, a unique named sibling reorder can carry the other branch's internal edits to the
new position. Matching uses `kind` and `name` within the corresponding container; all three inputs must retain the
same unique sibling membership. The untouched branch's gap bytes must agree with the base, or both reordered
branches must agree on their order and gaps. Named nested reorders use the same rule. The merge uses exact original
source ranges, then combines their internal edits with the remaining shared budget. Each reader observation is
captured once; a second base observation checks consistency. One nested plan projects original range triples and
already equal slices, so nested moves do not require reconstructed aligned documents. Local conflict offsets are
translated into UTF-16 coordinates in the final output.

A part renamed on one branch keeps its reader `key` and aligns with its base part, so the other branch's edits
inside it still merge. Repeated names merge when each occurrence changed on at most one branch.

Repeated names or definition spellings changed on both branches, reorders involving repeated occurrences, competing positions,
deletion versus a changed definition, incompatible membership or gaps, partially unavailable structure, and exhausted transport work retain the complete original
`mine` and `theirs` alternatives. A changed unnamed container hiding named descendants also stays a complete choice.
Possible moves between containers remain conservative conflicts; this can include independent label changes in
different containers. The merge never uses display context or ordinal binding keys as transport authority.

Without usable structural correspondence, ordinary source-coordinate merging remains available. It cannot establish
move identity from text alone, and this API does not promise a general refactoring merge or a valid parsed program.

## Summaries for agents

```js
import {summary} from 'rapier-diff/summary';

summary(before, after, diff(before, after), {chars: 2000});
// {changes: [{id: 1, kind: 'replace', line: 3, removed: 'Monday', inserted: 'Tuesday'},
//            {id: 2, kind: 'delete', line: 9, removed: 'Old pricing.\n'}], omitted: 0}
```

One row per concern, in concern order: `kind`, the 1-based `line` in `after`, and the exact `removed` and `inserted`
reading text. A move gives its old line as `from` and its `text`. Text over 160 characters is clipped around a
`…(length)…` marker, never inside a grapheme or a CRLF. Rows stop at the `chars` budget of serialized JSON; `omitted`
counts the rest. Deleted text stays visible, so a reader that cannot see the page knows what was removed.

## HTML and unified patches

```js
import {toHTML} from 'rapier-diff/html';
import {toPatch} from 'rapier-diff/patch';

element.innerHTML = toHTML(before, after, diff(before, after));
const patch = toPatch(before, after, {
  beforeName: 'a/example.txt', afterName: 'b/example.txt', context: 3
});
```

HTML uses exact edits for `<del>` and `<ins>`, with classes for concern kind/unit and `data-change` for its id.
It escapes text and attribute metadata and adds no styles. Context cannot widen a source mark. A rename's distant
marks share one id; transported fragments retain the move id and inner wording uses its own id.

The patch helper writes unified diffs, including missing-final-newline markers. It accepts the comparison options
and expands exact edits to source lines for the patch format. It does not apply patches.

## Show differences: lines and words

```js
import {diffLines, diffWords} from 'rapier-diff/lines';

diffWords('let count = 1;', 'let amount = 1;');
// [{value: 'let '}, {value: 'count', removed: true}, {value: 'amount', added: true}, {value: ' = 1;'}]
```

This entry has no concerns, moves, structure or merge: it imports only the shared search. Each part is
`{value, added?, removed?}`, in order; the values without `added` join to `before`, and those without `removed` join
to `after`. `diffLines` splits after each `\n` (a CRLF stays in its line). `diffWords` keeps whole words, numbers with
their separators, space runs, emoji sequences and flags together, and marks stay with what they mark; Thai, Lao,
Khmer, Myanmar, kana and Han runs are split into words by `Intl.Segmenter`. No word crosses a line end, so
`diffWords` matches equal lines first and splits only the lines that differ. Both take `{limit}` with the same meaning
as `diff`.

Compare the libraries on your own input. [The benchmark](BENCHMARK.md) measures exact edit regions, marked text,
word splits, and time against jsdiff 9.0.0 and diff-match-patch 1.0.5 on pinned prose and code revisions, a 1 MiB file,
and 20,000-line files. Its script and corpus manifest are in `bench/`; downloaded source stays outside this package.

The full `diff` adds concerns, moves, renames, structure, and selective restore. Import three-way merge alone with
`import {merge} from 'rapier-diff/merge'`; it shares the same diff engine.

## Runtime

The core needs ES2022 and `Intl.Segmenter`. Import it in pages, workers or Node, or inline the modules in an HTML
file. Grapheme boundaries are requested lazily; the core does not allocate a whole-input boundary table. Results are
deterministic for the same source, options, evidence, parser configuration and runtime Unicode rules.

The package checks run in Node. They do not exercise browsers, the demo page or phones.

## Implementation and cost

`index.mjs` exports `diff` and `merge`. `diff.mjs` runs one comparison through small modules that share one comparison
context:

| Module | What it does |
| --- | --- |
| `structure.mjs` | Captures and validates a structure reader's observation |
| `tokens.mjs` | Splits text into lines, words or characters at grapheme-safe boundaries |
| `matching.mjs` | Finds equal tokens: unique anchors, token runs, positions and shortest edit scripts, within the work limit |
| `walk.mjs` | Turns a range into exact edit records, line by line, then word by word, or part by part |
| `moves.mjs` | Recognizes moved text and renamed bindings |
| `concerns.mjs` | Groups records into readable changes with context, breaks and affects |
| `merge.mjs` | Three-way merge over the same comparison |

`lines.mjs` uses the shared matcher and token definitions without concerns or merge. Bundled imports are measured
with esbuild 0.25.10 (minified, tree-shaken ES2022 modules); individual modules use Terser 5.51.2 (two passes,
mangling, no comments). Both use gzip level 9. The merge entry includes its diff dependencies; module sizes are
not standalone import costs. Caller-supplied parsers, documentation, and the demo are excluded.

Run `node bench/size.mjs --check` to verify these tables, or `--write` to update them. See the benchmark for setup.
The competitor rows bundle each package's whole entry, and jsdiff's `diffWordsWithSpace` and `diffLines` alone.

<!-- sizes:start -->
| Bundled import | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| index | 28,879 | 12,407 |
| diff only | 23,417 | 10,142 |
| lines | 4,306 | 2,192 |
| merge | 28,868 | 12,403 |
| jsdiff 9.0.0 | 22,926 | 8,299 |
| jsdiff diffWordsWithSpace, diffLines | 6,986 | 2,708 |
| diff-match-patch 1.0.5 | 19,710 | 6,544 |

| Module | Source bytes | Minified bytes | Gzip bytes |
| --- | ---: | ---: | ---: |
| `concerns.mjs` | 9,205 | 5,556 | 2,480 |
| `diff.mjs` | 3,757 | 2,359 | 1,225 |
| `html.mjs` | 1,110 | 632 | 400 |
| `index.mjs` | 122 | 99 | 84 |
| `js.mjs` | 20,517 | 11,572 | 4,246 |
| `lines.mjs` | 2,124 | 1,194 | 726 |
| `markdown.mjs` | 18,510 | 9,499 | 4,093 |
| `matching.mjs` | 6,436 | 3,202 | 1,493 |
| `merge.mjs` | 11,509 | 5,764 | 2,593 |
| `moves.mjs` | 7,049 | 4,048 | 1,831 |
| `patch.mjs` | 2,830 | 1,468 | 811 |
| `restore.mjs` | 4,780 | 2,579 | 1,220 |
| `structure.mjs` | 2,560 | 1,363 | 707 |
| `summary.mjs` | 1,919 | 1,082 | 674 |
| `tokens.mjs` | 3,558 | 2,197 | 1,092 |
| `walk.mjs` | 10,827 | 5,819 | 2,715 |
<!-- sizes:end -->

`node bench/tiers.mjs --write` cuts the pinned revisions into comparisons of about 1 KB, 100 KB and 1 MiB, cut at
unchanged line starts, and fills the table below. Each cell is the mean of per-comparison medians, in milliseconds.
`rapier-diff` is `diff` with `as: 'prose'` or `'code'`; `rapier-diff/lines` is `diffWords`; jsdiff is
`diffWordsWithSpace`; diff-match-patch is `diff_main` and `diff_cleanupSemantic`. The 1 MiB inputs join successive
revisions of the same files, so most lines occur three times on each side. Every output rebuilt both texts. Rapier's
`restore` and `restoreEdits` returned both originals byte for byte, and jsdiff's `applyPatch` applied every `toPatch`
output.

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

The same run merges real revisions. Each comparison under 1 MiB with at least two changed regions, separated by whole
unchanged lines, gives alternate regions to two branches. `merge` rebuilt the revision with no conflicts in 25 of 25
cases; diff-match-patch's `patch_apply` did in 24 and jsdiff's `applyPatch` in 17. Where the other branch inserted
different text in the same regions, `merge` raised a conflict in all 24 such cases.

## Check a repository checkout

From the package repository root, `node test/check.mjs` checks every entry point on authored cases: exact
reconstruction, selective restoration, Unicode and CRLF, whole-token marks, the size cases above, conflict
alternatives, structural transport, reported fallbacks, summaries, HTML escaping and unified patches.
`node test/laws.mjs` generates seeded edits across scripts, CRLF, lists, tables and moved blocks and checks every
law on each: exact edits, restore of none, all and every subset of small generated comparisons, grapheme and word edges, whole-word parts from
`rapier-diff/lines`, and clean merges of edits in different blocks. Independent subset and move oracles check the expected document bytes, including all choices of position, phrase, decimal, and paired emphasis. Adversarial long tokens, combined characters, CRLF, repeated lines, and lone surrogates exercise low work limits. Both scripts print their counts. The test files are
kept in the repository, not the npm payload.

## Licence

MIT.
