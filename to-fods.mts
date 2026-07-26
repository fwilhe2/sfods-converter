#!/usr/bin/env node

import { runCli } from "./cli.mjs";
import { produceFods } from "./convert-sfods-to-fods.mjs";

await runCli(produceFods);
