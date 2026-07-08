import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export function AuthDialog({ trigger }: { trigger: React.ReactNode }) {
  const { login, register } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!username || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password);
      setOpen(false);
      setUsername("");
      setPassword("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to Idle Compute Co-op</DialogTitle>
          <DialogDescription>Log in to register machines, join co-op groups, and see your earnings.</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">
              Log in
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1">
              Sign up
            </TabsTrigger>
          </TabsList>
          <TabsContent value={mode} className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="authUsername">Username</Label>
              <Input id="authUsername" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. aditya" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="authPassword">Password</Label>
              <Input
                id="authPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 4 characters"
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting || !username || !password}>
            {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
