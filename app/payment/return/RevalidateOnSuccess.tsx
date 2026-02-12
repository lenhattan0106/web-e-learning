"use client";

import { useEffect } from "react";
import { revalidateAfterPayment } from "./actions";

export function RevalidateOnSuccess() {
  useEffect(() => {
    // Only runs AFTER the component has mounted (render phase complete)
    revalidateAfterPayment();
  }, []);

  return null; // No UI needed, this is just a side-effect component
}
