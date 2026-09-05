import { notFound } from "next/navigation";

import { StayDetailPage, type StayDetailSearchParams } from "@/components/stay-detail-page";
import { loadPublicStayById, publicStays } from "@/data/public-stays";

export function generateStaticParams() {
  return publicStays.map((stay) => ({ id: stay.id }));
}

export default async function StayPropertyRoute({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<StayDetailSearchParams>;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const stay = await loadPublicStayById(id);

  if (!stay) {
    notFound();
  }

  return <StayDetailPage searchParams={resolvedSearchParams} stay={stay} />;
}
