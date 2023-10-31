#!/usr/bin/env node

import { exit } from "process";
import { parseFods } from "./convert-fods-to-sfods.mjs";
import { Spreadsheet } from "./model.mjs";
import { yamlPrinter } from "./printers.mjs";

const filename = process.argv[2];

if (!filename) {
  console.error("Expected path to file as argument");
  exit(1);
}

const model: Spreadsheet = await parseFods(filename);
console.log(yamlPrinter(model));
