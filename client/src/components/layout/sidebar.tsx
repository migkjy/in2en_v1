import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Menu,
  BookCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GraduationCap as StudentIcon } from "lucide-react";

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
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            In2English
          </h2>
          <div className="space-y-1">
            {links.map((link) => (
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
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto px-3 py-2 border-t">
        <div className="space-y-1">
          <Link href={`/${baseRoute}/profile`}>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm hover:bg-gray-100/80"
            >
              <User className="mr-3 h-4 w-4" />
              {user?.name || '사용자'}
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-3 h-4 w-4" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-screen overflow-hidden"> {/* Added overflow-hidden */}
        {/* Mobile Sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden fixed top-4 right-4 z-50">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            <div className="p-4 border-b">
              <Link href="/">
                <h1 className="text-xl font-bold">In2English</h1>
              </Link>
            </div>
            <NavigationLinks />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <div className={cn(
          "hidden md:flex md:w-64 md:flex-col bg-white border-r shadow-sm",
          className
        )}>
          <div className="p-4 border-b">
            <Link href="/">
              <h1 className="text-xl font-bold">In2English</h1>
            </Link>
          </div>
          <NavigationLinks />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6"> {/* Added padding */}
          {/* Your main content here */}
        </main>
      </div>
    </>
  );
}