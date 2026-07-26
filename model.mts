export type Text = string;

export const CELL_TYPES = [
  "float",
  "string",
  "currency",
  "date",
  "time",
  "percentage",
  "boolean",
] as const;

export type CellType = (typeof CELL_TYPES)[number];

export type Cell = {
  value: string | number | boolean | undefined;
  // A cell with no type at all is an empty cell (or a formula cell whose result
  // type the producer did not record).
  type: CellType | undefined;
  // ISO 4217 code. Only meaningful when type is "currency".
  currency: string | undefined;
  text: Text | undefined;
  formula: string | undefined;
  // 1-based row/column of the cell within its table. Informational: readers
  // place cells by position, so R/C never move a cell. See the format README.
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
  namedExpressions: NamedExpressions | undefined;
};
