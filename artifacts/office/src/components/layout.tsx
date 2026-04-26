import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderKanban,
  PackageSearch,
  Users2,
  Menu,
  CreditCard,
  Calculator,
  Hammer,
  Key,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { AppLogo } from "./AppLogo";
import { TrialBanner } from "./TrialBanner";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/masonry-bid", label: "Masonry Bid", icon: Hammer },
  { href: "/materials", label: "Materials", icon: PackageSearch },
  { href: "/vendors", label: "Vendors", icon: Users2 },
  { href: "/admin/licenses", label: "Licenses", icon: Key },
  { href: "/subscribe", label: "Subscribe", icon: CreditCard },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? location === "/" : location.startsWith(item.href);

        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r bg-background md:flex md:w-64 lg:w-72 flex-col">
        <div className="flex h-14 items-center border-b px-4 lg:px-6">
          <Link href="/">
            <div className="flex items-center gap-2 font-bold text-lg text-primary cursor-pointer">
              <AppLogo size={28} />
              plumb level and Squared
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid items-start px-2 lg:px-4 gap-1">
            <NavLinks />
          </nav>
        </div>
      </aside>

      {/* Mobile + content area */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col w-64 p-0">
              <div className="flex h-14 items-center border-b px-4">
                <div className="flex items-center gap-2 font-bold text-lg text-primary">
                  <AppLogo size={26} />
                  plumb level and Squared
                </div>
              </div>
              <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-2 gap-1">
                  <NavLinks />
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <div className="font-bold text-primary flex-1">
            plumb level and Squared
          </div>
        </header>

        <TrialBanner />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
