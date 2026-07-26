import { Spreadsheet } from "./model.mjs";
export declare function readSpreadsheet(path: string): Promise<Spreadsheet>;
export declare function runCli(
  print: (spreadsheet: Spreadsheet) => string,
): Promise<void>;
