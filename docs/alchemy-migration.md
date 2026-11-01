# Move an existing app to Alchemy and Convex hosting

This recipe keeps the existing Convex project and data. It applies to
`weight_tsx` after substituting that app's verified project id, slug, team,
production deployment, Worker account, and Worker tag. Do not copy Fourfold's ids.

1. Create a branch. Read chessmerge's `alchemy.run.ts`, workflow, hosting setup,
   and deploy scripts. Read Samebase's `docs/alchemy-deploy-standard.md`. Keep the
   app's existing Convex Auth package and schema.
2. Read the project through `GET https://api.convex.dev/v1/projects/<id>` and
   `/projects/<id>/list_deployments` using the CLI login without printing its
   token. Check the real project name against the repository name. Record the
   default production deployment name and team id.
3. Before any production change, export with the deploy key cleared. Use a new
   private directory outside the repository and record counts for every table.
   Include file storage. Never commit the export.

   ```sh
   umask 077
   backup=$(mktemp -d /private/tmp/convex-migration.XXXXXX)
   env -u CONVEX_DEPLOY_KEY npx convex export \
     --deployment <team>:<project>:prod --include-file-storage \
     --path "$backup/before.zip"
   ```

4. Stop Workers Builds before pushing. Discover commands with anonymous
   `cf cli search` queries. Find the Worker tag with
   `cf workers scripts search --name <worker>`, selecting its account through
   `CLOUDFLARE_ACCOUNT_ID`. Inspect its repository connection. Run
   `cf builds workers delete <tag> --force` in that account. This removes build
   settings and triggers and cancels unfinished builds. It keeps the Worker.
   Verify the trigger list is empty and the configuration lookup returns 404.
   Check `cf builds list --external-script-id <tag> --per-page 100` for
   unfinished runs. List production keys with the Management API endpoint
   `/deployments/<production>/list_deploy_keys` and delete old keys by name:
   `npx convex deployment token delete "<name>" --deployment <production>`.
   List preview keys with `/projects/<id>/list_preview_deploy_keys?includeManaged=true`.
   Revoke each old preview key through POST
   `/projects/<id>/delete_preview_deploy_key` with `{ "id": "<name>" }`.
   Capture responses and print metadata only. Re-read both lists before merging.
5. Add hosting 0.14.0, the TanStack hosting adapter 0.11.0,
   `@samebase/alchemy-convex` 0.20.0, Alchemy and its GitHub provider
   2.0.0-beta.84, and Effect/platform-node 4.0.5. Pin
   `@effect/platform-node-shared` to 4.0.5 in pnpm overrides. Use the matching
   toolchain versions from Samebase's `templates/base-alchemy/package.json`
   and its workspace catalog. Preserve the existing auth package version.
6. Mount hosting in `convex/convex.config.ts`. Add `convexSsr()` before
   `tanstackStart()`, add `src/server.ts` from the hosting adapter, and register
   `routeAll` after the app's auth routes. Remove `allowJs` from the Convex
   tsconfig so it uses the adapter's server-build declaration. Remove Wrangler,
   old deploy workflows, Workers build scripts, and obsolete redirect files.
   Keep a Workers Builds rejection before the new deploy command.
7. Use chessmerge's deploy shape: `convex-hosting deploy --build "pnpm run
   build:app" --dist dist/client --html-handling drop-trailing-slash`. The
   build script type-checks and builds only. Commit `convex/_generated` with
   its hosting component binding. For the initial local bootstrap, temporarily
   give `components` its hosting component type and create an ignored
   `.convex-hosting/version.js` exporting `versionId = undefined`. Build with a
   placeholder `VITE_CONVEX_URL`, then run read-only `convex codegen` with the
   verified existing development deployment selected. Commit the real generated
   output. Never commit the temporary version file or built server.
8. Adapt chessmerge's stack. Use the repository full name and `Convex.state`.
   Production owns the existing project by slug with default retain policy.
   Previews use `Convex.Project.ref("Project", { stage: "prod" })` and the name
   `pr-<number>`. Only preview deployments receive `RemovalPolicy.destroy()`.
   Hash all build inputs. Add a read-only identity check before deployment.
9. Run `alchemy plan --stage prod --adopt --no-input --env-file /dev/null`.
   Require `[Project] adopted`. `[Deployment] create` is a new state record:
   the production provider reads the existing default and returns `created:
   false`. Stop on project creation, delete, replace, or a different production
   deployment. Never destroy production.
10. Set missing auth values as project defaults for type `preview`, using the
    old auth package's key format. Generate a new matching key pair and capture
    CLI output so no values reach logs. Do not copy production private keys.
    Preserve any defaults that already exist. Fourfold uses the production site
    as the stable `SITE_URL` fallback; there is no Google sign-in change.
11. Open the migration PR with validation and production deployment wired, but
    preview steps deferred. Run formatting, types, tests, build, and dependency
    checks. Squash merge when CI passes. The first automatic main deploy can
    refuse unowned resources safely. Run exactly one adoption from main:
    `gh workflow run alchemy.yml -f adopt=true`.
12. Verify the original production deployment and project ids still match.
    Export again and compare all table counts before browser testing creates
    guest sessions or games. Use the exact `{ url }` from the Actions run, including any region in its host.
    Check that site and play a game.
    If a schema push rejects existing rows, widen only; never clear a table or
    import with replacement.
13. Open a small follow-up PR adding chessmerge's preview deploy and cleanup
    steps. Require a green `pr-<number>` deployment and URL comment. Play a game
    on the preview. Merge and verify preview cleanup plus the main deployment.
    No other branch or provider should deploy.

Keep a final record of the PRs, Actions runs, production identity, exports,
row-count comparison, played games, preview cleanup, and Workers Builds removal.
