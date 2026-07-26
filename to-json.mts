#!/usr/bin/env node

import { runCli } from "./cli.mjs";
import { jsonPrinter } from "./printers.mjs";

await runCli(jsonPrinter);
