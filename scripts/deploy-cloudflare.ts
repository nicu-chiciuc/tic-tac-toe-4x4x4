/// <reference types="node" />
import { spawn } from "node:child_process";
import process from "node:process";

const modes = {
  deploy: ["deploy"],
  preview: ["preview"],
} as const;

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? 1}`));
    });
  });
}

const [modeArg, ...extraArgs] = process.argv.slice(2);

if (modeArg !== "deploy" && modeArg !== "preview") {
  throw new Error("Usage: node ./scripts/deploy-cloudflare.ts <deploy|preview> [wrangler flags]");
}

if (modeArg === "preview" && extraArgs.some((arg) => arg.startsWith("--dry-run"))) {
  throw new Error(
    "Worker Previews does not support --dry-run. Use deploy:dry-run for package validation.",
  );
}
const isWorkersBuild = process.env.WORKERS_CI === "1" || process.env.WORKERS_CI === "true";

if (!isWorkersBuild) {
  await run("vp", ["run", "build:cloudflare"]);
}

await run("wrangler", [...modes[modeArg], ...extraArgs]);
