import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  School,
  GraduationCap,
  BookOpen,
  Upload,
  ClipboardList,
  LogOut,
  User,
  Users,
  GraduationCap as StudentIcon
} from "lucide-react";

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
  ];

  const teacherLinks = [
    { href: "/teacher", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/assignments/create", icon: BookOpen, label: "Create Assignment" },
    { href: "/assignments/upload", icon: Upload, label: "Upload Homework" },
    { href: "/assignments/review", icon: ClipboardList, label: "Review" },
  ];

  const studentLinks = [
    { href: "/student", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/student/assignments", icon: BookOpen, label: "My Assignments" },
  ];

  const links = user?.role === "ADMIN" 
    ? adminLinks 
    : user?.role === "TEACHER" 
    ? teacherLinks 
    : studentLinks;

  return (
    <div className={cn("flex flex-col h-screen bg-sidebar", className)}>
      <div className="flex-1 space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold text-sidebar-foreground">
            English Academy
          </h2>
          <div className="space-y-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive(link.href) ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <link.icon className="mr-2 h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* User profile and logout section */}
      <div className="p-3 border-t border-sidebar-border mt-auto">
        <div className="space-y-2">
          <Link href="/profile">
            <Button variant="ghost" className="w-full justify-start">
              <User className="mr-2 h-4 w-4" />
              {user?.name}
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-500 hover:text-red-600"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}