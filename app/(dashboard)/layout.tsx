import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ShopProvider } from "@/components/shop/ShopContext";
import type { ShopRole } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("shop_members").select("shop_id, role").eq("user_id", user.id).maybeSingle(),
  ]);

  // Every user should have exactly one shop membership (created by the
  // handle_new_user trigger on signup). If somehow missing — e.g. an
  // account created before the teams migration ran — bounce to login
  // rather than showing a broken, permission-less dashboard.
  if (!membership) redirect("/login?error=no_shop");

  return (
    <ShopProvider shopId={membership.shop_id} role={membership.role as ShopRole}>
      <div className="flex min-h-dvh bg-bg dark:bg-bg-dark">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar userEmail={user.email ?? ""} userName={profile?.full_name ?? ""} />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
        </div>
        <MobileNav />
        <InstallPrompt />
      </div>
    </ShopProvider>
  );
}
