# Conformance gaps against SFODS 1.0

Where this converter deviates from [SPEC.md](https://github.com/fwilhe2/sfods/blob/main/SPEC.md).
Each item was reproduced against the current code; the section numbers point at
the rule being broken.

## A. Data loss and corruption

**A1 — A merged region shifts every cell to its right. (§10.2 G3, §11)**
`convert-fods-to-sfods.mts` reads only `table:table-cell` and never
`table:covered-table-cell`, so `merged | covered | X` yields two cells and `X`
is re-stamped `C: 2` when it occupies column 3. The generated `R`/`C` agree with
the corruption, which removes the only clue. Read covered cells too, honour their
`table:number-columns-repeated`, and emit an empty cell for each.

**A2 — A line break in a cell produces an unreadable file. (§6.3, §11)**
A cell with two `<text:p>` children gives `text: ["line1","line2"]`; a cell with
a hyperlink gives `text: {"text:a": {...}}`. `to-json` writes the array or object
out, and reparsing it throws `expected a scalar`. Join paragraphs with `\n`,
flatten inline markup to its text content, and split on `\n` when writing back
(`textElement`, `convert-sfods-to-fods.mts:140`).

**A3 — An untyped value is silently dropped. (§6.2)**
`{"value":"97"}` converts to `<table:table-cell />`. `type` is now required
alongside `value`; reject the cell in `normalizeCell` instead.

**A4 — A `string` cell's `value` is silently dropped. (§6.3)**
`{"type":"string","value":"x"}` converts to a cell with a value type and no
content. Reject it in `normalizeCell`.

**A5 — An unrepresentable ODF type produces a file this tool cannot read.
(§6.2)** `parseFods` copies `office:value-type` verbatim, so `void` becomes
`type: "void"`, which `parseJson` then rejects — fods → json → read-back fails.
Map anything outside the vocabulary onto an untyped cell, keeping `text`.

**A6 — `office:string-value` is ignored.** A string cell written with the
attribute rather than a `<text:p>` loses its content entirely. Use it as a
fallback for `text`.

**A7 — A repeat run longer than 4096 is silently truncated.**
`MAX_REPEAT` (`convert-fods-to-sfods.mts:62`) is the right defence against a
hostile count, but it currently also truncates a legitimate run of identical
_content_ cells. Cap only empty runs; error on a content run that exceeds it.

**A8 — Extra `table:named-expressions` elements are dropped.**
`namedExpressions[0]` (`convert-fods-to-sfods.mts:231, 241`) keeps the first and
discards the rest. Merge them.

## B. Rules the spec introduces

**B1 — `R` and `C` are authoritative. (§5.2)**
This is the substantive change. Readers must resolve positions rather than place
cells by list index:

- a row's number is the `R` its cells agree on, else one more than the previous
  row element;
- a cell's column is its `C`, else one more than the previous cell;
- both must strictly increase, and a document where two cells resolve to the
  same position is rejected.

`produceFods` must then pad the gaps a sparse document leaves — empty cells and
empty rows, or `table:number-columns-repeated` / `table:number-rows-repeated`.
Nothing that exists today becomes invalid: generated `R`/`C` already agree with
list position.

**B2 — `version`. (§3.2)** Parse and emit it; reject an unknown major version;
keep ignoring unknown members within a major.

**B3 — Table names are constrained. (§4)** Non-empty, unique within the
document, free of `[ ] * ? : / \`, no leading or trailing apostrophe. Drop the
`"unnamed"` fallback (`convert-sfods-to-fods.mts:79`): it silently renames a
sheet and invalidates every named range pointing at it.

**B4 — Named-range fields are required. (§8.1)** `normalizeNamedRange`
(`parsers.mts:161`) defaults all three to `""`, which produces a
`<table:named-range name="">` that a spreadsheet application will not accept.
Reject instead.

**B5 — A formula cell with no cached value. (§6.6, §10.2)**
`carriesValue` (`convert-sfods-to-fods.mts:204`) includes
`cell.formula !== undefined`, so a formula cell with no value emits
`office:value-type="float"` with no `office:value` — exactly the shape the
comment three lines above says is invalid ODF. Drop the `formula` term; a
`string` cell still carries its type through `text:p`.

**B6 — Value grammars are checked. (§6.4)**
Dates may carry a time, times may be negative or exceed 24 hours or carry a
fractional second, numbers may use an exponent. The ISO-duration passthrough in
`timeToDuration` (`convert-sfods-to-fods.mts:126`) is no longer a valid sfods
value; keep it as a documented input tolerance or reject it.

**B7 — `R`/`C` must be integers.** `optionalNumber` (`parsers.mts:107`) turns
`R: "abc"` into `undefined`, silently moving the cell. Reject a non-integer or
non-positive value.

## C. Canonical form and tooling

**C1 — Empty `namedExpressions` is emitted. (§9.4)**
`normalizeTable` and `normalizeSpreadsheet` always construct
`{namedRanges: []}`, so every JSON and YAML file carries
`"namedExpressions": {"namedRanges": []}` on every table. Canonical form omits
absent fields. The XML printer already omits it.

**C2 — Validate the fixtures in CI.** Add a script that checks every
`test_data/*.sfods.{json,yaml}` against `sfods-1.0.schema.json` and every
`*.sfods.xml` against `sfods-1.0.xsd`, and wire it into `npm run all`. All eight
JSON/YAML fixtures and all four XML fixtures pass both schemas as they stand
today.

**C3 — Round-trip tests compare a signature, not a document.**
`cellSig` (`roundtrip.test.mts:24`) ignores everything A1–A7 breaks. Extend it,
or compare normalised documents per §10.1, so the guarantees in §10.2 are
actually under test.
