import { execFileSync } from "node:child_process";
import * as GitHub from "@alchemy.run/github";
import * as Convex from "@samebase/alchemy-convex";
import * as Alchemy from "alchemy";
import * as Output from "alchemy/Output";
import * as RemovalPolicy from "alchemy/RemovalPolicy";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

/** The Convex team that holds the project and the state. */
const team = "nicu";

/** The GitHub repository, `owner/name`: GITHUB_REPOSITORY in Actions, else the origin remote. */
const repository =
  process.env["GITHUB_REPOSITORY"] ??
  /[:/]([^/:]+\/[^/]+?)(?:\.git)?$/.exec(
    execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
    }).trim(),
  )?.[1];
if (repository === undefined) {
  throw new Error("Set GITHUB_REPOSITORY to owner/name: the origin remote names no repository.");
}

export default Alchemy.Stack(
  repository,
  {
    providers: Layer.mergeAll(GitHub.providers(), Convex.providers()),
    state: Convex.state({ team }),
  },
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    if (
      repository !== "nicu-chiciuc/tic-tac-toe-4x4x4" ||
      (stage !== "prod" && !/^pr-\d+$/.test(stage))
    ) {
      throw new Error("Only this repository and its prod or pr-<number> stages can deploy.");
    }
    const source = {
      path: "./convex",
      command: ["node", "--run", "deploy"],
      // The files that `tsc -b && vite build` reads. The functions, package.json, and the
      // lockfile are always hashed.
      include: [
        "src/**",
        "lib/**",
        "tests/**",
        "public/**",
        "scripts/**",
        "alchemy.run.ts",
        "vite.config.ts",
        "index.html",
        "pnpm-workspace.yaml",
        "tsconfig*.json",
      ],
    } satisfies Convex.Source;
    // Production owns the existing project and retains it. The slug form cannot create a project.
    // Preview stages read the project retained in production state.
    const project =
      stage === "prod"
        ? yield* Convex.Project("Project", {
            team,
            slug: repository.slice(repository.indexOf("/") + 1),
          })
        : yield* Convex.Project.ref("Project", { stage: "prod" });
    const deployment =
      stage === "prod"
        ? yield* Convex.Deployment("Deployment", {
            project,
            type: "prod",
            source,
          })
        : yield* Convex.Deployment("Deployment", {
            project,
            type: "preview",
            name: stage,
            source,
          }).pipe(RemovalPolicy.destroy());

    const github = yield* GitHub.GitHubEnv;
    if (github?.pr) {
      // Retained: a closed pull request keeps the comment, as a record of what was deployed; the
      // preview's URL stops answering when the stage is destroyed.
      yield* GitHub.Comment("PreviewComment", {
        owner: github.owner,
        repository: github.repository,
        issueNumber: github.pr,
        body: Output.interpolate`Preview \`${stage}\`: ${deployment.siteUrl}`,
      }).pipe(RemovalPolicy.retain());
    }
    return { url: deployment.siteUrl };
  }),
);
