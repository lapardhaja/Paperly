import Image from "next/image";
import type { CSSProperties } from "react";

const MARK = {
  color: "/brand/paperly-logo-full-color.svg",
  mono: "/brand/paperly-logo-mono.svg",
} as const;

export function BrandMark({
  variant = "color",
  size = "md",
}: {
  variant?: keyof typeof MARK;
  size?: "sm" | "md";
}) {
  const mark = size === "sm" ? "2rem" : "2.5rem";
  return (
    <span className="brand-mark" style={{ "--mark": mark } as CSSProperties} aria-hidden>
      <Image
        src={MARK[variant]}
        alt=""
        width={200}
        height={200}
        unoptimized
        priority
        draggable={false}
        className="max-w-none object-contain"
        style={{ width: "var(--mark)", height: "var(--mark)" }}
      />
    </span>
  );
}

export function BrandLockup({
  variant = "color",
  size = "md",
}: {
  variant?: keyof typeof MARK;
  size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex items-center text-ink">
      <BrandMark variant={variant} size={size} />
      <span className={size === "sm" ? "text-base font-semibold tracking-tight" : "text-lg font-semibold tracking-tight"}>
        Paperly
      </span>
    </span>
  );
}
