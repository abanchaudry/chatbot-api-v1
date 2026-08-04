import { describe, expect, it } from "vitest";

import type { Piece } from "./ask-helper";
import { fuseCandidatePool } from "./candidate-fuser";
import { decideLocalEvidence } from "./local-evidence-gate";
import { planQuery } from "./query-planner";

function makePiece(args: {
  id: string;
  title: string;
  section?: string;
  text: string;
  score?: number;
  origin?: "vector" | "lexical" | "metadata";
  exactEntity?: boolean;
  exactPhrase?: boolean;
  exactSection?: boolean;
}): Piece {
  return {
    sourceType: "vector",
    sourceId: args.id,
    title: args.title,
    section: args.section || args.title,
    text: args.text,
    score: args.score || 50,
    rawScore: Math.max(0.01, Math.min(1, (args.score || 50) / 100)),
    meta: {
      __origin: args.origin || "vector",
      __exactEntityMatch: args.exactEntity === true,
      __exactPhraseMatch: args.exactPhrase === true,
      __exactSectionMatch: args.exactSection === true,
    },
  };
}

const CASES = [
  {
    question: "who is David",
    expectedTitle: "David Swenson Profile",
    vector: [
      makePiece({
        id: "david_profile",
        title: "David Swenson Profile",
        text: "David Swenson is President of Apogee and brings decades of sales and marketing experience.",
        score: 58,
        exactEntity: true,
      }),
    ],
    lexical: [
      makePiece({
        id: "gate_access",
        title: "Gate and Pool Access",
        text: "Homeowners need to submit their request in writing for gate access.",
        origin: "lexical",
        score: 40,
      }),
    ],
    metadata: [
      makePiece({
        id: "david_profile",
        title: "David Swenson Profile",
        text: "David Swenson President",
        origin: "metadata",
        score: 70,
        exactEntity: true,
      }),
    ],
  },
  {
    question: "what is the mission statement",
    expectedTitle: "Mission Statement",
    vector: [
      makePiece({
        id: "mission",
        title: "Mission Statement",
        text: "At Apogee, it is our goal to elevate the experience of owning a new home...",
        score: 60,
        exactPhrase: true,
      }),
    ],
    lexical: [],
    metadata: [
      makePiece({
        id: "mission",
        title: "Mission Statement",
        text: "Mission Statement",
        origin: "metadata",
        score: 72,
        exactPhrase: true,
      }),
    ],
  },
  {
    question: "what is the vision statement",
    expectedTitle: "Vision Statement",
    vector: [
      makePiece({
        id: "vision",
        title: "Vision Statement",
        text: "Recognizing the importance of tailoring our management styles...",
        score: 52,
        exactPhrase: true,
      }),
    ],
    lexical: [],
    metadata: [
      makePiece({
        id: "vision",
        title: "Vision Statement",
        text: "Vision Statement",
        origin: "metadata",
        score: 68,
        exactPhrase: true,
      }),
    ],
  },
  {
    question: "how do I get gate access",
    expectedTitle: "Gate and Pool Access",
    vector: [
      makePiece({
        id: "gate",
        title: "Gate and Pool Access",
        text: "Homeowners need to submit their request in writing or call the management team for gate access.",
        score: 56,
      }),
    ],
    lexical: [
      makePiece({
        id: "gate",
        title: "Gate and Pool Access",
        text: "How can I obtain a gate key, gate card, remote or pool key?",
        origin: "lexical",
        score: 65,
        exactPhrase: true,
      }),
    ],
    metadata: [],
  },
  {
    question: "what is the office address",
    expectedTitle: "Office Address",
    vector: [
      makePiece({
        id: "office",
        title: "Office Address",
        text: "4775 West Teco Avenue, Suite 130, Las Vegas, NV 89118.",
        score: 54,
      }),
    ],
    lexical: [],
    metadata: [
      makePiece({
        id: "office",
        title: "Office Address",
        text: "Office Address 4775 West Teco Avenue, Suite 130, Las Vegas, NV 89118.",
        origin: "metadata",
        score: 67,
        exactPhrase: true,
      }),
    ],
  },
  {
    question: "who is Lucille Sanchez",
    expectedTitle: "Lucille Sanchez Profile",
    vector: [
      makePiece({
        id: "lucille",
        title: "Lucille Sanchez Profile",
        text: "Lucille Sanchez is Vice President of Association Services.",
        score: 57,
        exactEntity: true,
      }),
    ],
    lexical: [],
    metadata: [
      makePiece({
        id: "lucille",
        title: "Lucille Sanchez Profile",
        text: "Lucille Sanchez Vice President",
        origin: "metadata",
        score: 70,
        exactEntity: true,
      }),
    ],
  },
  {
    question: "payment mailing address",
    expectedTitle: "Mail Payment",
    vector: [
      makePiece({
        id: "mail_payment",
        title: "Mail Payment",
        text: "Apogee P.O. BOX 96175 Las Vegas, Nevada 89193-6175.",
        score: 59,
      }),
    ],
    lexical: [],
    metadata: [
      makePiece({
        id: "mail_payment",
        title: "Mail Payment",
        text: "payment mailing address",
        origin: "metadata",
        score: 68,
        exactPhrase: true,
      }),
    ],
  },
  {
    question: "architectural submittal form",
    expectedTitle: "Architectural Submittal Form",
    vector: [
      makePiece({
        id: "arch_form",
        title: "Architectural Submittal Form",
        text: "You can log into your Homeowners Association website to obtain the form.",
        score: 57,
        exactPhrase: true,
      }),
    ],
    lexical: [],
    metadata: [
      makePiece({
        id: "arch_form",
        title: "Architectural Submittal Form",
        text: "Architectural Submittal Form",
        origin: "metadata",
        score: 66,
        exactPhrase: true,
      }),
    ],
  },
];

describe("retrieval regression coverage", () => {
  for (const testCase of CASES) {
    it(`keeps the direct-answer chunk for "${testCase.question}"`, () => {
      const plan = planQuery(testCase.question);
      const fusion = fuseCandidatePool({
        question: testCase.question,
        plan,
        vectorPieces: testCase.vector,
        lexicalPieces: testCase.lexical,
        metadataPieces: testCase.metadata,
        finalMax: 20,
      });

      expect(fusion.candidates[0]?.title).toContain(testCase.expectedTitle);

      const gate = decideLocalEvidence({
        plan,
        pieces: fusion.candidates.slice(0, 3),
        rerankKept: Math.min(3, fusion.candidates.length),
        rerankCoverage: 85,
      });

      expect(gate.decision).toBe("answer_local");
    });
  }

  it("does not pass broad queries on generic score strength alone", () => {
    const plan = planQuery("what services does apogee offer");
    const genericPieces = [
      makePiece({
        id: "privacy",
        title: "Privacy Policy Overview",
        text: "This policy explains what Apogee will do to keep information about you private and secure.",
        score: 100,
        origin: "lexical",
      }),
      makePiece({
        id: "complaints",
        title: "Handling Issues and Complaints",
        text: "Complaints should be submitted in writing by mail, fax, or email.",
        score: 92,
        origin: "lexical",
      }),
      makePiece({
        id: "leadership",
        title: "Leadership Team",
        text: "Lucille Sanchez was recently promoted to Vice President of Association Services.",
        score: 86,
      }),
    ];

    const gate = decideLocalEvidence({
      plan,
      pieces: genericPieces,
      rerankKept: genericPieces.length,
      rerankCoverage: 0,
    });

    expect(gate.decision).toBe("needs_rescue");
  });
});
