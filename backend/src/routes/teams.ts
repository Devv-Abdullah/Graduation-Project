import { Router } from "express";
import type { IRouter } from "express";
import { db, usersTable, teamsTable, teamMembersTable } from "@workspace/db";
import { eq, ilike, and, sql } from "@workspace/db";
import { requireAuth } from "../lib/session";
import { logActivity } from "../lib/notify";

const router: IRouter = Router();

async function formatTeam(team: typeof teamsTable.$inferSelect) {
  const [leader] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, team.leaderId));
  let supervisor = null;
  if (team.supervisorId) {
    const [s] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, team.supervisorId));
    supervisor = s || null;
  }
  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(teamMembersTable).where(eq(teamMembersTable.teamId, team.id));
  return { ...team, leader, supervisor, memberCount: countResult?.count ?? 0 };
}

router.get("/teams", requireAuth, async (req, res): Promise<void> => {
  const { status, search } = req.query as { status?: string; search?: string };
  let teamsQuery = db.select().from(teamsTable);
  const conds = [];
  if (status) conds.push(eq(teamsTable.status, status as "forming" | "active" | "supervised" | "completed"));
  if (search) conds.push(ilike(teamsTable.name, `%${search}%`));
  const teams = conds.length > 0 ? await teamsQuery.where(and(...conds)) : await teamsQuery;
  const formatted = await Promise.all(teams.map(formatTeam));
  res.json(formatted);
});

router.post("/teams", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "student") { res.status(403).json({ error: "Only students can create teams" }); return; }
  const existing = await db.select().from(teamMembersTable).where(eq(teamMembersTable.userId, req.user!.id));
  if (existing.length > 0) { res.status(400).json({ error: "You are already in a team" }); return; }

  const { name, projectTitle, description } = req.body;
  if (!name) { res.status(400).json({ error: "Team name is required" }); return; }

  const [team] = await db.insert(teamsTable).values({ name, projectTitle, description, leaderId: req.user!.id }).returning();
  await db.insert(teamMembersTable).values({ teamId: team.id, userId: req.user!.id, role: "leader" });
  await logActivity("team_created", `Team "${name}" created`, req.user!.id, team.id);

  res.status(201).json(await formatTeam(team));
});

router.get("/teams/my", requireAuth, async (req, res): Promise<void> => {
  const [membership] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.userId, req.user!.id));
  if (!membership) { res.status(404).json({ error: "Not in a team" }); return; }
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, membership.teamId));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  res.json(await formatTeam(team));
});

router.get("/teams/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  res.json(await formatTeam(team));
});

router.put("/teams/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  if (team.leaderId !== req.user!.id && req.user!.role !== "coordinator") { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, projectTitle, description } = req.body;
  const [updated] = await db.update(teamsTable).set({ name, projectTitle, description }).where(eq(teamsTable.id, id)).returning();
  res.json(await formatTeam(updated));
});

router.get("/teams/:id/members", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const members = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, id));
  const result = await Promise.all(members.map(async m => {
    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, m.userId));
    return { ...m, user };
  }));
  res.json(result);
});

router.post("/teams/:id/leave", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  if (team.leaderId === req.user!.id) { res.status(400).json({ error: "Team leader cannot leave. Delete the team instead." }); return; }
  await db.delete(teamMembersTable).where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.userId, req.user!.id)));
  res.json({ message: "Left team successfully" });
});

export default router;

