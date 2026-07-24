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

The package provides three commands, each of which reads a flat ODS file
(`.fods`) and writes the sfods representation to standard output:

| Command   | Output format |
| --------- | ------------- |
| `to-json` | JSON          |
| `to-xml`  | sfods XML     |
| `to-yaml` | YAML          |

Each takes a single argument: the path to the `.fods` file.

```sh
# Run the built executables directly
node dist/to-json.mjs test_data/asset-tracker.fods
node dist/to-xml.mjs  test_data/asset-tracker.fods
node dist/to-yaml.mjs test_data/asset-tracker.fods

# Redirect the output to a file
node dist/to-json.mjs test_data/asset-tracker.fods > asset-tracker.sfods.json
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

## License

MIT
