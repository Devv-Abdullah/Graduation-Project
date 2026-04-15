import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { teamsTable } from "./teams";

export const supervisorRequestsTable = pgTable("supervisor_requests", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id),
  supervisorId: integer("supervisor_id").notNull().references(() => usersTable.id),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).notNull().default("pending"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupervisorRequestSchema = createInsertSchema(supervisorRequestsTable).omit({ id: true, createdAt: true });
export type InsertSupervisorRequest = z.infer<typeof insertSupervisorRequestSchema>;
export type SupervisorRequest = typeof supervisorRequestsTable.$inferSelect;
