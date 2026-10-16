import { useState } from "react";
import { LogIn, LogOut, User as UserIcon, Users, Settings } from "lucide-react";
import { useAuth } from "@/state/auth-state";
import { useSubscription } from "@/state/subscription-state";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthModal } from "./AuthModal";
import { LegacyPracticeRecovery } from "./LegacyPracticeRecovery";

export function AuthButton() {
  const { user, signOut, loading } = useAuth();
  const { isActive } = useSubscription();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  if (loading) {
    return <div className="h-10 w-10 rounded-full border border-border/70 bg-card/60" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:bg-gold/15"
        >
          <LogIn className="h-3 w-3" />
          Sign in
        </button>
        <AuthModal open={open} onOpenChange={setOpen} />
      </>
    );
  }

  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          title={user.email ?? "Account"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 bg-gold/10 font-display text-sm font-semibold text-gold hover:bg-gold/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {initial}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Signed in as
          </DropdownMenuLabel>
          <DropdownMenuItem disabled className="opacity-100">
            <UserIcon className="mr-2 h-3.5 w-3.5" />
            <span className="truncate">{user.email}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setRecoveryOpen(true)}>
            Recover older saves
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => navigate({ to: "/account" })}
            className="font-mono text-xs uppercase tracking-[0.16em]"
          >
            <Settings className="mr-2 h-3.5 w-3.5" />
            Account & Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => navigate({ to: "/team" })}
            className="font-mono text-xs uppercase tracking-[0.16em]"
          >
            <Users className="mr-2 h-3.5 w-3.5" />
            Team workspace
          </DropdownMenuItem>
          {isActive && (
            <DropdownMenuItem
              onSelect={() => navigate({ to: "/family-setup" })}
              className="font-mono text-xs uppercase tracking-[0.16em]"
            >
              <Users className="mr-2 h-3.5 w-3.5" />
              Family Setup
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => signOut()}
            className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <LegacyPracticeRecovery key={user.id} open={recoveryOpen} onOpenChange={setRecoveryOpen} />
    </>
  );
}
