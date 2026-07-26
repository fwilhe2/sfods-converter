import { Spreadsheet } from "./model.mjs";
export declare function parseXml(input: string): Spreadsheet;
export declare function parseJson(input: string): Spreadsheet;
export declare function parseYaml(input: string): Spreadsheet;
export declare function normalizeSpreadsheet(raw: unknown): Spreadsheet;
