import { Router } from "express";
import { prisma } from "../db.ts";
import { requireAuth } from "../middleware/auth.ts";
import { evaluateGroupRules } from "../services/groupRules.ts";

export const groupsRouter = Router();

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

async function roleOfUserInGroup(userId: string, groupId: string): Promise<"ADMIN" | "MODERATOR" | null> {
  const memberProvider = await prisma.provider.findFirst({
    where: { ownerId: userId, groupId, groupRole: { in: ["ADMIN", "MODERATOR"] } },
  });
  return (memberProvider?.groupRole as "ADMIN" | "MODERATOR" | undefined) ?? null;
}

async function notify(userId: string, type: string, message: string, extra?: { groupId?: string; inviteId?: string }) {
  await prisma.notification.create({ data: { userId, type, message, ...extra } });
}

groupsRouter.get("/groups", async (_req, res) => {
  const groups = await prisma.coopGroup.findMany({
    include: { rule: true, providers: true },
    orderBy: { createdAt: "desc" },
  });

  const since = new Date(Date.now() - MS_PER_WEEK);
  const result = await Promise.all(
    groups.map(async (g) => {
      const memberIds = g.providers.map((p) => p.id);
      let avgWeeklyEarningsPerMachine = 0;
      if (memberIds.length > 0) {
        const earnings = await prisma.ledgerEntry.aggregate({
          where: { providerId: { in: memberIds }, type: "EARNING", createdAt: { gte: since } },
          _sum: { amount: true },
        });
        avgWeeklyEarningsPerMachine = (earnings._sum.amount ?? 0) / memberIds.length;
      }
      return {
        id: g.id,
        name: g.name,
        visibility: g.visibility,
        createdAt: g.createdAt,
        rule: g.rule,
        memberCount: memberIds.length,
        avgWeeklyEarningsPerMachine: Number(avgWeeklyEarningsPerMachine.toFixed(4)),
      };
    })
  );
  res.json(result);
});

// GET /groups/:id is usable without auth for browsing; only invite visibility needs auth context.
groupsRouter.get("/groups/:id", async (req, res) => {
  const group = await prisma.coopGroup.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      rule: true,
      providers: { include: { memberships: { where: { status: "ACTIVE" }, take: 1, orderBy: { joinedAt: "desc" } } } },
    },
  });
  if (!group) return res.status(404).json({ error: "not found" });

  const members = group.providers.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.groupRole,
    reliabilityScore: p.reliabilityScore,
    strikeCount: p.memberships[0]?.strikeCount ?? 0,
    joinedAt: p.memberships[0]?.joinedAt ?? null,
  }));

  let pendingInvites: unknown[] = [];
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { getSessionUser } = await import("../services/auth.ts");
    const user = await getSessionUser(authHeader.slice(7).trim());
    if (user) {
      const role = await roleOfUserInGroup(user.id, group.id);
      if (role) {
        pendingInvites = await prisma.groupInvite.findMany({
          where: { groupId: group.id, status: "PENDING" },
          include: { provider: { select: { id: true, name: true, machineCode: true } } },
        });
      }
    }
  }

  res.json({ id: group.id, name: group.name, visibility: group.visibility, createdAt: group.createdAt, rule: group.rule, members, pendingInvites });
});

groupsRouter.post("/groups", requireAuth, async (req, res) => {
  const { name, visibility, founderProviderId, rules } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name is required" });
  if (!founderProviderId) return res.status(400).json({ error: "founderProviderId is required" });
  if (!["OPEN", "INVITE_ONLY"].includes(visibility)) return res.status(400).json({ error: "invalid visibility" });

  const provider = await prisma.provider.findUnique({ where: { id: founderProviderId } });
  if (!provider || provider.ownerId !== req.user!.id) return res.status(404).json({ error: "machine not found" });
  if (provider.groupId) return res.status(400).json({ error: "this machine is already in a group" });

  const group = await prisma.coopGroup.create({
    data: {
      name,
      visibility,
      rule: rules
        ? {
            create: {
              minReliability: rules.minReliability ?? null,
              minJobsCompleted: rules.minJobsCompleted ?? null,
              minCpuCores: rules.minCpuCores ?? null,
              minRamGb: rules.minRamGb ?? null,
              requiresGpu: rules.requiresGpu ?? null,
              minAccountAgeDays: rules.minAccountAgeDays ?? null,
              minAvgJobsPerWeek: rules.minAvgJobsPerWeek ?? null,
              minUptimePct: rules.minUptimePct ?? null,
            },
          }
        : undefined,
    },
    include: { rule: true },
  });

  await prisma.$transaction([
    prisma.provider.update({ where: { id: provider.id }, data: { groupId: group.id, groupRole: "ADMIN" } }),
    prisma.groupMembership.create({ data: { groupId: group.id, providerId: provider.id, role: "ADMIN", status: "ACTIVE" } }),
  ]);

  res.status(201).json(group);
});

