import { Router } from "express";
import type { IRouter } from "express";
import { db, teamsTable, tasksTable, teamMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/session";
import { createNotification, logActivity } from "../lib/notify";

const router: IRouter = Router();

async function formatTask(task: typeof tasksTable.$inferSelect) {
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, task.teamId));
  return { ...task, team };
}

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  let tasks: (typeof tasksTable.$inferSelect)[];

  if (req.user!.role === "student") {
    const [membership] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.userId, req.user!.id));
    if (!membership) { res.json([]); return; }
    tasks = await db.select().from(tasksTable).where(eq(tasksTable.teamId, membership.teamId));
  } else if (req.user!.role === "supervisor") {
    const supervisedTeams = await db.select().from(teamsTable).where(eq(teamsTable.supervisorId, req.user!.id));
    const teamIds = supervisedTeams.map(t => t.id);
    if (teamIds.length === 0) { res.json([]); return; }
    tasks = await db.select().from(tasksTable);
    tasks = tasks.filter(t => teamIds.includes(t.teamId));
  } else {
    tasks = await db.select().from(tasksTable);
  }

  const formatted = await Promise.all(tasks.map(formatTask));
  res.json(formatted);
});

router.post("/tasks", requireAuth, requireRole("supervisor", "coordinator"), async (req, res): Promise<void> => {
  const { teamId, title, description, deadline, phase } = req.body;
  if (!teamId || !title || !phase) { res.status(400).json({ error: "teamId, title, and phase required" }); return; }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  const [task] = await db.insert(tasksTable).values({ teamId, title, description, deadline: deadline ? new Date(deadline) : null, phase, status: "pending" }).returning();

  const members = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, teamId));
  for (const m of members) {
    await createNotification(m.userId, "new_task", `New task "${title}" has been assigned to your team`);
  }
  await logActivity("task_created", `Task "${title}" created for team "${team.name}"`, req.user!.id, teamId);

  res.status(201).json(await formatTask(task));
});

router.get("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(await formatTask(task));
});

router.put("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  const { title, description, deadline, status } = req.body;
  const [updated] = await db.update(tasksTable).set({ title, description, deadline: deadline ? new Date(deadline) : task.deadline, status }).where(eq(tasksTable.id, id)).returning();
  res.json(await formatTask(updated));
});

export default router;
