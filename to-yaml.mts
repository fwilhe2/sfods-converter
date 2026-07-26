#!/usr/bin/env node

import { runCli } from "./cli.mjs";
import { yamlPrinter } from "./printers.mjs";

await runCli(yamlPrinter);
