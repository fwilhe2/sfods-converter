import { XMLParser } from "fast-xml-parser";
import { parse as yamlParse } from "yaml";
export function parseXml(input) {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    isArray: (name, jpath, isLeafNode, isAttribute) => {
      if (
        [
          "spreadsheet.tables",
          "spreadsheet.tables.rows",
          "spreadsheet.tables.rows.cells",
          "spreadsheet.tables.namedExpressions.namedRanges",
        ].indexOf(jpath) !== -1
      )
        return true;
      return false;
    },
    transformTagName: (name) => {
      if (name === "table") {
        return "tables";
      }
      if (name === "row") {
        return "rows";
      }
      if (name === "cell") {
        return "cells";
      }
      if (name === "named-range") {
        return "namedRanges";
      }
      if (name === "named-expressions") {
        return "namedExpressions";
      }
      return name;
    },
  };
  const parser = new XMLParser(options);
  const parsed = parser.parse(input);
  return parsed.spreadsheet;
}
export function parseJson(input) {
  return JSON.parse(input);
}
export function parseYaml(input) {
  return yamlParse(input);
}