groupsRouter.patch("/groups/:id/rules", requireAuth, async (req, res) => {
  const role = await roleOfUserInGroup(req.user!.id, (req.params.id as string));
  if (role !== "ADMIN") return res.status(403).json({ error: "only the group admin can edit rules" });

  const rules = req.body ?? {};
  const rule = await prisma.groupRule.upsert({
    where: { groupId: (req.params.id as string) },
    create: {
      groupId: (req.params.id as string),
      minReliability: rules.minReliability ?? null,
      minJobsCompleted: rules.minJobsCompleted ?? null,
      minCpuCores: rules.minCpuCores ?? null,
      minRamGb: rules.minRamGb ?? null,
      requiresGpu: rules.requiresGpu ?? null,
      minAccountAgeDays: rules.minAccountAgeDays ?? null,
      minAvgJobsPerWeek: rules.minAvgJobsPerWeek ?? null,
      minUptimePct: rules.minUptimePct ?? null,
    },
    update: {
      minReliability: rules.minReliability ?? null,
      minJobsCompleted: rules.minJobsCompleted ?? null,
      minCpuCores: rules.minCpuCores ?? null,
      minRamGb: rules.minRamGb ?? null,
      requiresGpu: rules.requiresGpu ?? null,
      minAccountAgeDays: rules.minAccountAgeDays ?? null,
      minAvgJobsPerWeek: rules.minAvgJobsPerWeek ?? null,
      minUptimePct: rules.minUptimePct ?? null,
    },
  });
  res.json(rule);
});

groupsRouter.post("/groups/:id/members/:providerId/role", requireAuth, async (req, res) => {
  const role = await roleOfUserInGroup(req.user!.id, (req.params.id as string));
  if (role !== "ADMIN") return res.status(403).json({ error: "only the group admin can change roles" });

  const { role: newRole } = req.body ?? {};
  if (!["MODERATOR", "MEMBER"].includes(newRole)) return res.status(400).json({ error: "invalid role" });

  const target = await prisma.provider.findUnique({ where: { id: (req.params.providerId as string) } });
  if (!target || target.groupId !== (req.params.id as string)) return res.status(404).json({ error: "member not found" });
  if (target.groupRole === "ADMIN") return res.status(400).json({ error: "cannot change the admin's role" });

  const updated = await prisma.provider.update({ where: { id: target.id }, data: { groupRole: newRole } });
  res.json(updated);
});

groupsRouter.post("/groups/:id/members/:providerId/remove", requireAuth, async (req, res) => {
  const role = await roleOfUserInGroup(req.user!.id, (req.params.id as string));
  if (!role) return res.status(403).json({ error: "only the group admin/moderator can remove members" });

  const target = await prisma.provider.findUnique({ where: { id: (req.params.providerId as string) } });
  if (!target || target.groupId !== (req.params.id as string)) return res.status(404).json({ error: "member not found" });
  if (target.groupRole === "ADMIN") return res.status(400).json({ error: "cannot remove the group admin" });

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId: (req.params.id as string), providerId: target.id, status: "ACTIVE" },
    orderBy: { joinedAt: "desc" },
  });

  await prisma.$transaction([
    prisma.provider.update({ where: { id: target.id }, data: { groupId: null, groupRole: null } }),
    ...(membership
      ? [prisma.groupMembership.update({ where: { id: membership.id }, data: { status: "REMOVED", endedAt: new Date() } })]
      : []),
  ]);

  if (target.ownerId) {
    await notify(target.ownerId, "REMOVED_FROM_GROUP", `${target.name} was removed from a co-op group.`, { groupId: (req.params.id as string) });
  }
  res.status(204).end();
});

groupsRouter.post("/groups/:id/leave", requireAuth, async (req, res) => {
  const { providerId } = req.body ?? {};
  if (!providerId) return res.status(400).json({ error: "providerId is required" });

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider || provider.ownerId !== req.user!.id) return res.status(404).json({ error: "machine not found" });
  if (provider.groupId !== (req.params.id as string)) return res.status(400).json({ error: "this machine is not in that group" });

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId: req.params.id as string, providerId: provider.id, status: "ACTIVE" },
    orderBy: { joinedAt: "desc" },
  });

  const ops = [
    prisma.provider.update({ where: { id: provider.id }, data: { groupId: null, groupRole: null } }),
    ...(membership
      ? [prisma.groupMembership.update({ where: { id: membership.id }, data: { status: "LEFT", endedAt: new Date() } })]
      : []),
  ];

  // If the admin leaves, promote the earliest-joined moderator; otherwise the group is left without an admin.
  if (provider.groupRole === "ADMIN") {
    const nextAdmin = await prisma.provider.findFirst({
      where: { groupId: req.params.id as string, groupRole: "MODERATOR", id: { not: provider.id } },
      orderBy: { createdAt: "asc" },
    });
    if (nextAdmin) ops.push(prisma.provider.update({ where: { id: nextAdmin.id }, data: { groupRole: "ADMIN" } }));
  }

  await prisma.$transaction(ops);
  res.status(204).end();
});

