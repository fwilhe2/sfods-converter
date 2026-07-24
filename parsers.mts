import { XMLParser, MatcherView } from "fast-xml-parser";
import { Spreadsheet } from "./model.mjs";
import { parse as yamlParse } from "yaml";

export function parseXml(input: string): Spreadsheet {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    // The SFODS XML uses kebab-case attributes (base-cell-address), but the
    // model is camelCase (baseCellAddress); map them so named ranges parse.
    transformAttributeName: (name: string) =>
      name.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase()),
    // Keep jPath as a string (fast-xml-parser >=5.10 can otherwise pass a
    // MatcherView here); the array detection below matches on jPath strings.
    jPath: true,
    isArray: (
      name: string,
      jpath: string | MatcherView,
      isLeafNode: boolean,
      isAttribute: boolean,
    ) => {
      if (typeof jpath !== "string") return false;

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
  return yamlParse(input);
}
