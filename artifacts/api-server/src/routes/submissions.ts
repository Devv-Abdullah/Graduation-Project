import { Router } from "express";
import type { IRouter } from "express";
import { db, usersTable, tasksTable, teamsTable, submissionsTable, teamMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/session";
import { createNotification, logActivity } from "../lib/notify";

const router: IRouter = Router();

async function formatSubmission(sub: typeof submissionsTable.$inferSelect) {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, sub.taskId));
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, task.teamId));
  const [submittedBy] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, sub.submittedById));
  return { ...sub, task: { ...task, team }, submittedBy };
}

router.get("/submissions", requireAuth, async (req, res): Promise<void> => {
  let subs: (typeof submissionsTable.$inferSelect)[];
  if (req.user!.role === "student") {
    const [membership] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.userId, req.user!.id));
    if (!membership) { res.json([]); return; }
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.teamId, membership.teamId));
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) { res.json([]); return; }
    subs = await db.select().from(submissionsTable);
    subs = subs.filter(s => taskIds.includes(s.taskId));
  } else if (req.user!.role === "supervisor") {
    const supervisedTeams = await db.select().from(teamsTable).where(eq(teamsTable.supervisorId, req.user!.id));
    const teamIds = supervisedTeams.map(t => t.id);
    if (teamIds.length === 0) { res.json([]); return; }
    const tasks = await db.select().from(tasksTable);
    const taskIds = tasks.filter(t => teamIds.includes(t.teamId)).map(t => t.id);
    if (taskIds.length === 0) { res.json([]); return; }
    subs = await db.select().from(submissionsTable);
    subs = subs.filter(s => taskIds.includes(s.taskId));
  } else {
    subs = await db.select().from(submissionsTable);
  }
  const formatted = await Promise.all(subs.map(formatSubmission));
  res.json(formatted);
});

router.post("/submissions", requireAuth, async (req, res): Promise<void> => {
  const { taskId, fileUrl, notes } = req.body;
  if (!taskId) { res.status(400).json({ error: "taskId required" }); return; }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  const [sub] = await db.insert(submissionsTable).values({ taskId, submittedById: req.user!.id, fileUrl, notes, status: "pending" }).returning();
  await db.update(tasksTable).set({ status: "submitted" }).where(eq(tasksTable.id, taskId));

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, task.teamId));
  if (team?.supervisorId) {
    await createNotification(team.supervisorId, "new_submission", `Team "${team.name}" submitted deliverable for task "${task.title}"`);
  }
  await logActivity("submission_created", `Submitted deliverable for task "${task.title}"`, req.user!.id, task.teamId);

  res.status(201).json(await formatSubmission(sub));
});

router.post("/submissions/:id/review", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [sub] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!sub) { res.status(404).json({ error: "Submission not found" }); return; }

  const { status, feedback } = req.body;
  if (!status || !["approved", "rejected"].includes(status)) { res.status(400).json({ error: "Valid status required" }); return; }

  const [updated] = await db.update(submissionsTable).set({ status, feedback }).where(eq(submissionsTable.id, id)).returning();
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, sub.taskId));
  if (status === "approved") {
    await db.update(tasksTable).set({ status: "reviewed" }).where(eq(tasksTable.id, sub.taskId));
  }

  await createNotification(sub.submittedById, "submission_reviewed", `Your submission for "${task?.title}" has been ${status}`);
  await logActivity("submission_reviewed", `Submission for "${task?.title}" marked as ${status}`, req.user!.id, task?.teamId);

  res.json(await formatSubmission(updated));
});

export default router;
