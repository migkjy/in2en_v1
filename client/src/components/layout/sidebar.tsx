
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  School,
  GraduationCap,
  Users,
  BookCheck,
  BookOpen,
  Upload,
  ClipboardList,
  Menu,
} from "lucide-react";
import { StudentIcon } from "@/components/ui/icons";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  const adminLinks = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/branches", icon: School, label: "Branches" },
    { href: "/admin/classes", icon: GraduationCap, label: "Classes" },
    { href: "/admin/teachers", icon: Users, label: "Teachers" },
    { href: "/admin/students", icon: StudentIcon, label: "Students" },
    { href: "/admin/assignments", icon: BookCheck, label: "Assignments" },
  ];

  const teacherLinks = [
    { href: "/teacher", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/teacher/classes", icon: GraduationCap, label: "My Classes" },
    { href: "/teacher/assignments", icon: BookCheck, label: "Assignments" },
    { href: "/teacher/assignments/create", icon: BookOpen, label: "Create Assignment" },
    { href: "/teacher/assignments/upload", icon: Upload, label: "Upload Homework" },
    { href: "/teacher/assignments/review", icon: ClipboardList, label: "Review" },
  ];

  const studentLinks = [
    { href: "/student/assignments", icon: BookOpen, label: "Assignments" },
  ];

  const links = user?.role === "ADMIN"
    ? adminLinks
    : user?.role === "TEACHER"
    ? teacherLinks
    : studentLinks;

  const baseRoute = user?.role?.toLowerCase() || '';

  const NavigationLinks = () => (
    <div className="space-y-4 py-4">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold">In2English</h2>
        <div className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Button
                key={link.href}
                variant={isActive(link.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive(link.href) && "bg-accent"
                )}
                onClick={() => window.location.href = link.href}
              >
                <Icon className="mr-2 h-4 w-4" />
                {link.label}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => logoutMutation.mutate()}
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-50">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0">
          <ScrollArea className="h-full">
            <NavigationLinks />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn("hidden md:block border-r h-screen", className)}>
        <ScrollArea className="h-full">
          <NavigationLinks />
        </ScrollArea>
      </div>
    </>
  );
}
