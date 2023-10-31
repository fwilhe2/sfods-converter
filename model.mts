export type Text = string;
export type Cell = {
  value: string | number | undefined;
  type: "float" | "string" | "currency" | "date" | "time" | "percentage";
  currency: "EUR" | undefined;
  text: Text | undefined;
  formula: string | undefined;
  R: number | undefined;
  C: number | undefined;
};
export type Row = { cells: Cell[] };
export type NamedRange = {
  name: string;
  baseCellAddress: string;
  cellRangeAddress: string;
};
export type NamedExpressions = { namedRanges: NamedRange[] };
export type Table = {
  name: string;
  rows: Row[];
  namedExpressions: NamedExpressions | undefined;
};
export type Spreadsheet = {
  tables: Table[];
  namedExpressions: NamedExpressions;
};
