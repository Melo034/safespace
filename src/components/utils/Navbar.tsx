import type { ReactNode } from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Menu, User2 } from "lucide-react";
import supabase from "@/server/supabase";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import Logo from "../../assets/safespacelogo.png";

interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: ReactNode;
  items?: MenuItem[];
}

interface NavbarProps {
  logo?: { url: string; src: string; alt: string };
  authProps?: {
    login: { text: string; url: string };
    community?: { text: string; url: string };
    profile?: { text: string; url: string };
    logout?: { text: string; url: string };
  };
}

const AUTH_KEY = "ss.auth";
const MEMBER_LATEST_KEY = "ss.member";
const memberKey = (uid: string) => `ss.member.${uid}`;

function readLS(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLS(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    // intentionally ignore localStorage errors
  }
}

const Navbar = ({
  logo = { url: "/", src: Logo, alt: "logo" },
  authProps = {
    login: { text: "Log in", url: "/auth/login" },
    community: { text: "Join the Community", url: "/auth/signup" },
    profile: { text: "Profile", url: "/account/profile" },
    logout: { text: "Log out", url: "/auth/logout" },
  },
}: NavbarProps) => {
  const [hasScrolled, setHasScrolled] = useState(false);

  // Seed from localStorage to avoid UI flip on first paint
  const seedAuthed = readLS(AUTH_KEY) === "1";
  const seedMember = readLS(MEMBER_LATEST_KEY) === "1";

  const [isAuthed, setIsAuthed] = useState(seedAuthed);
  const [isCommunityMember, setIsCommunityMember] = useState(seedMember);
  const [authReady, setAuthReady] = useState(seedAuthed); // if seeded, treat as ready

  // Header scroll shadow
  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const checkCommunityMember = useCallback(async (userId?: string) => {
    if (!userId) {
      setIsCommunityMember(false);
      writeLS(MEMBER_LATEST_KEY, "0");
      return;
    }

    // Use per-user cache immediately
    const cached = readLS(memberKey(userId));
    if (cached === "1" || cached === "0") {
      const val = cached === "1";
      setIsCommunityMember(val);
      writeLS(MEMBER_LATEST_KEY, val ? "1" : "0");
    }

    // Verify against DB, then refresh cache
    const { data, error } = await supabase
      .from("community_members")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const isMember = !!data && !error;
    setIsCommunityMember(isMember);
    writeLS(memberKey(userId), isMember ? "1" : "0");
    writeLS(MEMBER_LATEST_KEY, isMember ? "1" : "0");
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      const userId = data.session?.user?.id;
      const authed = !!userId;

      setIsAuthed(authed);
      writeLS(AUTH_KEY, authed ? "1" : "0");

      await checkCommunityMember(userId);
      if (alive) setAuthReady(true);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id;
      const authed = !!userId;

      setIsAuthed(authed);
      writeLS(AUTH_KEY, authed ? "1" : "0");

      checkCommunityMember(userId);
      setAuthReady(true);
    });

    // Sync across tabs
    const storageSync = (e: StorageEvent) => {
      if (e.key === AUTH_KEY && e.newValue) setIsAuthed(e.newValue === "1");
      if (e.key === MEMBER_LATEST_KEY && e.newValue) setIsCommunityMember(e.newValue === "1");
    };
    window.addEventListener("storage", storageSync);

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("storage", storageSync);
    };
  }, [checkCommunityMember]);

  const menu: MenuItem[] = useMemo(
    () => [
      { title: "Report Abuse", url: "/report" },
      { title: "Resources", url: "/resources" },
      { title: "Support", url: "/support" },
      { title: "Stories", url: "/stories" },
      { title: "About", url: "/about" },
    ],
    []
  );

  return (
    <section
      className={`py-4 sticky top-0 z-40 w-full bg-white transition-all ${
        hasScrolled ? "border-b border-gray-100 shadow-sm" : "border-b-0"
      }`}
      role="navigation"
      aria-label="Main"
    >
      <div className="container max-w-screen-xl px-5 mx-auto">
        {/* Desktop */}
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link to={logo.url} className="flex items-center gap-2" aria-label="Home">
              <img src={logo.src} className="w-32 h-16 object-contain" alt={logo.alt} />
            </Link>

            <div className="flex items-center font-serif text-neutral-900">
              <NavigationMenu>
                <NavigationMenuList>
                  {menu.map((item) => (
                    <DesktopItem key={item.title} item={item} />
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          <div className="flex gap-2 font-pt-serif">
            {!authReady ? (
              // Reserve space to avoid layout shift
              <div style={{ width: 260, height: 36 }} />
            ) : !isAuthed ? (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link to={authProps.community!.url}>{authProps.community!.text}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={authProps.login.url}>{authProps.login.text}</Link>
                </Button>
              </>
            ) : (
              <>
                {!isCommunityMember && (
                  <Button asChild size="sm" variant="outline">
                    <Link to={authProps.community!.url}>{authProps.community!.text}</Link>
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link to={authProps.profile!.url} aria-label="Profile">
                    <User2 className="mr-1" />
                    {authProps.profile!.text}
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={authProps.logout!.url}>{authProps.logout!.text}</Link>
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Mobile */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Link to={logo.url} className="flex items-center gap-2" aria-label="Home">
              <img src={logo.src} className="w-32 h-12 object-contain" alt={logo.alt} />
            </Link>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto" side="right">
                <SheetHeader>
                  <SheetTitle>
                    <Link to={logo.url} className="flex items-center gap-2" aria-label="Home">
                      <img src={logo.src} className="w-32 h-12 object-contain" alt={logo.alt} />
                    </Link>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-6 p-4">
                  <Accordion type="single" collapsible className="flex w-full flex-col gap-4">
                    {menu.map((item) => (
                      <MobileItem key={item.title} item={item} />
                    ))}
                  </Accordion>

                  <div className="flex flex-col gap-3">
                    {!authReady ? (
                      <div style={{ height: 36 }} />
                    ) : !isAuthed ? (
                      <>
                        <Button asChild size="sm" variant="outline">
                          <Link to={authProps.community!.url}>{authProps.community!.text}</Link>
                        </Button>
                        <Button asChild>
                          <Link to={authProps.login.url}>{authProps.login.text}</Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        {!isCommunityMember && (
                          <Button asChild size="sm" variant="outline">
                            <Link to={authProps.community!.url}>{authProps.community!.text}</Link>
                          </Button>
                        )}
                        <Button asChild size="sm" variant="outline">
                          <Link to={authProps.profile!.url} aria-label="Profile">
                            <User2 className="mr-1" />
                            {authProps.profile!.text}
                          </Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link to={authProps.logout!.url}>{authProps.logout!.text}</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
};

/* =========================
   Subcomponents
   ========================= */

const DesktopItem = ({ item }: { item: MenuItem }) => {
  if (item.items?.length) {
    return (
      <NavigationMenuItem className="text-muted-foreground">
        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent>
          <div className="grid gap-2 p-4 w-[240px] md:w-[300px]">
            {item.items.map((sub) => (
              <NavigationMenuLink key={sub.title} asChild>
                <Link
                  to={sub.url}
                  className="flex flex-row gap-4 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-muted hover:text-accent-foreground"
                >
                  <div>{sub.icon}</div>
                  <div>
                    <div className="text-sm font-semibold">{sub.title}</div>
                    {sub.description && (
                      <p className="text-sm leading-snug text-muted-foreground">{sub.description}</p>
                    )}
                  </div>
                </Link>
              </NavigationMenuLink>
            ))}
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuLink asChild>
        <Link
          to={item.url}
          className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
        >
          {item.title}
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

const MobileItem = ({ item }: { item: MenuItem }) => {
  if (item.items?.length) {
    return (
      <AccordionItem value={item.title} className="border-b-0">
        <AccordionTrigger className="text-md py-0 font-semibold hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2">
          <div className="flex flex-col gap-1">
            {item.items.map((sub) => (
              <Link
                key={sub.title}
                to={sub.url}
                className="flex flex-row gap-4 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-muted hover:text-accent-foreground"
              >
                <div>{sub.icon}</div>
                <div>
                  <div className="text-sm font-semibold">{sub.title}</div>
                  {sub.description && (
                    <p className="text-sm leading-snug text-muted-foreground">{sub.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <Link to={item.url} className="text-md font-semibold">
      {item.title}
    </Link>
  );
};

export default Navbar;
