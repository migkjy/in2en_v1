
import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar } from "@/components/layout/sidebar";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function MobileLayout({ children, title }: MobileLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  if (!isMobile) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b bg-white shadow-sm z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-medium">{title || 'In2English'}</h1>
        <div className="w-9"></div> {/* Spacer for alignment */}
      </header>
      
      {/* Mobile sidebar */}
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      >
        <div 
          className={cn(
            "fixed top-0 left-0 h-full w-[75%] max-w-xs bg-white shadow-xl transition-transform duration-300 z-50",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Sidebar className="w-full border-none shadow-none" />
        </div>
      </div>
      
      <main className="flex-1 overflow-auto p-4">
        {children}
      </main>
    </div>
  );
}
