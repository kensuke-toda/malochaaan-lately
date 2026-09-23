"use client";

import { useState } from "react";
import { HomeClient } from "@/app/home-client";
import { useTabPreview } from "@/components/tab-preview";
import type { FeedBundle } from "@/lib/data";

export function FeedPanels({ bundle }: { bundle: FeedBundle }) {
  const { tab } = useTabPreview();
  const wantOn = tab === "/soon";
  const [seenWant, setSeenWant] = useState(wantOn);
  const [seenHappened, setSeenHappened] = useState(!wantOn);
  if (wantOn && !seenWant) setSeenWant(true);
  if (!wantOn && !seenHappened) setSeenHappened(true);

  const shared = {
    userId: bundle.userId,
    loggedIn: bundle.loggedIn,
    displayName: bundle.displayName,
    configured: bundle.configured,
  };

  return (
    <>
      {seenHappened ? (
        <div hidden={wantOn} inert={wantOn ? true : undefined}>
          <HomeClient intent="happened" everyone={bundle.happened.everyone} mine={bundle.happened.mine} {...shared} />
        </div>
      ) : null}
      {seenWant ? (
        <div hidden={!wantOn} inert={!wantOn ? true : undefined}>
          <HomeClient intent="want" everyone={bundle.want.everyone} mine={bundle.want.mine} {...shared} />
        </div>
      ) : null}
    </>
  );
}
