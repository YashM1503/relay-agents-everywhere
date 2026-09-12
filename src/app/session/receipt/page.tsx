"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ReceiptCard } from "@/components/ReceiptCard";
import { useSession } from "@/components/SessionProvider";

export default function ReceiptPage() {
  const router = useRouter();
  const { state, endSession } = useSession();

  useEffect(() => {
    if (!state.sessionId) {
      router.replace("/session");
      return;
    }
    if (!state.receipt) {
      router.replace("/session/confirm");
    }
  }, [state.sessionId, state.receipt, router]);

  const handleDone = async () => {
    await endSession();
    router.push("/");
  };

  if (!state.receipt) {
    return (
      <main aria-busy="true">
        <p className="text-center text-lg text-relay-text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main aria-labelledby="receipt-page-heading">
      <h1 id="receipt-page-heading" className="sr-only">
        Registration receipt
      </h1>
      <ReceiptCard data={state.receipt} onDone={() => void handleDone()} />
    </main>
  );
}
