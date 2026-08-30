import { Context } from "hono";
import { threaddb } from "../services/db/thread.db";

export const threadController = {
  getAllThreads: async (c: Context) => {
    try {
      const clientId = (c as any).get("clientId") || "default";
      const threads = await threaddb.getAllThreads(c.env.DB, clientId);
      return c.json({ data: threads });
    } catch (error) {
      console.error("Error:", error);
      return c.json({ message: "Internal Server Error.", error }, 500);
    }
  },

  getAllThreadMessages: async (c: Context) => {
    try {
      const threadId: string = c.req.param("threadId");
      if (!threadId) {
        return c.json({ message: "Thread ID is required." }, 400);
      }

      const messages = await threaddb.getMessagesForThread(c.env.DB, threadId);
      return c.json({ data: messages });
    } catch (error) {
      console.error("Error:", error);
      return c.json({ message: "Internal Server Error.", error }, 500);
    }
  },
};
