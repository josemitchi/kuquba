import { StaySearchPage, type StaySearchParams } from "@/components/stay-search-page";

export default async function StaySearchRoute({
  searchParams
}: {
  searchParams: Promise<StaySearchParams>;
}) {
  return <StaySearchPage searchParams={await searchParams} />;
}