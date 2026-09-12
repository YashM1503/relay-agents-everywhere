import { readFileSync } from "node:fs";
import { join } from "node:path";

const DEMO_DATA_ROOT = join(process.cwd(), "demo-data");

export function loadDemoJson<T>(filename: string): T {
  const filePath = join(DEMO_DATA_ROOT, filename);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}
