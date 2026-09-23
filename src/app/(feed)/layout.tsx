import { FeedPanels } from "@/components/feed-panels";
import { loadFeedBundle } from "../home-feed";

export default async function FeedLayout({ children }: { children: React.ReactNode }) {
  const bundle = await loadFeedBundle();
  return (
    <>
      <FeedPanels bundle={bundle} />
      {children}
    </>
  );
}
