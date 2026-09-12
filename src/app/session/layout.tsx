import { SessionProvider } from "@/components/SessionProvider";
import { SessionShell } from "@/components/SessionShell";

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <SessionShell>{children}</SessionShell>
    </SessionProvider>
  );
}
