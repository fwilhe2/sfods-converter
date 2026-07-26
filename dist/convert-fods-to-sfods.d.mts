import { Spreadsheet } from "./model.mjs";
export declare function durationToTime(duration: string): string | undefined;
export declare function parseFods(fodsFilePath: string): Promise<Spreadsheet>;
