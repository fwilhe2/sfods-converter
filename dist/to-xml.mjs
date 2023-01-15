#!/usr/bin/env node
import { exit } from "process";
import { parseFods } from "./convert-fods-to-sfods.mjs";
import { xmlPrinter } from "./printers.mjs";
const filename = process.argv[2];
if (!filename) {
  console.error("Expected path to file as argument");
  exit(1);
}
const model = await parseFods(filename);
console.log(xmlPrinter(model));
