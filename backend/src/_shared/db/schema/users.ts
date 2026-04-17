import { z } from "zod/v4";
import { defineTable } from "./_core";

export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: "student" | "supervisor" | "coordinator";
  createdAt: Date;
};

export const usersTable = defineTable<User>("users", [
  "id",
  "name",
  "email",
  "passwordHash",
  "role",
  "createdAt",
]);

export const insertUserSchema = z.object({
  name: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  role: z.enum(["student", "supervisor", "coordinator"]),
});
export type InsertUser = z.infer<typeof insertUserSchema>;

