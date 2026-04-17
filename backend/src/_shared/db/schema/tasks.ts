import { z } from "zod/v4";
import { defineTable } from "./_core";

export type Task = {
  id: number;
  teamId: number;
  title: string;
  description: string | null;
  deadline: Date | null;
  phase: "proposal" | "progress" | "final";
  status: "pending" | "submitted" | "reviewed";
  createdAt: Date;
};

export const tasksTable = defineTable<Task>("tasks", [
  "id",
  "teamId",
  "title",
  "description",
  "deadline",
  "phase",
  "status",
  "createdAt",
]);

export const insertTaskSchema = z.object({
  teamId: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  deadline: z.date().nullable().optional(),
  phase: z.enum(["proposal", "progress", "final"]),
  status: z.enum(["pending", "submitted", "reviewed"]).optional(),
});
export type InsertTask = z.infer<typeof insertTaskSchema>;

