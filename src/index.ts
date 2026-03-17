#!/usr/bin/env node
import { createRequire } from "node:module";
import { main } from "./cli.js";
import { startUpdateCheck, showUpdateMessage } from "./updater.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const updatePromise = startUpdateCheck();
await main();
const latestVersion = await updatePromise;
showUpdateMessage(version, latestVersion);
