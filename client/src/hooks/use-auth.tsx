import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { InsertUser, LoginData, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Define AuthContext type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: {
    mutate: (data: LoginData) => void;
    isPending: boolean;
  };
  registerMutation: {
    mutate: (data: InsertUser) => void;
    isPending: boolean;
  };
  logoutMutation: {
    mutate: () => void;
    isPending: boolean;
  };
};

// Create a new context
export const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get user data
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json() as User;
    },
    onSuccess: (user: User) => {
      console.log("Login successful for user:", user);
      
      // Update query cache with user data
      queryClient.setQueryData<User>(["/api/user"], user);
      
      // Show success toast
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.fullName}!`,
      });
      
      // Use a slight delay to ensure state is properly updated
      setTimeout(() => {
        // Redirect based on user type - use window.location for more reliable redirection
        console.log(`Redirecting user with type: ${user.userType} using window.location.href`);
        if (user.userType === "driver") {
          window.location.href = "/driver";
        } else if (user.userType === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json() as User;
    },
    onSuccess: (user: User) => {
      console.log("Registration successful for user:", user);
      
      // Update query cache with user data
      queryClient.setQueryData<User>(["/api/user"], user);
      
      // Show success toast
      toast({
        title: "Registration successful",
        description: `Welcome to LogiTech, ${user.fullName}!`,
      });
      
      // Use a slight delay to ensure state is properly updated
      setTimeout(() => {
        // Redirect based on user type - use window.location for more reliable redirection
        console.log(`Redirecting user with type: ${user.userType} using window.location.href`);
        if (user.userType === "driver") {
          window.location.href = "/driver";
        } else if (user.userType === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      console.log("Logout successful");
      
      // Clear user data from query cache
      queryClient.setQueryData<User | null>(["/api/user"], null);
      
      // Show success toast
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      
      // Use a slight delay to ensure state is properly updated
      setTimeout(() => {
        // Redirect to auth page - use window.location for more reliable redirection
        console.log("Redirecting to auth page using window.location.href");
        window.location.href = "/auth";
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create context value with proper type handling
  const userValue = user ? user : null;

  const value: AuthContextType = {
    user: userValue,
    isLoading,
    error,
    loginMutation: {
      mutate: loginMutation.mutate,
      isPending: loginMutation.isPending,
    },
    registerMutation: {
      mutate: registerMutation.mutate,
      isPending: registerMutation.isPending,
    },
    logoutMutation: {
      mutate: logoutMutation.mutate,
      isPending: logoutMutation.isPending,
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}