import { describe, expect, it } from "vitest";
import { POST as showPost } from "@/app/api/show/route";
import { normalizeImageObservation } from "@/lib/observation/image";

describe("Show API", () => {
  it("returns image observation shape", async () => {
    const obs = normalizeImageObservation("data:image/jpeg;base64,abc");
    expect(obs.source).toBe("image");
    expect(obs.content.imageRef).toContain("base64");
  });

  it("POST /api/show returns explanation without provider names", async () => {
    const req = new Request("http://localhost/api/show", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "data:image/jpeg;base64,test" }),
    });
    const res = await showPost(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      explanation: string;
      observation: { source: string };
    };
    expect(body.observation.source).toBe("image");
    expect(body.explanation.toLowerCase()).not.toMatch(/openai|gpt|openrouter|claude/);
  });
});
