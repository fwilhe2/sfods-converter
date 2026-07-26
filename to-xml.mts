#!/usr/bin/env node

import { runCli } from "./cli.mjs";
import { xmlPrinter } from "./printers.mjs";

await runCli(xmlPrinter);
