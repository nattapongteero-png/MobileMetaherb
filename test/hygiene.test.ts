/**
 * Repo hygiene: no credential may live in tracked source.
 *
 * This session nearly earned the scar — an Expo access token and an account
 * password were pasted into the chat while setting up the APK build. Nothing
 * landed in the repo, and this test keeps it that way: it scans every tracked
 * source file for the shapes secrets take.
 *
 * Patterns are shapes, not the actual secrets — embedding a real fragment here
 * would itself be a leak.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SELF = "test/hygiene.test.ts";

const FILES = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(ts|tsx|js|mjs|json|md)$/.test(f))
  .filter((f) => f !== SELF && !f.includes("package-lock"));

type Rule = { name: string; re: RegExp };

const RULES: Rule[] = [
  { name: "hardcoded credential assignment", re: /\b(TOKEN|API_KEY|SECRET|PASSWORD|PASSWD)\s*[:=]\s*["'][A-Za-z0-9_\-@#$%]{8,}["']/i },
  { name: "bearer token literal", re: /Bearer\s+[A-Za-z0-9_\-.]{25,}/ },
  { name: "OpenAI-style key", re: /\bsk-[A-Za-z0-9]{20,}/ },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Expo access token flag", re: /EXPO_TOKEN=[A-Za-z0-9_\-]{20,}/ },
  { name: "private key block", re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
];

describe("no secrets in tracked files", () => {
  it(`scans ${FILES.length} files against ${RULES.length} shapes`, () => {
    const hits: string[] = [];
    for (const f of FILES) {
      const src = readFileSync(f, "utf8");
      for (const { name, re } of RULES) {
        if (re.test(src)) hits.push(`${f}: ${name}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("tracks no .env file", () => {
    const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n");
    expect(tracked.filter((f) => /(^|\/)\.env(\.|$)/.test(f))).toEqual([]);
  });

  it("the AI endpoints ship without embedded auth", () => {
    // Comments stripped first: the file legitimately EXPLAINS where an
    // Authorization header would go — the first draft of this test flagged
    // that prose as a leak.
    const src = readFileSync("src/config/aiEndpoints.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(src).not.toMatch(/Authorization\s*[:=]|Bearer\s+\S|api[_-]?key\s*[:=]/i);
  });
});
