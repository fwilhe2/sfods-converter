import { readdir, writeFile } from "fs/promises";
import { argv } from "process";
import { convertFodsToSfods } from "./convert-fods-to-sfods.mjs";
import { jsonPrinter, xmlPrinter, yamlPrinter } from "./printers.mjs";

try {
  const files = await readdir("test_data");
  for (const file of files) {
    if (file.endsWith(".fods")) {
      await writeFile(
        `generated/${file.replace("fods", "sfods")}.xml`,
        xmlPrinter(await convertFodsToSfods(`test_data/${file}`))
      );
      await writeFile(
        `generated/${file.replace("fods", "sfods")}.json`,
        jsonPrinter(await convertFodsToSfods(`test_data/${file}`))
      );
      await writeFile(
        `generated/${file.replace("fods", "sfods")}.yaml`,
        yamlPrinter(await convertFodsToSfods(`test_data/${file}`))
      );
    }
  }
} catch (err) {
  console.error(err);
}
