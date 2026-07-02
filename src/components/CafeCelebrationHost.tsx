/**
 * Root-level overlay that plays the falling-stars celebration whenever
 * CafeCartContext.celebrate bumps — rendered above the navigator so the stars
 * fall over WHATEVER screen is showing (e.g. the order detail, after the review
 * sheet has closed). Re-keyed per bump so each celebration starts fresh.
 */
import { useEffect, useState } from "react";
import { FallingStars } from "./FallingStars";
import { useCafeCart } from "../context/CafeCartContext";

export function CafeCelebrationHost() {
  const { celebrate } = useCafeCart();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (celebrate > 0) setPlaying(true);
  }, [celebrate]);

  if (!playing) return null;
  return <FallingStars key={celebrate} onDone={() => setPlaying(false)} />;
}
