#!/usr/bin/env node
import { runCli } from "./cli.mjs";
import { htmlPrinter } from "./printers.mjs";
await runCli(htmlPrinter);
