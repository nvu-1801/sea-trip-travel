import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { TourCard, type TourCardModel } from "./tour-card";

export function TourGrid({
  tours,
  className,
  columns = 3,
  priorityCount = 0,
}: {
  tours: readonly TourCardModel[];
  className?: string;
  columns?: 2 | 3 | 4;
  priorityCount?: number;
}) {
  const columnClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <ul
      className={cn(
        "stt-tour-grid grid grid-cols-1 gap-6",
        columnClass,
        className,
      )}
    >
      {tours.map((tour, index) => (
        <Reveal
          as="li"
          key={tour.slug}
          delay={index % 3}
          className="flex"
        >
          <TourCard tour={tour} priority={index < priorityCount} />
        </Reveal>
      ))}
    </ul>
  );
}
