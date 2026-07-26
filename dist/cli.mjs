import { readFile } from "node:fs/promises";
import { exit } from "node:process";
import { parseFods } from "./convert-fods-to-sfods.mjs";
import { parseJson, parseXml, parseYaml } from "./parsers.mjs";
// Reads any of the formats this project understands, picked by extension:
// a flat ODS document, or sfods as XML, JSON or YAML.
export async function readSpreadsheet(path) {
  if (path.endsWith(".fods")) {
    return parseFods(path);
  }
  // Resolve the format before touching the file, so an unsupported extension
  // reports that rather than an unrelated read error.
  const parse = path.endsWith(".json")
    ? parseJson
    : path.endsWith(".yaml") || path.endsWith(".yml")
      ? parseYaml
      : path.endsWith(".xml")
        ? parseXml
        : undefined;
  if (parse === undefined) {
    throw new Error(
      `cannot tell the format from the extension; expected .fods, .sfods.xml, .sfods.json or .sfods.yaml`,
    );
  }
  return parse((await readFile(path)).toString());
}
// Shared entry point for the to-* executables: takes the input path from argv,
// converts it, and writes the result to stdout.
export async function runCli(print) {
  const filename = process.argv[2];
  if (!filename) {
    console.error("Expected path to file as argument");
    exit(1);
  }
  try {
    console.log(print(await readSpreadsheet(filename)));
  } catch (error) {
    console.error(`${filename}: ${error.message}`);
    exit(1);
  }
}
