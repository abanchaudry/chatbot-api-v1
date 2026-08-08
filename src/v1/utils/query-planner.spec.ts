import { describe, expect, it } from "vitest";

import { planQuery } from "./query-planner";

describe("query planner", () => {
  it("detects entity questions", () => {
    const plan = planQuery("who is David");
    expect(plan.intent).toBe("person");
    expect(plan.searchMode).toBe("entity_exact");
    expect(plan.entities).toContain("david");
  });

  it("detects exact phrase statement questions", () => {
    const plan = planQuery("what is the mission statement");
    expect(plan.intent).toBe("policy");
    expect(plan.searchMode).toBe("phrase_exact");
    expect(plan.exactPhrases).toContain("mission statement");
  });

  it("uses history for follow up questions", () => {
    const plan = planQuery("what about him", "User: who is David\nAssistant: ...");
    expect(plan.intent).toBe("follow_up");
    expect(plan.usesHistory).toBe(true);
    expect(plan.searchQuery).toContain("who is David");
  });
});
