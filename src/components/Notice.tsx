"use client";

type NoticeVariant = "error" | "warning" | "offline";

type NoticeProps = {
  variant: NoticeVariant;
  children: React.ReactNode;
  role?: "alert" | "status";
};

const variantClass: Record<NoticeVariant, string> = {
  error: "relay-notice relay-notice-error",
  warning: "relay-notice relay-notice-warning",
  offline: "relay-notice relay-notice-offline",
};

export function Notice({ variant, children, role = "alert" }: NoticeProps) {
  return (
    <div role={role} className={variantClass[variant]}>
      <span aria-hidden="true">{variant === "error" ? "!" : variant === "offline" ? "◎" : "⚠"}</span>
      <div>{children}</div>
    </div>
  );
}
