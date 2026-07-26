# sfods-converter

Convert a "normal" flat ODS spreadsheet (`.fods`) into the simplified **sfods**
representation as JSON, XML, or YAML — and back again.

See [the sfods project](https://github.com/fwilhe2/sfods) for a general
introduction to the format.

## Requirements

- Node.js 20 or newer

## Install

```sh
npm install
npm run build
```

`npm run build` compiles the TypeScript sources into `dist/`, where the CLI
executables live.

## Usage

Each command reads a spreadsheet and writes one representation of it to
standard output:

| Command   | Output format              |
| --------- | -------------------------- |
| `to-json` | sfods JSON                 |
| `to-xml`  | sfods XML                  |
| `to-yaml` | sfods YAML                 |
| `to-html` | HTML preview of the tables |
| `to-fods` | flat ODS (`.fods`)         |

Each takes a single argument: the path to the input file. The input format is
picked from the extension — `.fods` for a flat ODS document, and `.xml`,
`.json` or `.yaml` for sfods — so any format converts to any other.

```sh
# Run the built executables directly
node dist/to-json.mjs test_data/asset-tracker.fods
node dist/to-xml.mjs  test_data/asset-tracker.fods
node dist/to-yaml.mjs test_data/asset-tracker.fods

# Redirect the output to a file
node dist/to-json.mjs test_data/asset-tracker.fods > asset-tracker.sfods.json

# Back to a spreadsheet you can open in LibreOffice
node dist/to-fods.mjs asset-tracker.sfods.json > asset-tracker.fods

# And between sfods encodings
node dist/to-yaml.mjs asset-tracker.sfods.json > asset-tracker.sfods.yaml
```

After `npm link` (or a global install) the commands are available on your
`PATH` by name:

```sh
to-json path/to/spreadsheet.fods
```

### Example

```sh
$ node dist/to-yaml.mjs test_data/asset-tracker.fods
tables:
  - name: Overview
    rows:
      - cells:
          - R: 1
            C: 1
          ...
```

## Library use

The package also exports the parsers, printers and converters:

```ts
import { readSpreadsheet, xmlPrinter } from "sfods-converter";

const spreadsheet = await readSpreadsheet("budget.fods");
console.log(xmlPrinter(spreadsheet));
```

## Development

The dev scripts run the TypeScript sources directly via [tsx](https://tsx.is/),
so no build step is needed for them:

| Script                 | Description                                |
| ---------------------- | ------------------------------------------ |
| `npm run build`        | Compile `.mts` sources to `dist/`          |
| `npm test`             | Run the unit and round-trip tests          |
| `npm run lint`         | Lint with ESLint (type-checked rules)      |
| `npm run format`       | Format all files with Prettier             |
| `npm run format-check` | Check formatting without writing           |
| `npm run all`          | Build, format, lint, and test (used in CI) |

The `.sfods.*` files under `test_data/` are generated from the `.fods` files
next to them. Regenerate them after changing a printer:

```sh
for n in accountsSpreadsheet performance asset-tracker repeated-cells; do
  for f in json xml yaml html; do
    node "dist/to-$f.mjs" "test_data/$n.fods" > "test_data/$n.sfods.$f"
  done
done
npm run format
```

## License

MIT
