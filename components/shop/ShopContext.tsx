"use client";

import { createContext, useContext, useMemo } from "react";
import type { ShopRole } from "@/lib/types";
import {
  resolveAccess,
  type ShopSubscription,
  type SubscriptionAccess,
} from "@/lib/subscription";

interface ShopContextValue {
  shopId: string;
  role: ShopRole;
  isAdmin: boolean;
  subscription: ShopSubscription;
  access: SubscriptionAccess;
  /** atajo de access.writable === false — el taller está en solo lectura */
  readOnly: boolean;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({
  shopId,
  role,
  subscription,
  children,
}: {
  shopId: string;
  role: ShopRole;
  subscription: ShopSubscription;
  children: React.ReactNode;
}) {
  const value = useMemo<ShopContextValue>(() => {
    const access = resolveAccess(subscription);
    return {
      shopId,
      role,
      isAdmin: role === "admin",
      subscription,
      access,
      readOnly: !access.writable,
    };
  }, [shopId, role, subscription]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

/** Current user's shop membership. Only usable inside the (dashboard) tree,
 * which always wraps its children in <ShopProvider>. */
export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within <ShopProvider>");
  return ctx;
}
