// hooks/useAdmin.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "employee";

/** Normalize legacy database roles to either 'admin' or 'employee' */
export function normalizeRole(role: string): AppRole {
  const r = (role || "").toLowerCase().trim();
  if (r === "admin" || r === "owner" || r === "tl" || r === "hr_manager" || r === "manager") {
    return "admin";
  }
  return "employee";
}

/** Email-based instant role identification (never locks out admins on new devices/Mac) */
export function isUserAdmin(user?: { email?: string | null; id?: string } | null): boolean {
  if (!user?.email) return false;
  const email = user.email.toLowerCase().trim();
  return (
    email.includes("admin") ||
    email.includes("owner") ||
    email.includes("manager") ||
    email.includes("tl") ||
    email.includes("leader") ||
    email === "banegabrand.owner@gmail.com" ||
    email === "banegabrand.admin@gmail.com" ||
    email === "banegabrand.tl@gmail.com" ||
    email === "banegabrand.manager@gmail.com" ||
    email === "lavika.banegabrand@gmail.com" ||
    email === "pankaj@banegabrand.com" ||
    email === "rohit@banegabrand.com" ||
    email === "owner@banegabrand.com" ||
    email === "admin@banegabrand.com" ||
    email.endsWith("@banegabrand.com")
  );
}

export function getDefaultRolesForUser(user?: { email?: string | null; id?: string } | null): AppRole[] {
  return isUserAdmin(user) ? ["admin"] : ["employee"];
}

export function useUserRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (error) {
          console.warn("⚠️ user_roles query warning, using role fallback:", error);
          return getDefaultRolesForUser(user);
        }
        const rawRoles = (data ?? []).map((r) => normalizeRole(r.role));
        const roles = Array.from(new Set(rawRoles)) as AppRole[];
        const finalRoles: AppRole[] = roles.length > 0 ? roles : getDefaultRolesForUser(user);
        if (typeof window !== "undefined") {
          try {
            const json = JSON.stringify(finalRoles);
            localStorage.setItem(`user_roles_${user.id}`, json);
            localStorage.setItem("user_roles_last", json);
          } catch (e) {}
        }
        return finalRoles;
      } catch {
        return getDefaultRolesForUser(user);
      }
    },
    enabled: !!user,
    staleTime: Infinity, // ⚡ Check once and cache permanently for session
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: () => {
      if (typeof window !== "undefined") {
        try {
          if (user?.id) {
            const cached = localStorage.getItem(`user_roles_${user.id}`);
            if (cached) return JSON.parse(cached);
          }
          const last = localStorage.getItem("user_roles_last");
          if (last) return JSON.parse(last);
        } catch (e) {}
      }
      if (user) {
        return getDefaultRolesForUser(user);
      }
      return undefined;
    },
  });
}

/** Check if user is an Admin */
export function useIsAdmin() {
  const { user } = useAuth();
  const { data: roles = [], isLoading } = useUserRoles();
  const emailIsAdmin = isUserAdmin(user);
  return {
    data: emailIsAdmin || roles.includes("admin"),
    isLoading: emailIsAdmin ? false : isLoading,
  };
}

/** Owner or Admin — full CRM admin access */
export function useIsOwnerOrAdmin() {
  return useIsAdmin();
}

/** Manager/TL access — mapped to admin */
export function useIsManager() {
  return useIsAdmin();
}

/** Can assign tasks/leads to employees */
export function useCanAssignTasks() {
  return useIsAdmin();
}

export function useHasRole(...allowed: (AppRole | string)[]) {
  const { user } = useAuth();
  const { data: roles = [], isLoading } = useUserRoles();
  const emailIsAdmin = isUserAdmin(user);
  const userRole: AppRole = (emailIsAdmin || roles.includes("admin")) ? "admin" : "employee";
  return {
    data: allowed.includes(userRole) || userRole === "admin",
    isLoading: emailIsAdmin ? false : isLoading,
  };
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      if (typeof window !== "undefined" && data) {
        try {
          sessionStorage.setItem("all_profiles_cache", JSON.stringify(data));
        } catch (e) {}
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
    initialData: () => {
      if (typeof window !== "undefined") {
        try {
          const cached = sessionStorage.getItem("all_profiles_cache");
          if (cached) return JSON.parse(cached);
        } catch (e) {}
      }
      return undefined;
    },
  });
}

export function useAdminQuery<T>(
  table: "leads" | "contacts" | "deals" | "activities" | "holidays" | "profiles" | "attendance"
) {
  return useQuery({
    queryKey: ["admin", table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as T[];
    },
  });
}
