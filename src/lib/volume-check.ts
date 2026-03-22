/**
 * Validates DATA_DIR exists and is writable on worker startup.
 * Call before processing jobs; exit process on failure to prevent silent corruption.
 */

import * as fs from "fs";
import * as path from "path";
import { logFatal } from "./logger";

export function validateDataDir(): void {
  const dataDir = process.env.DATA_DIR;
  if (!dataDir || !dataDir.trim()) {
    logFatal("DATA_DIR is not set", {});
    process.exit(1);
  }

  const resolved = path.resolve(dataDir);
  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      logFatal("DATA_DIR is not a directory", { DATA_DIR: resolved });
      process.exit(1);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      try {
        fs.mkdirSync(resolved, { recursive: true });
      } catch (mkdirErr) {
        logFatal("DATA_DIR does not exist and could not be created", {
          DATA_DIR: resolved,
          error: (mkdirErr as Error).message,
        });
        process.exit(1);
      }
    } else {
      logFatal("DATA_DIR is not accessible", {
        DATA_DIR: resolved,
        error: (err as Error).message,
      });
      process.exit(1);
    }
  }

  const testFile = path.join(resolved, ".synthmr-write-test");
  try {
    fs.writeFileSync(testFile, "ok", "utf8");
    fs.unlinkSync(testFile);
  } catch (err) {
    logFatal("DATA_DIR is not writable", {
      DATA_DIR: resolved,
      error: (err as Error).message,
    });
    process.exit(1);
  }
}
