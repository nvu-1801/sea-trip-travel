import { ButtonLink } from "@/components/ui/button";

/**
 * Phone-only action bar for the hotel detail page.
 *
 * The booking panel sits far below the fold on a phone, so the price and the
 * jump to the room list stay reachable. CSS hides it from 1024px up; it is
 * plain markup, no state and no scroll listener.
 */
export function HotelMobileBar({
  priceLabel,
  hasPrice,
  label,
  hint,
}: {
  priceLabel: string;
  hasPrice: boolean;
  label: string;
  hint: string;
}) {
  return (
    <div className="stt-hotel-mobilebar">
      <div className="stt-hotel-mobilebar-copy">
        <p className="stt-hotel-mobilebar-price" data-empty={!hasPrice}>
          {priceLabel}
        </p>
        <p className="stt-hotel-mobilebar-hint">{hint}</p>
      </div>
      <ButtonLink href="#hang-phong" size="sm">
        {label}
      </ButtonLink>
    </div>
  );
}
