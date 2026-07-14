"use client";

import { createContext, useContext } from "react";
import type { ShopRole } from "@/lib/types";

interface ShopContextValue {
  shopId: string;
  role: ShopRole;
  isAdmin: boolean;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({
  shopId,
  role,
  children,
}: {
  shopId: string;
  role: ShopRole;
  children: React.ReactNode;
}) {
  return (
    <ShopContext.Provider value={{ shopId, role, isAdmin: role === "admin" }}>
      {children}
    </ShopContext.Provider>
  );
}

/** Current user's shop membership. Only usable inside the (dashboard) tree,
 * which always wraps its children in <ShopProvider>. */
export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within <ShopProvider>");
  return ctx;
}
