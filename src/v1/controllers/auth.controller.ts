import { Context } from "hono";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { authdb } from "../services/db/auth.db";

export const authController = {
  login: async (c: Context) => {
    try {
      const { username, password } = await c.req.json();
      if (!username) return c.json({ message: "User name is required." }, 400);
      if (!password) return c.json({ message: "Password is required." }, 400);

      const user = await authdb.getUserByUsername(c.env.DB, username);
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return c.json({ message: "Invalid credentials" }, 401);
      }

      await authdb.updateLastLogin(c.env.DB, username);

      if (!c.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured");
        return c.json({ message: "Authentication is not configured." }, 500);
      }

      const jwtSecret = new TextEncoder().encode(c.env.JWT_SECRET);
      const token = await new SignJWT({ id: user.id, username: user.username })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .sign(jwtSecret);

      return c.json({ token });
    } catch (error) {
      console.error("Error:", error);
      return c.json({ message: "Internal Server Error.", error: error }, 500);
    }
  },

  signup: async (c: Context) => {
    try {
      const { username, password } = await c.req.json();
      if (!username) return c.json({ message: "User name is required." }, 400);
      if (!password) return c.json({ message: "Password is required." }, 400);

      const existingUser = await authdb.getUserByUsername(c.env.DB, username);
      if (existingUser) {
        return c.json({ message: "Username already exists." }, 409);
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      await authdb.saveUser(c.env.DB, username, hashedPassword);

      return c.json({ message: "User registered successfully!" }, 201);
    } catch (error) {
      console.error("Error:", error);
      return c.json({ message: "Internal Server Error.", error: error }, 500);
    }
  },

  getUserById: async (c: Context) => {
    try {
      const userId = c.req.param("id");
      if (!userId) return c.json({ message: "User ID is required." }, 400);

      const user = await authdb.getUserById(c.env.DB, userId);
      if (!user) return c.json({ message: "User not found." }, 404);

      return c.json({ user });
    } catch (error) {
      console.error("Error:", error);
      return c.json({ message: "Internal Server Error.", error: error }, 500);
    }
  },

  getAllUsers: async (c: Context) => {
    try {
      const users = await authdb.getAllAuthUsers(c.env.DB);
      return c.json({ users });
    } catch (error) {
      console.error("Error:", error);
      return c.json({ message: "Internal Server Error.", error: error }, 500);
    }
  },
};
