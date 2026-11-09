import { BedIcon, UsersIcon } from "@/components/ui/icons";

export function HotelRoomFacts({
  adults,
  childCount,
  bed,
  vietnamese = true,
}: {
  adults: number;
  childCount: number;
  bed?: string;
  vietnamese?: boolean;
}) {
  const guests = vietnamese
    ? `${adults} người lớn · ${childCount} trẻ em`
    : `${adults} ${adults === 1 ? "adult" : "adults"} · ${childCount} ${childCount === 1 ? "child" : "children"}`;

  return (
    <ul className="stt-room-facts">
      <li><UsersIcon width={17} height={17} /> {guests}</li>
      {bed ? <li><BedIcon width={17} height={17} /> {bed}</li> : null}
    </ul>
  );
}
