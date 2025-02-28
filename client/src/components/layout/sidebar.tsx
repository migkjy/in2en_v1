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
  GraduationCap as StudentIcon,
  BookCheck
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
    { href: "/admin/assignments", icon: BookCheck, label: "Assignments" },
  ];

  const teacherLinks = [
    { href: "/teacher", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/teacher/classes", icon: GraduationCap, label: "My Classes" }, // Added Classes link
    { href: "/teacher/assignments", icon: BookCheck, label: "Assignments" },
    { href: "/teacher/assignments/create", icon: BookOpen, label: "Create Assignment" },
    { href: "/teacher/assignments/upload", icon: Upload, label: "Upload Homework" },
    { href: "/teacher/assignments/review", icon: ClipboardList, label: "Review" },
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
    <div className={cn(
      "flex flex-col h-screen bg-white border-r border-gray-100 shadow-sm",
      className
    )}>
      <div className="flex-1 space-y-2 py-6">
        <div className="px-3 py-2">
          <h2 className="mb-6 px-4 text-xl font-semibold tracking-tight text-gray-900">
            In2English
          </h2>
          <div className="space-y-1.5">
            {links.map((link) => (
              // Hide upload homework link
              link.label !== "Upload Homework" && (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive(link.href) ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start text-sm font-medium transition-colors",
                      "hover:bg-gray-100/80",
                      isActive(link.href)
                        ? "bg-gray-100/90 text-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <link.icon className="mr-3 h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              )
            ))}
          </div>
        </div>
      </div>

      {/* User profile and logout section */}
      <div className="p-4 border-t border-gray-100 mt-auto bg-gray-50/50">
        <div className="space-y-2">
          <Link href="/profile">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm hover:bg-gray-100/80"
            >
              <User className="mr-3 h-4 w-4" />
              {user?.name}
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}