import { describe, expect, it } from "vitest";

import { rerankPrompt } from "../prompts/rerank.prompt";
import {
  extractQuestionFocusPhrases,
  parseRerankKeepIds,
  parseRerankOutput,
} from "./ask-helper";
import { newTrace, traceSetRetrievalHits } from "./trace";

describe("rerank contract", () => {
  it("prompt instructs the model to return keepIds", async () => {
    const formatted = await rerankPrompt.format({
      question: "What are the filing steps?",
      evidence: "ID=1\nTEXT=Step one",
      maxItems: 3,
    });

    expect(formatted).toContain('"keepIds": [1, 2, 3]');
    expect(formatted).not.toContain('"ranked"');
    expect(formatted).toContain("IDs must be unique");
    expect(formatted).toContain("prefer the lower numeric ID");
  });

  it("parser returns valid keepIds in order", () => {
    expect(parseRerankKeepIds('{"keepIds":[3,1,2]}', 3)).toEqual([3, 1, 2]);
  });

  it("parser drops invalid ids and recovers JSON wrapped in extra text", () => {
    const raw = 'Result: {"keepIds":[2,"2",0,5,1,2,-1]} thanks';

    expect(parseRerankKeepIds(raw, 3)).toEqual([2, 1]);
  });

  it("parser extracts bounded coverage when available", () => {
    expect(parseRerankOutput('{"keepIds":[2,1],"coverage":104}', 3)).toEqual({
      keepIds: [2, 1],
      coverage: 100,
    });
  });

  it("parser handles empty or noisy output without hallucinating ids", () => {
    expect(parseRerankOutput("coverage: low", 4)).toEqual({
      keepIds: [],
      coverage: null,
    });
  });

  it("extracts focus phrases from natural-language heading queries", () => {
    expect(extractQuestionFocusPhrases("what is the vision statement")).toContain(
      "vision statement"
    );
    expect(extractQuestionFocusPhrases("what is the vision of apogee")).toContain(
      "vision"
    );
  });

  it("keeps pass-scoped vector hits in vector trace buckets", () => {
    const trace = newTrace({
      userId: "u1",
      threadId: "t1",
      message: "what is the vision statement",
    });

    traceSetRetrievalHits(trace, "vector_pass1", [{ score: 77, text: "Vision Statement" }]);

    expect(trace.vectorHits).toHaveLength(1);
    expect(trace.retrieval.vectorHits).toHaveLength(1);
    expect(trace.autoragHits).toHaveLength(0);
  });
});
