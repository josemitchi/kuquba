import { notFound } from "next/navigation";

import { StayDetailPage } from "@/components/stay-detail-page";
import { findPublicStayById, publicStays } from "@/data/public-stays";

export function generateStaticParams() {
  return publicStays.map((stay) => ({ id: stay.id }));
}

export default async function StayPropertyRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stay = findPublicStayById(id);

  if (!stay) {
    notFound();
  }

  return <StayDetailPage stay={stay} />;
}
