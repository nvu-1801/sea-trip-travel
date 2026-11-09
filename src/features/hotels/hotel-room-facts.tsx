import { BedIcon, UsersIcon } from "@/components/ui/icons";

export function HotelRoomFacts({
  adults,
  children,
  bed,
  vietnamese = true,
}: {
  adults: number;
  children: number;
  bed?: string;
  vietnamese?: boolean;
}) {
  const guests = vietnamese
    ? `${adults} người lớn · ${children} trẻ em`
    : `${adults} ${adults === 1 ? "adult" : "adults"} · ${children} ${children === 1 ? "child" : "children"}`;

  return (
    <ul className="stt-room-facts">
      <li><UsersIcon width={17} height={17} /> {guests}</li>
      {bed ? <li><BedIcon width={17} height={17} /> {bed}</li> : null}
    </ul>
  );
}
