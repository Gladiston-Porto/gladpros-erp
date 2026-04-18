// scripts/jest-changed-pr.js
const { spawnSync } = require("child_process");

const base = process.env.CHANGED_SINCE;

if (!base) {
  console.error(
    "CHANGED_SINCE não definido. Ex.: CHANGED_SINCE=origin/main npm run test:changed:pr"
  );
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["jest", `--changedSince=${base}`, "--runInBand", "--passWithNoTests"],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 1);