groupsRouter.post("/groups/:id/join", requireAuth, async (req, res) => {
  const { providerId } = req.body ?? {};
  if (!providerId) return res.status(400).json({ error: "providerId is required" });

  const group = await prisma.coopGroup.findUnique({ where: { id: (req.params.id as string) }, include: { rule: true } });
  if (!group) return res.status(404).json({ error: "group not found" });

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider || provider.ownerId !== req.user!.id) return res.status(404).json({ error: "machine not found" });
  if (provider.groupId) return res.status(400).json({ error: "this machine is already in a group" });

  if (group.visibility === "INVITE_ONLY") {
    return res.status(403).json({ error: "this group is invite-only" });
  }

  const evaluation = evaluateGroupRules(provider, group.rule);
  if (!evaluation.passed) {
    return res.status(400).json({ error: "does not meet group join rules", failures: evaluation.failures });
  }

  await prisma.$transaction([
    prisma.provider.update({ where: { id: provider.id }, data: { groupId: group.id, groupRole: "MEMBER" } }),
    prisma.groupMembership.create({ data: { groupId: group.id, providerId: provider.id, role: "MEMBER", status: "ACTIVE" } }),
  ]);

  res.status(201).json({ joined: true });
});

groupsRouter.post("/groups/:id/invite", requireAuth, async (req, res) => {
  const role = await roleOfUserInGroup(req.user!.id, (req.params.id as string));
  if (!role) return res.status(403).json({ error: "only the group admin/moderator can invite" });

  const { machineCode } = req.body ?? {};
  if (!machineCode) return res.status(400).json({ error: "machineCode is required" });

  const provider = await prisma.provider.findUnique({ where: { machineCode } });
  if (!provider) return res.status(404).json({ error: "no machine found with that ID" });
  if (provider.groupId) return res.status(400).json({ error: "that machine is already in a group" });
  if (!provider.ownerId) return res.status(400).json({ error: "that machine has no owner to notify" });

  const invitedByProvider = await prisma.provider.findFirst({ where: { ownerId: req.user!.id, groupId: (req.params.id as string) } });

  const invite = await prisma.groupInvite.create({
    data: { groupId: (req.params.id as string), providerId: provider.id, invitedByProviderId: invitedByProvider?.id ?? null },
  });

  const group = await prisma.coopGroup.findUnique({ where: { id: (req.params.id as string) } });
  await notify(
    provider.ownerId,
    "GROUP_INVITE",
    `${invitedByProvider?.name ?? "A co-op group"} invited your machine "${provider.name}" to join "${group?.name}".`,
    { groupId: (req.params.id as string), inviteId: invite.id }
  );

  res.status(201).json(invite);
});

groupsRouter.post("/invites/:id/respond", requireAuth, async (req, res) => {
  const { accept } = req.body ?? {};
  const invite = await prisma.groupInvite.findUnique({
    where: { id: (req.params.id as string) },
    include: { provider: true, group: { include: { rule: true } } },
  });
  if (!invite) return res.status(404).json({ error: "invite not found" });
  if (invite.provider.ownerId !== req.user!.id) return res.status(403).json({ error: "not your machine" });
  if (invite.status !== "PENDING") return res.status(400).json({ error: "invite already responded to" });

  if (!accept) {
    await prisma.groupInvite.update({ where: { id: invite.id }, data: { status: "DECLINED", respondedAt: new Date() } });
    return res.json({ accepted: false });
  }

  if (invite.provider.groupId) {
    return res.status(400).json({ error: "this machine is already in a group" });
  }
  const evaluation = evaluateGroupRules(invite.provider, invite.group.rule);
  if (!evaluation.passed) {
    return res.status(400).json({ error: "no longer meets this group's join rules", failures: evaluation.failures });
  }

  await prisma.$transaction([
    prisma.groupInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED", respondedAt: new Date() } }),
    prisma.provider.update({ where: { id: invite.providerId }, data: { groupId: invite.groupId, groupRole: "MEMBER" } }),
    prisma.groupMembership.create({ data: { groupId: invite.groupId, providerId: invite.providerId, role: "MEMBER", status: "ACTIVE" } }),
  ]);

  res.json({ accepted: true });
});

groupsRouter.get("/notifications", requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(notifications);
});

groupsRouter.post("/notifications/:id/read", requireAuth, async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: (req.params.id as string) } });
  if (!notification || notification.userId !== req.user!.id) return res.status(404).json({ error: "not found" });
  const updated = await prisma.notification.update({ where: { id: (req.params.id as string) }, data: { read: true } });
  res.json(updated);
});
