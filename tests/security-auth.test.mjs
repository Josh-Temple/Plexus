import assert from "node:assert/strict";
import test from "node:test";
import { assertRepoAllowed, parseAllowList } from "../src/lib/githubApp.ts";

test("missing repository allowlist denies all access", () => {
  assert.throws(() => assertRepoAllowed("Josh-Temple", "Plexus", parseAllowList(undefined)), /not configured/);
  assert.throws(() => assertRepoAllowed("Josh-Temple", "Plexus", parseAllowList("")), /not configured/);
  assert.throws(() => assertRepoAllowed("Other", "Example", parseAllowList("Josh-Temple/Plexus")), /not allowed/);
  assert.doesNotThrow(() => assertRepoAllowed("Josh-Temple", "Plexus", parseAllowList("josh-temple/plexus")));
});
