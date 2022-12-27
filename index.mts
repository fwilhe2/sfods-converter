import { argv } from "process";
import { convertFodsToSfods } from "./convert-fods-to-sfods.mjs";

console.log(await convertFodsToSfods("test_data/expense-tracker.fods"));
