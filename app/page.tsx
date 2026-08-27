import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: { absolute: "Danivo CRM — El sistema para tu taller de reparación" },
  description:
    "Gestiona órdenes de reparación, inventario de repuestos, ventas, gastos y garantías desde un solo lugar. Hecho para talleres de celulares y electrónica.",
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <LandingPage />;
}
