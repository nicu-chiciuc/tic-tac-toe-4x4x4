if (process.env["WORKERS_CI"] === "1" || process.env["WORKERS_CI"] === "true") {
  throw new Error("Workers Builds is retired. Deploy through the Alchemy GitHub workflow.");
}
export {};
