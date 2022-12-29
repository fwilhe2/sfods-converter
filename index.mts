import { readdir, writeFile } from "fs/promises";
import path, { join } from "path";
import { argv } from "process";
import { parseFods } from "./convert-fods-to-sfods.mjs";
import { jsonPrinter, xmlPrinter, yamlPrinter } from "./printers.mjs";

try {
  const files = await readdir("test_data");
  for (const file of files) {
    if (file.endsWith(".fods")) {
      await writeFile(
        path.join(
          "generated",
          path.basename(`generated/${file}`, "fods") + "sfods.xml"
        ),
        xmlPrinter(await parseFods(join("test_data", file)))
      );
      await writeFile(
        path.join(
          "generated",
          path.basename(`generated/${file}`, "fods") + "sfods.json"
        ),
        jsonPrinter(await parseFods(join("test_data", file)))
      );
      await writeFile(
        path.join(
          "generated",
          path.basename(`generated/${file}`, "fods") + "sfods.yaml"
        ),
        yamlPrinter(await parseFods(join("test_data", file)))
      );
    }
  }
} catch (err) {
  console.error(err);
}
