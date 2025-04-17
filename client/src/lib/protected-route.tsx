import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type ProtectedRouteProps = {
  path: string;
  component: () => React.JSX.Element;
  allowedRoles?: string[];
};

export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles = [],
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check if user has the required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.userType)) {
    return (
      <Route path={path}>
        {user.userType === "driver" ? (
          <Redirect to="/driver" />
        ) : user.userType === "admin" ? (
          <Redirect to="/admin" />
        ) : (
          <Redirect to="/" />
        )}
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
