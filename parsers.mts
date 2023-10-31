import { XMLParser } from "fast-xml-parser";
import { Spreadsheet } from "./model.mjs";
import { parse } from "yaml";

export function parseXml(input: string): Spreadsheet {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    isArray: (
      name: string,
      jpath: string,
      isLeafNode: boolean,
      isAttribute: boolean,
    ) => {
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
    transformTagName: (name: string) => {
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

export function parseJson(input: string): Spreadsheet {
  return JSON.parse(input);
}

export function parseYaml(input: string): Spreadsheet {
  return parse(input);
}
