import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { ZodSchema } from "zod";
import {
  demoDataSchemas,
  type DemoDataFileName,
} from "@/schemas/demo-data";

const DEMO_DATA_DIR = path.join(process.cwd(), "demo-data");

export type DemoDataValidationResult = {
  fileName: DemoDataFileName;
  valid: boolean;
  error?: string;
};

export type DemoDataValidationSummary = {
  valid: boolean;
  results: DemoDataValidationResult[];
};

function loadJson(filePath: string): unknown {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

export function validateDemoDataFile(
  fileName: DemoDataFileName,
  data: unknown,
): DemoDataValidationResult {
  const schema = demoDataSchemas[fileName] as ZodSchema;
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return { fileName, valid: true };
  }

  return {
    fileName,
    valid: false,
    error: parsed.error.message,
  };
}

export function validateAllDemoData(
  demoDataDir: string = DEMO_DATA_DIR,
): DemoDataValidationSummary {
  const fileNames = readdirSync(demoDataDir).filter((name) => name.endsWith(".json"));
  const results: DemoDataValidationResult[] = [];

  for (const fileName of fileNames) {
    if (!(fileName in demoDataSchemas)) {
      results.push({
        fileName: fileName as DemoDataFileName,
        valid: false,
        error: `No schema registered for ${fileName}`,
      });
      continue;
    }

    const data = loadJson(path.join(demoDataDir, fileName));
    results.push(
      validateDemoDataFile(fileName as DemoDataFileName, data),
    );
  }

  const expectedFiles = Object.keys(demoDataSchemas);
  for (const expected of expectedFiles) {
    if (!fileNames.includes(expected)) {
      results.push({
        fileName: expected as DemoDataFileName,
        valid: false,
        error: `Missing fixture file ${expected}`,
      });
    }
  }

  return {
    valid: results.every((result) => result.valid),
    results,
  };
}
