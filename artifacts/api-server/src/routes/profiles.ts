import { Router } from "express";
import type { IRouter } from "express";
import { db, usersTable, studentProfilesTable } from "@workspace/db";
import { eq, gte, ilike, and } from "drizzle-orm";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

function formatProfile(profile: typeof studentProfilesTable.$inferSelect, user: typeof usersTable.$inferSelect) {
  return {
    id: profile.id,
    userId: profile.userId,
    gpa: profile.gpa,
    skills: profile.skills,
    interests: profile.interests,
    description: profile.description,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
  };
}

router.get("/profiles/me", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, req.user!.id));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  res.json(formatProfile(profile, user));
});

router.put("/profiles/me", requireAuth, async (req, res): Promise<void> => {
  const { gpa, skills, interests, description } = req.body;
  let [profile] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, req.user!.id));
  if (!profile) {
    [profile] = await db.insert(studentProfilesTable).values({ userId: req.user!.id, gpa, skills, interests, description }).returning();
  } else {
    [profile] = await db.update(studentProfilesTable)
      .set({ gpa, skills, interests, description })
      .where(eq(studentProfilesTable.userId, req.user!.id))
      .returning();
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  res.json(formatProfile(profile, user));
});

router.get("/profiles/:userId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  const [profile] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, userId));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.json(formatProfile(profile, user));
});

router.get("/profiles", requireAuth, async (req, res): Promise<void> => {
  const { skills, minGpa, search } = req.query as { skills?: string; minGpa?: string; search?: string };

  const profileResults = await db.select().from(studentProfilesTable);
  const userResults = await db.select().from(usersTable).where(eq(usersTable.role, "student"));

  const userMap = new Map(userResults.map(u => [u.id, u]));

  let results = profileResults
    .map(p => {
      const user = userMap.get(p.userId);
      if (!user) return null;
      return formatProfile(p, user);
    })
    .filter(Boolean) as ReturnType<typeof formatProfile>[];

  if (skills) {
    const skillsLower = skills.toLowerCase();
    results = results.filter(r => r.skills?.toLowerCase().includes(skillsLower));
  }
  if (minGpa) {
    const gpaNum = parseFloat(minGpa);
    results = results.filter(r => r.gpa != null && r.gpa >= gpaNum);
  }
  if (search) {
    const searchLower = search.toLowerCase();
    results = results.filter(r => r.user.name.toLowerCase().includes(searchLower));
  }

  res.json(results);
});

export default router;
