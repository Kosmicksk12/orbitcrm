import { WarrantyClient } from "@/components/orders/WarrantyClient";

export const metadata = { title: "Garantía" };

export default async function WarrantyPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <WarrantyClient orderId={params.id} />;
}
