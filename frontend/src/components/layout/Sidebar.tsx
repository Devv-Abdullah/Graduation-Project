import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Users, 
  User, 
  Briefcase, 
  Calendar, 
  Bell, 
  Settings, 
  LogOut,
  Mail,
  UserPlus,
  ClipboardList,
  CheckSquare,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const displayName = user.name?.trim() || "User";
  const displayRole = user.role || "user";
  const userInitial = displayName.charAt(0).toUpperCase();

  const studentLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/my-team", label: "My Team", icon: Users },
    { href: "/teams", label: "Browse Teams", icon: Briefcase },
    { href: "/invitations", label: "Invitations", icon: Mail },
    { href: "/supervisor-requests", label: "Supervisor Requests", icon: UserPlus },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/meetings", label: "Meetings", icon: Calendar },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const supervisorLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teams", label: "My Teams", icon: Users },
    { href: "/tasks", label: "Task Management", icon: CheckSquare },
    { href: "/meetings", label: "Meeting Requests", icon: Calendar },
    { href: "/supervisor-requests", label: "Supervisor Requests", icon: UserPlus },
    { href: "/notifications", label: "Notifications", icon: Bell },
  ];

  const coordinatorLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teams", label: "All Teams", icon: Briefcase },
    { href: "/students", label: "Students", icon: Users },
    { href: "/coordinator", label: "Coordinator Panel", icon: ClipboardList },
    { href: "/notifications", label: "Notifications", icon: Bell },
  ];

  const links = 
    user.role === "student" ? studentLinks :
    user.role === "supervisor" ? supervisorLinks :
    coordinatorLinks;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <Briefcase className="h-6 w-6" />
          <span>GPMS</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {links.map((link) => {
            const isActive = location === link.href || location.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
            {userInitial}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">{displayName}</span>
            <span className="text-xs text-muted-foreground capitalize">{displayRole}</span>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}