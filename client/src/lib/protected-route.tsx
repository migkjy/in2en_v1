import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type Role = "ADMIN" | "TEACHER" | "STUDENT";

export function ProtectedRoute({
  path,
  component: Component,
  allowedRole,
}: {
  path: string;
  component: () => React.JSX.Element;
  allowedRole?: Role | Role[];
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      ) : !user ? (
        <Redirect to="/auth" />
      ) : allowedRole ? (
        Array.isArray(allowedRole) ? (
          allowedRole.includes(user.role as Role) ? (
            <Component />
          ) : (
            <Redirect to="/" />
          )
        ) : (
          user.role === allowedRole ? (
            <Component />
          ) : (
            <Redirect to="/" />
          )
        )
      ) : (
        <Component />
      )}
    </Route>
  );
}