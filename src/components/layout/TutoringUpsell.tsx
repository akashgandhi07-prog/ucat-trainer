import ProductUpsell from "./ProductUpsell";

type Variant = "footer" | "inline" | "hub" | "banner" | "postDrill";

type TutoringUpsellProps = {
  variant: Variant;
};

/** @deprecated Prefer ProductUpsell directly. */
export default function TutoringUpsell({ variant }: TutoringUpsellProps) {
  if (variant === "footer") {
    return <ProductUpsell variant="footer" offer="tutoring" placement="footer" />;
  }
  if (variant === "inline") {
    return <ProductUpsell variant="inline" offer="tutoring" placement="landing_hero" />;
  }
  if (variant === "hub") {
    return <ProductUpsell variant="hub_strip" offer="course" placement="hub_strip" />;
  }
  if (variant === "banner") {
    return <ProductUpsell variant="card" offer="tutoring" placement="dashboard_hero" />;
  }
  if (variant === "postDrill") {
    return <ProductUpsell variant="card" offer="tutoring" placement="post_drill" />;
  }
  return null;
}
