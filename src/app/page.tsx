import { HomeFeed } from "./home-feed";

export const revalidate = 0;

export default function Home() {
  return <HomeFeed intent="happened" />;
}
