
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
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
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
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

  const SidebarContent = () => (
    <div className="flex h-screen flex-col gap-4">
      <div className="px-6 py-4">
        <h2 className="text-2xl font-bold">In2English</h2>
      </div>
      <nav className="flex-1 space-y-2 px-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900",
                isActive(link.href) && "bg-gray-100 text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </a>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-3 py-2">
          <span>{user?.name}</span>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3"
          onClick={() => logoutMutation.mutate()}
        >
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center border-b bg-white px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <div className="ml-4">
          <h2 className="text-lg font-bold">In2English</h2>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={cn("hidden md:block border-r bg-white", className)}>
        <SidebarContent />
      </div>
    </>
  );
}
