import { convexSsr } from "@samebase/convex-hosting-tanstack-start/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [".agents/**", "convex/_generated/**", "src/routeTree.gen.ts"],
  },
  lint: {
    ignorePatterns: [".agents/**", "convex/_generated/**", "src/routeTree.gen.ts"],
    options: { typeAware: true, typeCheck: true },
  },
  plugins: [
    tailwindcss(),
    convexSsr(),
    tanstackStart({
      pages: [{ path: "/about", prerender: { enabled: true, crawlLinks: false } }],
    }),
    react(),
  ],
  staged: {
    "*": "vp check --fix",
  },
});
