import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const projectPhasesTable = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id),
  phase: text("phase", { enum: ["proposal", "progress", "final"] }).notNull(),
  status: text("status", { enum: ["in_progress", "completed"] }).notNull().default("in_progress"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertProjectPhaseSchema = createInsertSchema(projectPhasesTable).omit({ id: true, startedAt: true });
export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;
export type ProjectPhase = typeof projectPhasesTable.$inferSelect;
