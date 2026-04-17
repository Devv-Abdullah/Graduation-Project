import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-card px-6">
          <h1 className="text-lg font-semibold">{title || "Graduation Project Management"}</h1>
          <div className="flex items-center gap-4">
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}