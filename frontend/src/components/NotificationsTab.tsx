import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { Bell, Mail, ShieldAlert, UserMinus } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  GROUP_INVITE: <Mail className="size-4" />,
  RULE_VIOLATION_WARNING: <ShieldAlert className="size-4 text-amber-500" />,
  REMOVED_FROM_GROUP: <UserMinus className="size-4 text-red-500" />,
  INVITE_ACCEPTED: <Bell className="size-4" />,
};

export function NotificationsTab() {
  const notifications = usePolling(useCallback(() => api.listNotifications(), []), 3000);
  const list = notifications.data ?? [];

  async function handleRespond(inviteId: string, accept: boolean) {
    await api.respondToInvite(inviteId, accept);
  }

  async function handleMarkRead(id: string) {
    await api.markNotificationRead(id);
  }

  return (
    <div className="flex flex-col gap-3">
      {list.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
      {list.map((n) => (
        <Card key={n.id} className={n.read ? "opacity-60" : undefined}>
          <CardContent className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="flex items-center gap-2">
              {ICONS[n.type] ?? <Bell className="size-4" />}
              {n.message}
              {!n.read && <Badge variant="outline">new</Badge>}
            </span>
            <span className="flex items-center gap-2">
              {n.type === "GROUP_INVITE" && n.inviteId && (
                <>
                  <Button size="sm" onClick={() => handleRespond(n.inviteId!, true)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRespond(n.inviteId!, false)}>
                    Decline
                  </Button>
                </>
              )}
              {!n.read && n.type !== "GROUP_INVITE" && (
                <Button size="sm" variant="outline" onClick={() => handleMarkRead(n.id)}>
                  Mark read
                </Button>
              )}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
