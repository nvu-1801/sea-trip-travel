import "server-only";
import type { Locale } from "@/i18n/config";
import {
  LODGING_LABELS,
  LODGING_LABELS_EN,
  MAX_HOTEL_FEATURED,
  type Hotel,
  type LodgingType,
} from "@/domain/hotel";
import type { HotelRoom } from "@/domain/hotel-room";
import {
  quoteStay,
  tourRelationSchema,
  type StayQuote,
  type StoredRateRule,
  type TourRelation,
} from "@/domain/hotel-pricing";
import {
  resolveAvailability,
  vietnamToday,
  type AvailabilityResult,
  type AvailabilityRow,
} from "@/domain/hotel-availability";
import {
  filterAndPaginate,
  type FilterableHotel,
  type HotelQuery,
} from "@/lib/hotel-filters";
import type { ImageAsset } from "@/domain/common";
import { getTourBySlug } from "@/lib/data/tours";
import { estimateTourForParty, type TourPartyEstimate } from "@/domain/tour-estimate";
import { hotelSettings } from "@/server/cms/store";
import {
  availabilityByRoom,
  listTourLinks,
  publishedHotels,
  publishedRooms,
  publishedRoomsOf,
  rateRulesByRoom,
} from "./store";

/**
 * Public read model for hotels.
 *
 * Everything the browser receives is built here from an explicit allowlist:
 * no partner notes, no internal cost, no customer data, no draft rows. The
 * feature flag is checked in the route/API layer, not hidden in the markup.
 */

export type PublicRoom = {
  id: string;
  name: string;
  description: string | null;
  sizeSqm: number | null;
  bed: string | null;
  view: string | null;
  capacityAdults: number;
  capacityChildren: number;
  maxOccupancy: number;
  childPolicy: string | null;
  extraBedPolicy: string | null;
  amenities: string[];
  images: ImageAsset[];
  /** Lowest effective nightly price, or `null` = ask for a quote. */
  priceFrom: number | null;
  availability: AvailabilityResult;
  tourRelation: TourRelation | null;
  breakfastIncluded: boolean;
  taxIncluded: boolean;
};

export type PublicTourLink = {
  tourSlug: string;
  tourTitle: string;
  relation: TourRelation;
  condition: string;
};

export type PublicHotelCard = FilterableHotel & {
  slug: string;
  summary: string;
  address: string;
  mapUrl: string | null;
  starBasis: string | null;
  lodgingTypeLabel: string;
  priceFrom: number | null;
  priceIncludesBreakfast: boolean;
  priceIncludesTax: boolean;
  roomsCount: number;
  image: ImageAsset | null;
  hreflangReady: boolean;
  updatedAt: string;
};

export type PublicHotelDetail = PublicHotelCard & {
  images: ImageAsset[];
  description: string[];
  highlights: string[];
  policies: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
  roomMode: Hotel["roomMode"];
  rooms: PublicRoom[];
  tourLinks: PublicTourLink[];
};

type HotelCms = Hotel & {
  _en?: Partial<Hotel>;
  _enReviewed?: boolean;
};

function overlay<T extends object>(source: T, en: Partial<T> | undefined, locale: Locale): T {
  return locale === "en" && en ? { ...source, ...en } : source;
}

function lodgingLabel(type: LodgingType, locale: Locale): string {
  return locale === "en" ? LODGING_LABELS_EN[type] : LODGING_LABELS[type];
}

/**
 * A "from" price may only use a rule that is still effective: base and
 * weekday rules repeat forever, a date-range rule stops counting once it ends.
 */
export function lowestEffectiveRate(
  rules: readonly StoredRateRule[],
  today: string,
): { amount: number; includesBreakfast: boolean; includesTax: boolean } | null {
  const valid = rules.filter(
    (rule) => rule.kind !== "date_range" || (rule.endDate ?? "") >= today,
  );
  if (valid.length === 0) return null;
  const cheapest = valid.reduce((best, rule) =>
    rule.amount < best.amount ? rule : best,
  );
  return {
    amount: cheapest.amount,
    includesBreakfast: cheapest.includesBreakfast,
    includesTax: cheapest.includesTax,
  };
}

function hotelRelationOf(
  links: { roomId: string; tourSlug: string; relation: TourRelation }[],
  tourSlug: string,
  roomId?: string,
): TourRelation | null {
  if (roomId) {
    const roomLink = links.find(
      (link) => link.roomId === roomId && link.tourSlug === tourSlug,
    );
    if (roomLink) return tourRelationSchema.parse(roomLink.relation);
  }
  const hotelLink = links.find(
    (link) => link.roomId === "" && link.tourSlug === tourSlug,
  );
  return hotelLink ? tourRelationSchema.parse(hotelLink.relation) : null;
}

