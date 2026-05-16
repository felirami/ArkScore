import { createHash } from "node:crypto";

type SmokeCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

const webUrl = normalizeBaseUrl(
  process.env.ARKSCORE_WEB_URL ?? "https://arkscore-seven.vercel.app",
);
const requiredHtml = [
  "ArkScore",
  "Avalanche Fuji",
  "eERC20",
  "Private credit token demo",
];
const forbiddenHtml = ["Authentication Required"];
const requiredBundleText = [
  "Fetch Wavy score",
  "Mock Wavy trace",
  "Wavy risk",
  "Subject hash",
  "Evidence hash",
  "Traceability",
  "AI risk scale",
  "Scorer status",
  "Subject status",
  "Store on Fuji",
];

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const checks: SmokeCheck[] = [];
  const response = await fetch(webUrl);
  const html = await response.text();

  checks.push({
    label: "Public page",
    passed: response.ok,
    detail: `${webUrl} returned ${response.status}`,
  });

  for (const text of requiredHtml) {
    checks.push({
      label: `HTML contains ${text}`,
      passed: html.includes(text),
      detail: text,
    });
  }

  for (const text of forbiddenHtml) {
    checks.push({
      label: `HTML excludes ${text}`,
      passed: !html.includes(text),
      detail: text,
    });
  }

  const scripts = getScriptSources(html);
  checks.push({
    label: "Next.js chunks",
    passed: scripts.length > 0,
    detail: `${scripts.length} script chunks discovered`,
  });

  const bundleText = await fetchBundles(scripts);
  for (const text of requiredBundleText) {
    checks.push({
      label: `Bundle contains ${text}`,
      passed: bundleText.includes(text),
      detail: text,
    });
  }

  const failed = checks.filter((check) => !check.passed);

  console.log("# ArkScore Hosted Demo Smoke\n");
  for (const check of checks) {
    console.log(
      `${check.passed ? "[pass]" : "[fail]"} ${check.label}: ${check.detail}`,
    );
  }
  console.log("\n## Summary\n");
  console.log(`- Passing: ${checks.length - failed.length}`);
  console.log(`- Failing: ${failed.length}`);
  console.log(`- Report id: ${reportId(checks)}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function getScriptSources(html: string): string[] {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map((match) => match[1] ?? "")
    .filter(Boolean);
}

async function fetchBundles(scripts: string[]) {
  const chunks = await Promise.all(
    scripts.map(async (src) => {
      const url = new URL(src, webUrl);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`${url.toString()} returned ${response.status}`);
      }

      return response.text();
    }),
  );

  return chunks.join("\n");
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function reportId(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 12);
}
