import { XMLParser } from "fast-xml-parser";
import { readFile } from "fs/promises";
import { ensureIsArray } from "./utils.mjs";
// An upper bound on how far a single repeat run is expanded. Real content never
// approaches this; the cap only exists so a malformed or hostile repeat count
// cannot be turned into an unbounded allocation.
const MAX_REPEAT = 4096;
function repeatCount(raw) {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, MAX_REPEAT);
}
function isEmptyCell(cell) {
  return (
    cell["@_office:value"] === undefined &&
    cell["@_office:date-value"] === undefined &&
    cell["@_office:time-value"] === undefined &&
    cell["@_office:boolean-value"] === undefined &&
    cell["@_office:value-type"] === undefined &&
    cell["@_table:formula"] === undefined &&
    cell["text:p"] === undefined
  );
}
function isEmptyRow(row) {
  return ensureIsArray(row["table:table-cell"]).every(isEmptyCell);
}
// ODS collapses runs of identical adjacent cells (or rows) into a single
// element carrying a repeat count. Expanding them is not optional: a repeat run
// that appears *before* populated content shifts every following cell one or
// more columns to the left if ignored.
//
// The one run that must not be expanded is the trailing padding LibreOffice
// writes to fill the sheet out to its bounds (commonly 1024 columns and ~1M
// rows of a single empty cell). It carries no data, so any empty run after the
// last element that does carry data collapses to the single element it came
// from.
function expandRepeats(items, countOf, isEmpty) {
  let lastWithContent = -1;
  items.forEach((item, index) => {
    if (!isEmpty(item)) {
      lastWithContent = index;
    }
  });
  const expanded = [];
  items.forEach((item, index) => {
    const count = index > lastWithContent ? 1 : countOf(item);
    for (let n = 0; n < count; n++) {
      expanded.push(item);
    }
  });
  return expanded;
}
// office:time-value is an ISO 8601 duration (PT01H02M03S). The sfods format
// carries times as hh:mm:ss, so normalize here rather than leaking the
// duration syntax into the simplified format.
export function durationToTime(duration) {
  const match =
    /^(-)?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      duration,
    );
  if (!match) {
    return undefined;
  }
  const [, sign, days, hours, minutes, seconds] = match;
  const totalHours = (Number(days ?? 0) || 0) * 24 + (Number(hours ?? 0) || 0);
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  const secondsValue = Number(seconds ?? 0) || 0;
  const fraction = secondsValue % 1;
  return `${sign ?? ""}${pad(totalHours)}:${pad(Number(minutes ?? 0) || 0)}:${pad(secondsValue)}${fraction ? String(fraction).slice(1) : ""}`;
}
function cellValue(cell) {
  // Deliberately checking for absence rather than truthiness: office:value="0"
  // is a real value and must not fall through to the next candidate.
  if (cell["@_office:value"] !== undefined) {
    return cell["@_office:value"];
  }
  if (cell["@_office:date-value"] !== undefined) {
    return cell["@_office:date-value"];
  }
  if (cell["@_office:time-value"] !== undefined) {
    const time = cell["@_office:time-value"];
    return durationToTime(time) ?? time;
  }
  if (cell["@_office:boolean-value"] !== undefined) {
    return cell["@_office:boolean-value"];
  }
  return undefined;
}
function toNamedExpressions(raw) {
  const namedRanges = ensureIsArray(raw["table:named-range"]).map((range) => ({
    name: range["@_table:name"],
    baseCellAddress: range["@_table:base-cell-address"],
    cellRangeAddress: range["@_table:cell-range-address"],
  }));
  return { namedRanges };
}
export async function parseFods(fodsFilePath) {
  const options = {
    ignoreAttributes: false,
    // Keep every scalar as written. Without this, a cell whose text is "007"
    // parses as the number 7 and one whose text is "true" parses as a boolean.
    parseTagValue: false,
    parseAttributeValue: false,
  };
  const fileContent = await readFile(fodsFilePath);
  const parser = new XMLParser(options);
  const parsedFods = parser.parse(fileContent);
  const spreadsheet =
    parsedFods["office:document"]["office:body"]["office:spreadsheet"];
  const rawTables = spreadsheet["table:table"];
  const rawNamedExpressions = spreadsheet["table:named-expressions"];
  const tables = ensureIsArray(rawTables).map((table) => {
    const name = table["@_table:name"].toString();
    const rawRows = expandRepeats(
      ensureIsArray(table["table:table-row"]),
      (row) => repeatCount(row["@_table:number-rows-repeated"]),
      isEmptyRow,
    );
    const rows = rawRows.map((row, rowIndex) => {
      const rawCells = expandRepeats(
        ensureIsArray(row["table:table-cell"]),
        (cell) => repeatCount(cell["@_table:number-columns-repeated"]),
        isEmptyCell,
      );
      const cells = rawCells.map((cell, columnIndex) => {
        return {
          value: cellValue(cell),
          type: cell["@_office:value-type"],
          currency: cell["@_office:currency"],
          // Empty text carries nothing and cannot be told apart from absent
          // text after a round-trip, so it is normalized away here.
          text: cell["text:p"] === "" ? undefined : cell["text:p"],
          formula: cell["@_table:formula"],
          // R1C1 format is 1-indexed
          R: rowIndex + 1,
          C: columnIndex + 1,
        };
      });
      return { cells };
    });
    const namedExpressions = ensureIsArray(
      table["table:named-expressions"],
    ).map(toNamedExpressions);
    const result = {
      name: name,
      rows: rows,
      namedExpressions: namedExpressions[0],
    };
    return result;
  });
  const namedExpressions =
    ensureIsArray(rawNamedExpressions).map(toNamedExpressions);
  const result = {
    tables: tables,
    namedExpressions: namedExpressions[0] ?? { namedRanges: [] },
  };
  return result;
}