function searchTextOf(hotel: Hotel, locale: Locale): string {
  return [
    hotel.name,
    hotel.summary,
    hotel.province,
    hotel.address,
    ...hotel.amenities,
    hotel._en?.name ?? "",
    hotel._en?.summary ?? "",
    hotel._en?.address ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase(locale === "vi" ? "vi" : "en");
}

function roomsOfHotel(hotelId: string, rooms: readonly HotelRoom[]): HotelRoom[] {
  return publishedRoomsOf(hotelId, rooms);
}

function priceOfRoom(
  room: HotelRoom,
  rates: Map<string, StoredRateRule[]>,
  today: string,
) {
  const rules = rates.get(room.id) ?? [];
  const lowest = lowestEffectiveRate(rules, today);
  return {
    priceFrom: lowest?.amount ?? null,
    breakfast: lowest?.includesBreakfast ?? false,
    tax: lowest?.includesTax ?? false,
  };
}

/** Cards for the listing and the home section, already filter-ready. */
export function publicHotelCards(
  locale: Locale,
  today: string = vietnamToday(),
): PublicHotelCard[] {
  const hotels = publishedHotels() as HotelCms[];
  const rooms = publishedRooms();
  const roomIds = rooms.map((room) => room.id);
  const rates = rateRulesByRoom(roomIds);

  return hotels
    .map((hotel, index) => {
      const localized = overlay(hotel, hotel._en, locale);
      const hotelRooms = roomsOfHotel(hotel.id, rooms);
      let priceFrom: number | null = null;
      let breakfast = false;
      let tax = false;
      for (const room of hotelRooms) {
        const price = priceOfRoom(room, rates, today);
        if (price.priceFrom === null) continue;
        if (priceFrom === null || price.priceFrom < priceFrom) {
          priceFrom = price.priceFrom;
          breakfast = price.breakfast;
          tax = price.tax;
        }
      }
      const image = localized.images[0] ?? null;
      return {
        id: hotel.id,
        name: localized.name,
        searchText: searchTextOf(hotel, locale),
        province: localized.province,
        address: localized.address,
        mapUrl: hotel.mapUrl ?? null,
        slug: hotel.slug,
        summary: localized.summary,
        starRating: hotel.starRating,
        starBasis: hotel.starBasis ?? null,
        lodgingType: hotel.lodgingType,
        lodgingTypeLabel: lodgingLabel(hotel.lodgingType, locale),
        amenities: localized.amenities,
        priceFrom,
        priceIncludesBreakfast: breakfast,
        priceIncludesTax: tax,
        roomsCount: hotelRooms.length,
        image,
        recommendedRank: hotel.order * 1000 + index,
        hreflangReady: Boolean(hotel._enReviewed && hotel._en),
        updatedAt: hotel.updatedAt,
      } satisfies PublicHotelCard;
    })
    .sort((a, b) => a.recommendedRank - b.recommendedRank);
}

export function hotelListPage(locale: Locale, query: HotelQuery) {
  const cards = publicHotelCards(locale);
  const page = filterAndPaginate(cards, query);
  return { ...page, all: cards };
}

export function isHotelsModuleEnabled(): boolean {
  return hotelSettings().enabled;
}

/** Published hotels pinned for the home page, in the owner's order. */
export function featuredHotelCards(
  locale: Locale,
  limit: number = MAX_HOTEL_FEATURED,
): PublicHotelCard[] {
  const config = hotelSettings();
  if (!config.enabled || !config.homeVisible) return [];
  const cards = publicHotelCards(locale);
  if (cards.length === 0) return [];
  const byKey = new Map<string, PublicHotelCard>();
  for (const card of cards) {
    byKey.set(card.id, card);
    byKey.set(card.slug, card);
  }
  const pinned = config.featured
    .map((key) => byKey.get(key))
    .filter((card): card is PublicHotelCard => Boolean(card));
  const chosen = pinned.length > 0 ? pinned : cards;
  const seen = new Set<string>();
  return chosen
    .filter((card) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    })
    .slice(0, Math.min(limit, MAX_HOTEL_FEATURED));
}

export type HotelDetailOptions = {
  checkIn: string | null;
  checkOut: string | null;
  tourSlug: string | null;
};

function publishedTourTitle(slug: string, locale: Locale): string | null {
  const tour = getTourBySlug(slug, locale);
  return tour ? tour.title : null;
}

