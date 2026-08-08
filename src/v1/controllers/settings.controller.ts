import type { Context } from "hono";
import type { Env } from "../types/env";
import { SettingsDbService } from "../services/db/settings.db";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

const domainGeneratorPrompt = PromptTemplate.fromTemplate(`
You are an expert AI prompt engineer specializing in enterprise RAG chatbots.

Your task is to take a company's raw business summary and transform it into a clear, comprehensive, and structured DOMAIN_HINT instruction string for an AI customer support bot.

Company Name: {companyName}
Raw Business Summary:
{rawDescription}

Format the output as a 2-3 paragraph domain scope specification covering:
1. What the company does, its core products/services, and customer base.
2. The specific topics, policies, FAQs, regulations, pricing, and procedures the AI is authorized to assist with.
3. Explicit boundaries specifying what is out of scope.

Output ONLY the final domain instruction text (no markdown intro, no JSON wrappers):
`);

export const settingsController = {
  getSettings: async (c: Context<Env>) => {
    try {
      const db = c.env.DB;
      const settings = await new SettingsDbService().getSettings(db as any);
      return c.json({ ok: true, settings });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Failed to fetch settings" }, 500);
    }
  },

  saveSettings: async (c: Context<Env>) => {
    try {
      const db = c.env.DB;
      const body = await c.req.json();
      const settings = await new SettingsDbService().saveSettings(db as any, body);
      return c.json({ ok: true, settings });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Failed to save settings" }, 500);
    }
  },

  generateDomainPrompt: async (c: Context<Env>) => {
    try {
      const body = await c.req.json();
      const companyName = String(body.companyName || "Our Company").trim();
      const rawDescription = String(body.rawDescription || "").trim();

      if (!rawDescription) {
        return c.json({ ok: false, error: "rawDescription is required to generate domain prompt" }, 400);
      }

      const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return c.json({ ok: false, error: "OPENAI_API_KEY is not configured" }, 500);
      }

      const model = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: "gpt-4o-mini",
        temperature: 0.3,
      });

      const chain = domainGeneratorPrompt.pipe(model);
      const res = await chain.invoke({ companyName, rawDescription });
      const generatedDomainHint = String(res.content || "").trim();

      return c.json({
        ok: true,
        companyName,
        generatedDomainHint,
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Failed to generate domain prompt" }, 500);
    }
  },
};
