import Image from "next/image";
import { MEROTALENT_BRAND } from "@/lib/brand";

/** Decorative when accompanied by the canonical product name/link label. */
export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return <Image src={MEROTALENT_BRAND.logo} alt="" width={size} height={size} className={className ?? "h-10 w-10 object-contain"} />;
}