export function publicHotelDetail(
  slug: string,
  locale: Locale,
  options: HotelDetailOptions = { checkIn: null, checkOut: null, tourSlug: null },
  today: string = vietnamToday(),
): PublicHotelDetail | null {
  const hotels = publishedHotels() as HotelCms[];
  const hotel = hotels.find((candidate) => candidate.slug === slug);
  if (!hotel) return null;
  return buildDetail(hotel, locale, options, today);
}

export function publicHotelDetailById(
  hotelId: string,
  locale: Locale,
  options: HotelDetailOptions,
  today: string = vietnamToday(),
): PublicHotelDetail | null {
  const hotel = (publishedHotels() as HotelCms[]).find(
    (candidate) => candidate.id === hotelId,
  );
  return hotel ? buildDetail(hotel, locale, options, today) : null;
}

function buildDetail(
  hotel: HotelCms,
  locale: Locale,
  options: HotelDetailOptions,
  today: string,
): PublicHotelDetail {
  const localized = overlay(hotel, hotel._en, locale);
  const rooms = publishedRoomsOf(hotel.id, publishedRooms());
  const roomIds = rooms.map((room) => room.id);
  const rates = rateRulesByRoom(roomIds);
  const availabilityRows = availabilityByRoom(
    roomIds,
    options.checkIn,
    options.checkOut,
  );
  const links = listTourLinks(hotel.id);
  const tourLinks: PublicTourLink[] = [];
  for (const link of links) {
    const title = publishedTourTitle(link.tourSlug, locale);
    if (!title) continue;
    tourLinks.push({
      tourSlug: link.tourSlug,
      tourTitle: title,
      relation: link.relation,
      condition: link.condition,
    });
  }

  const publicRooms: PublicRoom[] = rooms.map((room) => {
    const roomLocalized = overlay(room, room._en, locale);
    const price = priceOfRoom(room, rates, today);
    const rows: AvailabilityRow[] = (availabilityRows.get(room.id) ?? []).map(
      (row) => ({
        date: row.date,
        rooms: row.rooms,
        closed: row.closed,
        updatedAt: row.updatedAt,
      }),
    );
    return {
      id: room.id,
      name: roomLocalized.name,
      description: roomLocalized.description ?? null,
      sizeSqm: room.sizeSqm,
      bed: roomLocalized.bed ?? null,
      view: roomLocalized.view ?? null,
      capacityAdults: room.capacityAdults,
      capacityChildren: room.capacityChildren,
      maxOccupancy: room.maxOccupancy,
      childPolicy: roomLocalized.childPolicy ?? null,
      extraBedPolicy: roomLocalized.extraBedPolicy ?? null,
      amenities: roomLocalized.amenities,
      images: roomLocalized.images,
      priceFrom: price.priceFrom,
      availability: resolveAvailability(
        hotel.roomMode,
        rows,
        options.checkIn,
        options.checkOut,
      ),
      tourRelation: options.tourSlug
        ? hotelRelationOf(links, options.tourSlug, room.id)
        : null,
      breakfastIncluded: price.breakfast,
      taxIncluded: price.tax,
    };
  });

  const firstRoom = publicRooms[0];
  return {
    id: hotel.id,
    name: localized.name,
    searchText: searchTextOf(hotel, locale),
    province: localized.province,
    address: localized.address,
    mapUrl: hotel.mapUrl ?? null,
    slug: hotel.slug,
    summary: localized.summary,
    starRating: hotel.starRating,
    starBasis: hotel.starBasis ?? null,
    lodgingType: hotel.lodgingType,
    lodgingTypeLabel: lodgingLabel(hotel.lodgingType, locale),
    amenities: localized.amenities,
    priceFrom: firstRoom?.priceFrom ?? null,
    priceIncludesBreakfast: firstRoom?.breakfastIncluded ?? false,
    priceIncludesTax: firstRoom?.taxIncluded ?? false,
    roomsCount: publicRooms.length,
    image: localized.images[0] ?? null,
    recommendedRank: hotel.order * 1000,
    hreflangReady: Boolean(hotel._enReviewed && hotel._en),
    updatedAt: hotel.updatedAt,
    images: localized.images,
    description: localized.description,
    highlights: localized.highlights,
    policies: localized.policies,
    checkInTime: hotel.checkInTime ?? null,
    checkOutTime: hotel.checkOutTime ?? null,
    roomMode: hotel.roomMode,
    rooms: publicRooms,
    tourLinks,
  };
}

export type HotelQuoteRequest = {
  hotelId: string;
  rooms: { roomId: string; quantity: number }[];
  checkIn: string;
  checkOut: string;
  tourSlug: string | null;
  adults?: number;
  children?: number;
};

