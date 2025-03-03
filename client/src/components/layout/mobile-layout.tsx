
import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  BookOpen, 
  User, 
  LogOut, 
  Home,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  backPath?: string;
}

export function MobileLayout({ children, title, backPath }: MobileLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  
  if (!user) return null;

  return (
    <div className="flex flex-col h-screen">
      {/* Mobile header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 h-14">
          {backPath ? (
            <Link href={backPath}>
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <div className="font-bold text-lg">English Academy</div>
          )}
          
          {title && <h1 className="text-lg font-medium">{title}</h1>}
          
          <div className="flex items-center">
            <Link href="/student/profile">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16">
        {children}
      </main>

      {/* Mobile navigation */}
      <nav className="bg-white border-t fixed bottom-0 w-full">
        <div className="flex justify-around items-center h-16">
          <Link href="/student/assignments">
            <Button
              variant="ghost"
              className={`flex flex-col items-center justify-center h-14 w-full ${
                location.includes("/student/assignments") ? "text-primary" : "text-gray-500"
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs mt-1">Assignments</span>
            </Button>
          </Link>
          
          <Link href="/student/classes">
            <Button
              variant="ghost"
              className={`flex flex-col items-center justify-center h-14 w-full ${
                location.includes("/student/classes") ? "text-primary" : "text-gray-500"
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">Classes</span>
            </Button>
          </Link>
          
          <Link href="/student/profile">
            <Button
              variant="ghost"
              className={`flex flex-col items-center justify-center h-14 w-full ${
                location === "/student/profile" ? "text-primary" : "text-gray-500"
              }`}
            >
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Profile</span>
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center h-14 w-full text-gray-500"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            <span className="text-xs mt-1">Logout</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
