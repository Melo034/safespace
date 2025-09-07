import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAdminSession } from "@/hooks/useAdminSession";

type Crumb = { href?: string; label: string };

export default function AdminHeader({
  breadcrumb = [],
  rightExtra,
}: {
  breadcrumb?: Crumb[];
  rightExtra?: React.ReactNode;
}) {
  const { role, profile } = useAdminSession();
  const navigate = useNavigate();

  // Lightweight localStorage cache to avoid header flicker while session/profile loads
  const ADMIN_PROFILE_KEY = "ss.admin.profile";
  const ADMIN_ROLE_KEY = "ss.admin.role";
  const readJSON = (k: string) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; }
  };
  const cachedProfile = (typeof window !== "undefined" ? readJSON(ADMIN_PROFILE_KEY) : null) as
    | { name?: string | null; email?: string | null; avatar_url?: string | null }
    | null;

  const effectiveProfile = profile ?? cachedProfile ?? null;

  useEffect(() => {
    // Persist once we have fresh data
    try {
      if (profile) localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
      if (role) localStorage.setItem(ADMIN_ROLE_KEY, String(role));
    } catch { /* ignore */ }
  }, [profile, role]);

  const rawName = (effectiveProfile?.name || "").trim();
  // Always prefer explicit admin name; never fall back to email display
  const displayName = rawName || "Admin";
  const initials = (displayName || "A")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-14 md:h-16 shrink-0 items-center border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex w-full items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger aria-label="Toggle sidebar" />
          <Separator orientation="vertical" className="mx-2 h-4" />
          {breadcrumb.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumb.map((item, index) => (
                  <span key={index} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                    <BreadcrumbItem className={index < breadcrumb.length - 1 ? "hidden md:block" : ""}>
                      {item.href ? (
                        <BreadcrumbLink className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors" href={item.href}>{item.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="text-xs md:text-sm font-medium text-foreground">{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>

        <div className="flex items-center gap-3">
          {rightExtra}
          <div className="flex items-center gap-3 rounded-full border border-border/60 bg-muted/50 px-3 py-1.5">
            <Avatar className="h-8 w-8 border ring-1 ring-border/40 border-primary">
              <AvatarImage src={effectiveProfile?.avatar_url ?? undefined} alt={displayName} loading="lazy" />
              <AvatarFallback title={displayName}>{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-sm text-muted-foreground font-medium whitespace-nowrap">
              {displayName}{" "}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => navigate("/admin/logout")}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