/** Combined reference estimate: selected tour + selected rooms. */
export type HotelEstimate = {
  status: "quoted" | "needs_quote";
  lodgingTotal: number | null;
  tourTotal: number | null;
  total: number | null;
  reasons: string[];
};

export type HotelQuoteResult = {
  quote: StayQuote;
  hotelSlug: string;
  hotelName: string;
  rooms: { id: string; name: string; quantity: number; maxOccupancy: number }[];
  availability: Record<string, AvailabilityResult>;
  tour: { slug: string; title: string; relation: TourRelation } | null;
  tourPrice: TourPartyEstimate | null;
  estimate: HotelEstimate;
};

/**
 * Server-side reference quote. The browser never supplies money; it supplies
 * a selection and the server reads the current rules again.
 */
export function quoteHotelRequest(
  locale: Locale,
  request: HotelQuoteRequest,
  today: string = vietnamToday(),
): HotelQuoteResult | null {
  const hotel = (publishedHotels() as HotelCms[]).find(
    (candidate) => candidate.id === request.hotelId,
  );
  if (!hotel) return null;
  const rooms = publishedRoomsOf(hotel.id, publishedRooms());
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const chosen = request.rooms
    .map((entry) => ({ entry, room: byId.get(entry.roomId) }))
    .filter(
      (item): item is { entry: { roomId: string; quantity: number }; room: HotelRoom } =>
        Boolean(item.room),
    );
  if (chosen.length !== request.rooms.length) return null;

  const rates = rateRulesByRoom(chosen.map((item) => item.room.id));
  const links = listTourLinks(hotel.id);
  const relation = request.tourSlug
    ? hotelRelationOf(links, request.tourSlug, undefined)
    : null;
  const foundTour = request.tourSlug
    ? getTourBySlug(request.tourSlug, locale)
    : undefined;
  const tour = foundTour
    ? {
        slug: foundTour.slug,
        title: foundTour.title,
        relation: relation ?? ("additional" as TourRelation),
      }
    : null;

  const adults = Math.min(40, Math.max(1, Math.trunc(Number(request.adults ?? 2)) || 2));
  const children = Math.min(
    10,
    Math.max(0, Math.trunc(Number(request.children ?? 0)) || 0),
  );

  const quote = quoteStay(
    chosen.map((item) => ({
      roomId: item.room.id,
      quantity: item.entry.quantity,
      rules: rates.get(item.room.id) ?? [],
      tourRelation: request.tourSlug
        ? hotelRelationOf(links, request.tourSlug, item.room.id)
        : null,
    })),
    request.checkIn,
    request.checkOut,
    relation,
  );

  // Tour side of the estimate. The room total and the tour total are kept
  // separate so the UI can show the breakdown instead of one opaque number.
  const tourPrice = foundTour
    ? estimateTourForParty(foundTour, adults, children)
    : null;
  const lodgingTotal = quote.lodgingTotal;
  const tourTotal = tourPrice?.total ?? null;
  const total = tourPrice
    ? lodgingTotal !== null && tourTotal !== null
      ? lodgingTotal + tourTotal
      : null
    : lodgingTotal;
  const estimateReasons = new Set<string>(quote.reasons);
  if (!tourPrice) estimateReasons.add("no_tour");
  else if (tourPrice.status !== "quoted")
    estimateReasons.add(tourPrice.reason ?? "tour_price");
  const estimate: HotelEstimate = {
    status: tourPrice
      ? quote.status === "quoted" && tourPrice.status === "quoted"
        ? "quoted"
        : "needs_quote"
      : quote.status,
    lodgingTotal,
    tourTotal,
    total,
    reasons: [...estimateReasons],
  };

  const availabilityRows = availabilityByRoom(
    chosen.map((item) => item.room.id),
    request.checkIn,
    request.checkOut,
  );
  const availability: Record<string, AvailabilityResult> = {};
  for (const item of chosen) {
    availability[item.room.id] = resolveAvailability(
      hotel.roomMode,
      availabilityRows.get(item.room.id) ?? [],
      request.checkIn,
      request.checkOut,
      today,
    );
  }

  return {
    quote,
    hotelSlug: hotel.slug,
    hotelName: hotel.name,
    rooms: chosen.map((item) => ({
      id: item.room.id,
      name: item.room.name,
      quantity: item.entry.quantity,
      maxOccupancy: item.room.maxOccupancy,
    })),
    availability,
    tour,
    tourPrice,
    estimate,
  };
}
