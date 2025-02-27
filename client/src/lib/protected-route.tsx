import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type Role = "ADMIN" | "TEACHER" | "STUDENT";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  allowedRole?: Role | Role[];
}

export function ProtectedRoute({
  path,
  component: Component,
  allowedRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        if (allowedRole) {
          if (Array.isArray(allowedRole)) {
            if (!allowedRole.includes(user.role as Role)) {
              return <Redirect to="/" />;
            }
          } else if (user.role !== allowedRole) {
            return <Redirect to="/" />;
          }
        }

        return <Component />;
      }}
    </Route>
  );
}