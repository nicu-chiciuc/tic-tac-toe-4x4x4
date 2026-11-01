const token = process.env["CONVEX_ACCESS_TOKEN"];
if (!token) throw new Error("CONVEX_ACCESS_TOKEN is required to verify the project.");
async function get(path: string): Promise<unknown> {
  const response = await fetch(`https://api.convex.dev/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Project verification failed: HTTP ${response.status}.`);
  return response.json();
}
const project = await get("/projects/2587920");
if (
  typeof project !== "object" ||
  project === null ||
  !("id" in project) ||
  project.id !== 2587920 ||
  !("teamId" in project) ||
  project.teamId !== 38516 ||
  !("name" in project) ||
  project.name !== "tic-tac-toe-4x4x4" ||
  !("slug" in project) ||
  project.slug !== "tic-tac-toe-4x4x4" ||
  !("prodDeploymentName" in project) ||
  project.prodDeploymentName !== "majestic-cormorant-166"
) {
  throw new Error("The existing Convex project identity changed. Stop before deployment.");
}
console.log("Verified project 2587920, team 38516, production majestic-cormorant-166.");
export {};
