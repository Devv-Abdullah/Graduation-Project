import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { User } from "@workspace/api-client-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  const [localUser, setLocalUser] = useState<User | null>(null);

  useEffect(() => {
    if (user) {
      setLocalUser(user);
    } else if (error) {
      setLocalUser(null);
    }
  }, [user, error]);

  const logout = () => {
    setLocalUser(null);
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    setLocation("/login");
  };

  const isAuthPage = location === "/login" || location === "/register";

  useEffect(() => {
    if (!isLoading) {
      if (!localUser && !isAuthPage) {
        setLocation("/login");
      } else if (localUser && isAuthPage) {
        setLocation("/dashboard");
      }
    }
  }, [localUser, isLoading, location, isAuthPage, setLocation]);

  return (
    <AuthContext.Provider value={{ user: localUser, isLoading, logout, setUser: setLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}