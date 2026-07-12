import { WarrantyClient } from "@/components/orders/WarrantyClient";

export const metadata = { title: "Garantía" };

export default function WarrantyPage({ params }: { params: { id: string } }) {
  return <WarrantyClient orderId={params.id} />;
}
