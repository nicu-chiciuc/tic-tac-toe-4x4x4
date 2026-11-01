# Fourfold

Play 4×4×4 tic-tac-toe with a friend. Guest sessions and games use Convex.

Production is https://majestic-cormorant-166.eu-west-1.convex.site. The original Worker at
https://tic-tac-toe-4x4x4.pfp.workers.dev stays deployed with its last build.
Its Workers Builds connection is removed.

## Build and deploy

`alchemy.run.ts` owns deployment. GitHub Actions uses the repository secret
`CONVEX_ACCESS_TOKEN` and stores state in team `nicu`'s `alchemy-state-store`.
The stack name is `nicu-chiciuc/tic-tac-toe-4x4x4`.

- A push to `main` deploys `prod`, the existing production deployment
  `majestic-cormorant-166` in project `2587920`.
- A same-repository pull request deploys `pr-<number>` and comments its URL.
  Closing the PR deletes its preview.
- Fork PRs, other branch pushes, and non-main manual runs deploy nothing.

The stack runs `pnpm run deploy` when its source hash changes. That command runs
`convex-hosting deploy --build "pnpm run build:app" --dist dist/client
--html-handling drop-trailing-slash`. It builds the site, uploads its files, and
pushes functions together. The deploy script refuses Workers Builds.

Production resources retain their default removal policy. The project uses its
existing slug, which cannot create a replacement project. The workflow verifies
its project id, team, name, and production deployment before deploying.

The app keeps `@convex-dev/auth` 0.0.94. Production auth variables stay in place.
New previews inherit `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL` from the project's
preview defaults. No auth keys are stored in Git or Alchemy state.

## Develop locally

Use Node 24 and the package manager pinned in `package.json`.

```sh
pnpm install
pnpm run dev
```

A fresh checkout needs a server build and a hosting version file before its
first Convex push. Start `pnpm exec convex dev` to select development, then run
`pnpm run deploy:dev` in another terminal. Keep production deploy keys unset.
The existing `scripts/ensure-convex-auth.ts` initializes missing development
auth keys when `pnpm run dev` starts.

Generated Convex bindings are committed. To regenerate them after a backend
change, build first, then run `pnpm exec convex codegen`. This command does not
push functions. Never commit `.convex-hosting`, `dist`, exports, or credentials.

## Validate

```sh
pnpm exec vp check
pnpm run check
pnpm exec vp test
VITE_CONVEX_URL=https://placeholder.convex.cloud pnpm run build:app
```

The placeholder is for validation only. Alchemy supplies the real deployment URL
inside the hosting deploy. TanStack renders the game shell per request and
prerenders `/about`; authentication and game subscriptions run in the browser.

See [the migration recipe](docs/alchemy-migration.md) before moving another app.
