import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Menu, MoonStar, SunMedium, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/branding/BrandMark";
import { Button } from "@/components/ui/button";
import {
  useCurrentUserProfile,
  useSyncUserProfile,
} from "@/hooks/use-user-profile";
import { en } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

const publicLinks = [
  { to: "/listings", label: en.nav.listings },
  { to: "/compare", label: en.nav.compare },
  { to: "/news", label: en.nav.news },
  { to: "/sellers", label: en.nav.sellers },
] as const;

const navLinkClass =
  "rounded-full px-3 py-2 text-sm font-semibold tracking-wide text-muted-foreground transition-all hover:bg-accent/70 hover:text-accent-foreground";
const navActiveClass =
  "rounded-full bg-primary px-3 py-2 text-sm font-semibold tracking-wide text-primary-foreground shadow-[0_16px_30px_-24px_rgba(7,11,21,0.9)]";
const themeStorageKey = "titeet-theme";

type ThemeMode = "light" | "dark";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [themeReady, setThemeReady] = useState(false);
  const user = useCurrentUserProfile();
  useSyncUserProfile();

  const roleLinks = useMemo(() => {
    if (!user) return [];
    const links = [{ to: "/dashboard", label: en.nav.dashboard }];

    if (user.role === "buyer") {
      links.push({ to: "/seller/apply", label: en.nav.applySeller });
    }

    if (user.role === "seller" || user.role === "admin") {
      links.push({ to: "/seller/dashboard", label: en.nav.seller });
    }

    if (user.role === "admin") {
      links.push({ to: "/admin", label: en.nav.admin });
    }

    return links;
  }, [user]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const darkMode = document.documentElement.classList.contains("dark");
    setTheme(darkMode ? "dark" : "light");
    setThemeReady(true);
  }, []);

  const applyTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);

    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(themeStorageKey, nextTheme);
    }
  };

  const toggleTheme = () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[1.7rem] border border-border/70 bg-card/70 shadow-[0_26px_60px_-44px_rgba(8,16,35,0.9)] backdrop-blur-xl">
        <div className="flex h-[4.3rem] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="group inline-flex items-center gap-3">
              <BrandMark className="size-10" />
              <span className="flex flex-col">
                <span className="font-display text-lg font-semibold leading-none">
                  {en.brand.name}
                </span>
                <span className="hidden text-xs font-medium tracking-wide text-muted-foreground sm:inline">
                  {en.brand.tagline}
                </span>
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-background/65 p-1 md:flex">
            {publicLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={navLinkClass}
                activeProps={{
                  className: navActiveClass,
                }}
              >
                {link.label}
              </Link>
            ))}
            {roleLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={navLinkClass}
                activeProps={{
                  className: navActiveClass,
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggleButton
              theme={theme}
              disabled={!themeReady}
              onToggle={toggleTheme}
            />
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="sm">Sign in</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="rounded-full border border-border/70 bg-background/70 p-1 shadow-[0_12px_28px_-22px_rgba(6,12,24,0.9)]">
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </div>

          <button
            className="rounded-xl border border-border/60 bg-background/60 p-2 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle menu"
            type="button"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-border/70 px-4 pb-4 pt-3 md:hidden">
            <div className="grid gap-1">
              {[...publicLinks, ...roleLinks].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={navLinkClass}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-3 py-2">
              <span className="text-[0.65rem] font-semibold tracking-[0.3em] text-muted-foreground">
                THEME
              </span>
              <ThemeToggleButton
                theme={theme}
                disabled={!themeReady}
                onToggle={toggleTheme}
                className="h-8 w-8"
              />
            </div>
            <div className="mt-4 border-t border-border/70 pt-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button className="w-full">Sign in</Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="flex justify-center rounded-2xl border border-border/70 bg-background/60 py-2">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function ThemeToggleButton({
  theme,
  onToggle,
  disabled,
  className,
}: {
  theme: ThemeMode;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground shadow-[0_14px_32px_-26px_rgba(7,12,22,0.95)] transition-all hover:bg-accent/65 hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      <SunMedium
        className={cn(
          "size-4 transition-all duration-300",
          dark
            ? "scale-0 -rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100",
        )}
      />
      <MoonStar
        className={cn(
          "absolute size-4 transition-all duration-300",
          dark
            ? "scale-100 rotate-0 opacity-100"
            : "scale-0 rotate-90 opacity-0",
        )}
      />
    </button>
  );
}
