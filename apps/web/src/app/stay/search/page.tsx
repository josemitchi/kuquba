import { StaySearchPage, type StaySearchParams } from "@/components/stay-search-page";
import { loadPublicStays } from "@/data/public-stays";

export default async function StaySearchRoute({
  searchParams
}: {
  searchParams: Promise<StaySearchParams>;
}) {
  const [resolvedSearchParams, stays] = await Promise.all([searchParams, loadPublicStays()]);

  return <StaySearchPage searchParams={resolvedSearchParams} stays={stays} />;
}