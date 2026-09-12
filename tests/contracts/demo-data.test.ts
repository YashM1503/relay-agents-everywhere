import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  demoDataSchemas,
  type DemoDataFileName,
} from "@/schemas/demo-data";
import {
  validateAllDemoData,
  validateDemoDataFile,
} from "@/lib/contracts/validate-demo-data";

const DEMO_DATA_DIR = path.join(process.cwd(), "demo-data");

describe("demo-data contract validation", () => {
  it("validates all demo-data fixtures", () => {
    const summary = validateAllDemoData(DEMO_DATA_DIR);

    if (!summary.valid) {
      const failures = summary.results
        .filter((result) => !result.valid)
        .map((result) => `${result.fileName}: ${result.error}`)
        .join("\n");
      expect.fail(`Demo-data validation failed:\n${failures}`);
    }

    expect(summary.valid).toBe(true);
    expect(summary.results).toHaveLength(Object.keys(demoDataSchemas).length);
  });

  it.each(Object.keys(demoDataSchemas) as DemoDataFileName[])(
    "parses %s individually",
    (fileName) => {
      const data = JSON.parse(
        readFileSync(path.join(DEMO_DATA_DIR, fileName), "utf8"),
      );

      const result = validateDemoDataFile(fileName, data);
      expect(result.valid, result.error).toBe(true);
    },
  );
});
