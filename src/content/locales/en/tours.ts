import type { TourTranslationInput } from "@/domain/localization";

/**
 * DRAFT English translations for tours.
 *
 * Keyed by the SOURCE record `id` (not the slug). Every entry is machine-written
 * placeholder copy: `translationStatus: "draft"` means it is readable in
 * dev/preview but must never be indexed until the owner reviews it.
 */
export const tourTranslations: Readonly<Record<string, TourTranslationInput>> =
  {
    tour_qn_ky_co_eo_gio_1n: {
      translationStatus: "draft",
      badge: "Recommended",
      title: "Quy Nhon – Ky Co – Eo Gio 1 Day",
      summary:
        "A full day at Quy Nhon's most famous cluster: speedboat to Ky Co, swimming, and sunset at Eo Gio.",
      highlights: [
        "Speedboat to Ky Co beach, swimming in clear water",
        "The Eo Gio coastal road with rocky headlands jutting into the sea",
        "Seafood lunch at a seaside restaurant",
        "Early departure to reach the beach before the midday heat",
        "Hotel pickup in central Quy Nhon",
        "Ends the same day, ideal for travellers on a short schedule",
      ],
      overview: [
        "Ky Co and Eo Gio lie to the northeast of Quy Nhon, about 20–25 km from the city centre. This is the cluster most travellers choose when they visit Quy Nhon.",
        "The day trip is designed so you get out to sea early, avoid the midday sun, and still have time to catch the late-afternoon light at Eo Gio.",
      ],
      itinerary: [
        {
          title: "Quy Nhon – Ky Co – Eo Gio",
          summary:
            "Depart in the morning, reach Ky Co by speedboat, and head to Eo Gio in the afternoon.",
          activities: [
            "Pick up guests at their hotel or a meeting point in central Quy Nhon.",
            "Transfer to the pier and board a speedboat to Ky Co beach.",
            "Swim, take photos, and relax on the beach.",
            "Enjoy a seafood lunch at a seaside restaurant.",
            "Continue to Eo Gio and walk along the coastal path to admire the rocky headlands.",
            "Return guests to Quy Nhon, where the programme ends.",
          ],
          meals: ["Lunch"],
          places: ["Ky Co", "Eo Gio"],
        },
      ],
      included: [
        "Transportation within the programme",
        "Speedboat to the island along the route",
        "Entry tickets for the sites in the itinerary",
        "Lunch as listed in the programme",
        "An accompanying tour guide",
      ],
      excluded: [
        "Personal expenses and drinks not listed in the programme",
        "Travel insurance (available on request)",
        "Optional services at the beach",
      ],
      notes: [
        "The order of stops may change depending on weather and sea conditions.",
        "Bring sunscreen, a hat, and a waterproof pouch for your phone.",
        "Guests travelling with young children or older visitors should let us know in advance so suitable transport can be arranged.",
      ],
      tags: ["1 day", "Islands & beaches", "Speedboat"],
      departurePoints: ["Quy Nhon"],
      priceNote:
        "The price depends on the number of guests, the season, and the mode of transport.",
      imageAlts: [
        "Ky Co beach seen from above with blue seawater",
        "The coastal road at Eo Gio",
        "Speedboat taking guests out to Ky Co",
      ],
    },

    tour_qn_hon_kho_1n: {
      translationStatus: "draft",
      title: "Quy Nhon – Hon Kho Snorkelling 1 Day",
      summary:
        "A day at sea snorkelling over the coral at Hon Kho, ideal for travellers who enjoy underwater experiences.",
      highlights: [
        "Snorkel over coral reefs in shallow water",
        "Suitable even for first-timers, with a basic technique briefing before you get in the water",
        "Basic snorkelling gear is included in the programme",
        "Support staff in the water throughout the activity",
        "Plenty of time to relax on the beach",
        "Seafood lunch in the Hon Kho area",
      ],
      overview: [
        "Hon Kho is a small island close to shore with shallow, fairly calm water, well suited to a day of snorkelling.",
        "The programme welcomes first-time snorkellers; the guide briefs you on the basics before you enter the water.",
      ],
      itinerary: [
        {
          title: "Quy Nhon – Hon Kho",
          summary:
            "Head out to the island in the morning, snorkel over the coral, and return to the mainland in the afternoon.",
          activities: [
            "Pick up guests and transfer to the pier.",
            "Safety briefing and instructions on using the snorkelling gear.",
            "Transfer out to Hon Kho.",
            "Snorkel over the coral in small groups.",
            "Seafood lunch and free time to rest.",
            "Return to Quy Nhon, where the programme ends.",
          ],
          meals: ["Lunch"],
          places: ["Hon Kho"],
        },
      ],
      included: [
        "Transportation plus the boat or speedboat to the island",
        "Basic snorkelling gear",
        "A guide and in-water support staff",
        "Lunch as listed in the programme",
      ],
      excluded: [
        "Personal expenses",
        "Underwater photography service (on request)",
        "Travel insurance",
      ],
      notes: [
        "Non-swimmers can still join, but must follow the guide's instructions and wear a life jacket.",
        "The activity may be postponed if the sea is rough; in that case an alternative plan will be agreed on.",
      ],
      tags: ["1 day", "Snorkelling", "Islands & beaches"],
      departurePoints: ["Quy Nhon"],
      priceNote:
        "The price depends on the number of guests and any additional snorkelling gear rented.",
      imageAlts: ["Nhon Hai fishing village on the Hon Kho route"],
    },

    tour_qn_cu_lao_xanh_1n: {
      translationStatus: "draft",
      title: "Quy Nhon – Cu Lao Xanh 1 Day",
      summary:
        "Visit a peaceful offshore island and explore its lighthouse and fishing village in a single day.",
      highlights: [
        "Visit the lighthouse and take in the island's panorama from above",
        "Walk through the small fishing village and learn about local life",
        "Swim at a long sandy beach with clear, fairly calm water",
        "A slow pace: fewer stops, but real time at each one",
        "Travel by boat, ideal for those who enjoy being out on the water",
        "Return to Quy Nhon the same day, with no extra accommodation needed",
      ],
      overview: [
        "Cu Lao Xanh lies to the southeast of Quy Nhon. The island retains a peaceful feel, with a small fishing village and an old lighthouse.",
        "The pace is relaxed: head out to the island, sightsee, swim, and return the same day.",
      ],
      itinerary: [
        {
          title: "Quy Nhon – Cu Lao Xanh",
          summary:
            "Head to the island, visit the lighthouse and fishing village, and return in the afternoon.",
          activities: [
            "Pick up guests in Quy Nhon and transfer to the pier.",
            "Board the boat to Cu Lao Xanh.",
            "Visit the lighthouse and enjoy the island's panorama.",
            "Have lunch on the island.",
            "Swim and relax at your leisure.",
            "Return to Quy Nhon, where the programme ends.",
          ],
          meals: ["Lunch"],
          places: ["Cu Lao Xanh"],
        },
      ],
      included: [
        "Transportation and boat tickets to the island",
        "An accompanying tour guide",
        "Lunch as listed in the programme",
      ],
      excluded: [
        "Personal expenses",
        "Drinks not listed in the programme",
        "Travel insurance",
      ],
      notes: [
        "Boat schedules to the island depend on the tides and weather; departure times may be adjusted.",
        "The island has few amenities, so bring drinking water and cash.",
      ],
      tags: ["1 day", "Island", "Exploration"],
      departurePoints: ["Quy Nhon"],
      priceNote:
        "The price depends on the number of guests and the type of boat.",
      imageAlts: [
        "The lighthouse on Cu Lao Xanh island",
        "A long sandy beach and clear water at Cu Lao Xanh",
      ],
    },

    tour_qn_py_3n2d: {
      translationStatus: "draft",
      title: "Quy Nhon – Phu Yen 3 Days 2 Nights",
      summary:
        "A short trip combining the beaches of Quy Nhon with Phu Yen's signature sights: Ghenh Da Dia, Bai Xep, and Mui Dien.",
      highlights: [
        "Combines two provinces in one trip, with little backtracking",
        "Ghenh Da Dia and Bai Xep, two icons of Phu Yen",
        "Catch sunrise at Mui Dien, the earliest point on the mainland",
        "Two nights' stay, with time to swim and genuinely rest",
        "A tour guide throughout the journey",
        "A lighter midday schedule to avoid the harsh sun",
      ],
      overview: [
        "This is the most popular programme for travellers who want to see both Quy Nhon and Phu Yen but only have about three days. The itinerary splits the time evenly between the two provinces and minimises midday travel.",
        "Day two focuses on Phu Yen, and day three returns to Quy Nhon for swimming and shopping before the trip ends.",
      ],
      itinerary: [
        {
          title: "Quy Nhon – Ky Co – Eo Gio",
          summary: "Day one exploring the seas around Quy Nhon.",
          activities: [
            "Pick up guests at Quy Nhon airport or bus station.",
            "Speedboat to Ky Co and swim.",
            "Seafood lunch.",
            "Visit Eo Gio.",
            "Check in at a Quy Nhon hotel, with the evening free.",
          ],
          meals: ["Lunch", "Dinner"],
          accommodation: "Overnight in Quy Nhon",
          places: ["Ky Co", "Eo Gio"],
        },
        {
          title: "Quy Nhon – Ghenh Da Dia – Bai Xep – O Loan Lagoon",
          summary: "Transfer to Phu Yen and visit its signature sights.",
          activities: [
            "Depart early from Quy Nhon for Phu Yen.",
            "Visit Ghenh Da Dia.",
            "Stop at Bai Xep to take photos and rest.",
            "Lunch in the O Loan Lagoon area.",
            "Visit O Loan Lagoon, with the afternoon free.",
            "Check in at Phu Yen.",
          ],
          meals: ["Breakfast", "Lunch", "Dinner"],
          accommodation: "Overnight in Phu Yen",
          places: ["Ghenh Da Dia", "Bai Xep", "O Loan Lagoon"],
        },
        {
          title: "Mui Dien – Quy Nhon – End",
          summary:
            "Catch the sunrise, then head back to Quy Nhon to end the journey.",
          activities: [
            "Catch sunrise at Mui Dien – Dai Lanh.",
            "Breakfast and check out.",
            "Transfer back to Quy Nhon.",
            "Shop for local specialities and enjoy free time until departure.",
            "See guests off at the airport or bus station.",
          ],
          meals: ["Breakfast", "Lunch"],
          places: ["Mui Dien", "Quy Nhon"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "02 hotel nights in the category selected",
        "Meals as listed in the itinerary",
        "Entry tickets and speedboat along the route",
        "An accompanying tour guide",
      ],
      excluded: [
        "Air, train, or bus tickets to Quy Nhon",
        "Personal expenses and drinks not listed in the programme",
        "Single-room supplement",
        "Travel insurance",
      ],
      notes: [
        "The order of stops may change to suit flight times and weather.",
        "Day three requires an early start to catch the sunrise.",
        "Time at each stop can be adjusted to suit the group's needs.",
      ],
      tags: ["3 days", "Quy Nhon", "Phu Yen", "Islands & beaches"],
      departurePoints: ["Quy Nhon", "Phu Yen"],
      priceNote:
        "The price depends on the hotel category, the number of guests, and the departure date.",
      imageAlts: [
        "Ghenh Da Dia with its basalt columns",
        "Bai Xep seen from above",
        "The path up to the Mui Dien lighthouse",
        "Quy Nhon beach in the early morning",
      ],
    },

    tour_qn_py_4n3d: {
      translationStatus: "draft",
      title: "Quy Nhon – Phu Yen 4 Days 3 Nights",
      summary:
        "Four days for Quy Nhon and Phu Yen at a more relaxed pace, adding Cu Lao Xanh, leisure time, and local food.",
      highlights: [
        "An extra day for Cu Lao Xanh and snorkelling",
        "Covers the main sights: Ky Co – Eo Gio, Cu Lao Xanh, Ghenh Da Dia, and Bai Xep",
        "Three consecutive nights in Quy Nhon, so you are not constantly changing hotels",
        "A slower pace, with time to rest at the hotel between outings",
        "A free evening to stroll by the sea and eat seafood",
        "Explore local cuisine with your guide",
      ],
      overview: [
        "The 4-day programme suits travellers who want both sightseeing and relaxation. Compared with the 3-day version, you get an extra morning on the island and more free time.",
        "SEA TRIP keeps travel to the mornings and early afternoons, avoiding the harsh sun and leaving the evenings free in the centre.",
      ],
      itinerary: [
        {
          title: "Pick-up – Quy Nhon city & food",
          summary: "A first day getting to know the city.",
          activities: [
            "Pick up guests at the airport or bus station.",
            "Check in and rest.",
            "Visit central Quy Nhon and the beach.",
            "Dinner featuring local seafood.",
          ],
          meals: ["Dinner"],
          accommodation: "Overnight in Quy Nhon",
          places: ["Quy Nhon"],
        },
        {
          title: "Ky Co – Eo Gio",
          summary: "A full day at the most famous cluster.",
          activities: [
            "Speedboat to Ky Co.",
            "Swim and rest on the beach.",
            "Seafood lunch.",
            "Visit Eo Gio.",
            "Return to the hotel, with the evening free.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Quy Nhon",
          places: ["Ky Co", "Eo Gio"],
        },
        {
          title: "Cu Lao Xanh",
          summary: "A day on the island.",
          activities: [
            "Take a boat to Cu Lao Xanh.",
            "Visit the lighthouse and fishing village.",
            "Have lunch on the island.",
            "Swim and rest.",
            "Return to Quy Nhon.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Quy Nhon",
          places: ["Cu Lao Xanh"],
        },
        {
          title: "Phu Yen – Ghenh Da Dia – Bai Xep – Mui Dien – End",
          summary: "A final day in Phu Yen before seeing guests off.",
          activities: [
            "Depart early for Phu Yen.",
            "Visit Ghenh Da Dia and Bai Xep.",
            "Lunch at O Loan Lagoon.",
            "Stop at Mui Dien if time permits.",
            "See guests off at the airport or bus station.",
          ],
          meals: ["Breakfast", "Lunch"],
          places: ["Ghenh Da Dia", "Bai Xep", "Mui Dien"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "03 hotel nights in the category selected",
        "Meals as listed in the itinerary",
        "Entry tickets, speedboat, and boat to the island",
        "An accompanying tour guide",
      ],
      excluded: [
        "Air, train, or bus tickets to Quy Nhon",
        "Personal expenses and drinks not listed in the programme",
        "Single-room supplement",
        "Travel insurance",
      ],
      notes: [
        "Day 4 is fairly full, so arrange your return flight or train for the evening.",
        "If the sea is rough, island activities will be replaced with a mainland alternative.",
      ],
      tags: ["4 days", "Quy Nhon", "Phu Yen", "Leisure"],
      departurePoints: ["Quy Nhon"],
      priceNote:
        "The price depends on the hotel category and the departure date.",
      imageAlts: [
        "Cu Lao Xanh seen from the lighthouse",
        "Ghenh Da Dia in Phu Yen",
        "Central Vietnam seafood",
      ],
    },

    tour_qn_py_5n4d: {
      translationStatus: "draft",
      badge: "Recommended",
      title: "Quy Nhon – Phu Yen 5 Days 4 Nights",
      summary:
        "The most complete journey through both provinces, adding leisure time, snorkelling, and a slow-paced look at Phu Yen.",
      highlights: [
        "Includes Ky Co – Eo Gio, Hon Kho, and Cu Lao Xanh",
        "Two nights in Phu Yen, so you are not travelling much during the day",
        "Basic snorkelling gear included for the Hon Kho day",
        "The longest programme on this route, well suited to families",
        "Alternates active days with lighter ones so you do not get worn out",
        "Each evening ends early, with free time to rest",
      ],
      overview: [
        "This is the longest programme in the Quy Nhon – Phu Yen group, designed for travellers with plenty of time or those visiting as a family group.",
        "The itinerary alternates busy days with lighter ones, and each evening ends early so you can rest.",
      ],
      itinerary: [
        {
          title: "Pick-up in Quy Nhon",
          summary: "Check in and get to know the seaside city.",
          activities: [
            "Pick up guests at the airport or bus station.",
            "Check in at the hotel.",
            "Stroll by the sea and have dinner in the centre.",
          ],
          meals: ["Dinner"],
          accommodation: "Overnight in Quy Nhon",
          places: ["Quy Nhon"],
        },
        {
          title: "Ky Co – Eo Gio",
          summary: "The most famous cluster of seaside sights.",
          activities: [
            "Speedboat to Ky Co.",
            "Swim and rest on the beach.",
            "Seafood lunch.",
            "Visit Eo Gio in the late afternoon.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Quy Nhon",
          places: ["Ky Co", "Eo Gio"],
        },
        {
          title: "Hon Kho – snorkelling",
          summary: "A day of underwater experiences.",
          activities: [
            "Head out to Hon Kho.",
            "Snorkelling instruction and coral viewing.",
            "Seafood lunch.",
            "Return to the mainland, with the afternoon free.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Quy Nhon",
          places: ["Hon Kho"],
        },
        {
          title: "Quy Nhon – Phu Yen – Ghenh Da Dia – Bai Xep",
          summary: "Transfer to Phu Yen and visit the main sights.",
          activities: [
            "Transfer to Phu Yen.",
            "Visit Ghenh Da Dia.",
            "Stop at Bai Xep.",
            "Lunch and a visit to O Loan Lagoon.",
            "Check in at Phu Yen.",
          ],
          meals: ["Breakfast", "Lunch", "Dinner"],
          accommodation: "Overnight in Phu Yen",
          places: ["Ghenh Da Dia", "Bai Xep", "O Loan Lagoon"],
        },
        {
          title: "Mui Dien – Cu Lao Xanh – End",
          summary: "The final morning before seeing guests off.",
          activities: [
            "Catch sunrise at Mui Dien.",
            "Breakfast and check out.",
            "Depending on time, stop at Cu Lao Xanh or enjoy free time in Quy Nhon.",
            "See guests off at the airport or bus station.",
          ],
          meals: ["Breakfast"],
          places: ["Mui Dien"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "04 hotel nights in the category selected",
        "Meals as listed in the itinerary",
        "Entry tickets, speedboat, boat, and basic snorkelling gear",
        "An accompanying tour guide",
      ],
      excluded: [
        "Air, train, or bus tickets to Quy Nhon",
        "Personal expenses and drinks not listed in the programme",
        "Single-room supplement",
        "Travel insurance and underwater photography service",
      ],
      notes: [
        "The programme involves many sea activities; guests should plan around their fitness.",
        "Boat times to the island may change with the tides, affecting the schedule on days 3 and 5.",
      ],
      tags: ["5 days", "Quy Nhon", "Phu Yen", "Snorkelling", "Leisure"],
      departurePoints: ["Quy Nhon"],
      priceNote:
        "The price depends on the hotel category, the number of guests, and the peak season.",
      imageAlts: [
        "Nhon Hai fishing village on the Hon Kho route",
        "Dai Lanh lighthouse, Phu Yen",
      ],
    },

    tour_mb_hn_hl_4n3d: {
      translationStatus: "draft",
      title: "Hanoi – Ha Long Bay 4 Days 3 Nights",
      summary:
        "Combines Hanoi's Old Quarter with a night on Ha Long Bay, a route well suited to a first trip north.",
      highlights: [
        "An afternoon strolling the Old Quarter and Hoan Kiem Lake",
        "A night aboard a cruise on Ha Long Bay",
        "Kayaking and cave visits on the bay",
        "Sunrise on the deck on the morning of day three",
        "Free time to explore Hanoi's food scene on your own",
        "Ideal for a first trip north, combining Old Quarter culture with islands and sea",
      ],
      overview: [
        "A four-day journey balancing Hanoi's urban culture with the seascapes of Ha Long.",
        "The night on Ha Long Bay is the highlight; onboard activities depend on each cruise's programme.",
      ],
      itinerary: [
        {
          title: "Hanoi – Old Quarter",
          summary: "Pick up guests and get to know the capital.",
          activities: [
            "Pick up guests at Noi Bai airport.",
            "Check in at the hotel.",
            "Stroll around Hoan Kiem Lake and the Old Quarter.",
            "Enjoy street food.",
          ],
          meals: ["Dinner"],
          accommodation: "Overnight in Hanoi",
          places: ["Hanoi"],
        },
        {
          title: "Hanoi – Ha Long Bay",
          summary: "Transfer to Ha Long and board the cruise.",
          activities: [
            "Depart for Ha Long Bay.",
            "Board the cruise and have lunch on board.",
            "Visit caves and go kayaking.",
            "Watch the sunset over the bay and stay overnight on board.",
          ],
          meals: ["Breakfast", "Lunch", "Dinner"],
          accommodation: "Overnight aboard a cruise on Ha Long Bay",
          places: ["Ha Long Bay"],
        },
        {
          title: "Ha Long Bay – Hanoi",
          summary: "Tai chi practice and return to Hanoi.",
          activities: [
            "Morning tai chi on the deck.",
            "Visit the remaining stop on the cruise's programme.",
            "Check out of the cruise and have lunch.",
            "Return to Hanoi, with the evening free.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Hanoi",
          places: ["Ha Long Bay", "Hanoi"],
        },
        {
          title: "Hanoi – End",
          summary: "A free morning and departure.",
          activities: [
            "Visit the Temple of Literature or shop at your leisure.",
            "Check out.",
            "See guests off at Noi Bai airport.",
          ],
          meals: ["Breakfast"],
          places: ["Hanoi"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "03 nights' accommodation (02 hotel nights, 01 cruise night)",
        "Meals as listed in the itinerary",
        "Entry tickets and activities on the bay",
        "An accompanying tour guide",
      ],
      excluded: [
        "Air tickets to and from Hanoi",
        "Drinks on the cruise",
        "Personal expenses and single-room supplement",
      ],
      notes: [
        "The onboard programme is set by the cruise operator and may change with the weather.",
        "Northern winters are cold and often misty, so bring warm clothing.",
      ],
      tags: ["4 days", "Northern Vietnam", "Heritage", "Cruise"],
      departurePoints: ["Hanoi"],
      priceNote:
        "The price depends on the cruise class and the hotel room type.",
      imageAlts: [
        "Hoan Kiem Lake, Hanoi",
        "Ha Long Bay seen from Ti Top Island",
      ],
    },

    tour_mb_sapa_3n2d: {
      translationStatus: "draft",
      title: "Sa Pa – Fansipan 3 Days 2 Nights",
      summary:
        "Three days in the highlands of Lao Cai: villages, rice terraces, and reaching the summit of Fansipan by cable car.",
      highlights: [
        "Reach the Fansipan summit by cable car, with no long trek required",
        "A light trek through Cat Cat village and the rice terraces",
        "Stop by the Lao Chai – Ta Van area if time permits",
        "A local market and highland cuisine",
        "Cool year-round, well suited to a short break",
        "A local guide leads the way on the village sections",
      ],
      overview: [
        "Sa Pa stays cool year-round, though the weather can change quickly within a day. The three-day programme suits travellers who want a highland experience without heavy trekking.",
      ],
      itinerary: [
        {
          title: "Hanoi – Sa Pa",
          summary: "Travel up to Sa Pa.",
          activities: [
            "Depart from Hanoi along the expressway.",
            "Arrive in Sa Pa and check in.",
            "Stroll around town and the stone church in the evening.",
          ],
          meals: ["Dinner"],
          accommodation: "Overnight in Sa Pa",
          places: ["Sa Pa"],
        },
        {
          title: "Fansipan – Cat Cat Village",
          summary: "The highlight of the trip.",
          activities: [
            "Take the cable car up to Fansipan.",
            "Visit the summit area and the pagoda.",
            "Return to town and have lunch.",
            "A light trek to Cat Cat village.",
          ],
          meals: ["Breakfast", "Lunch", "Dinner"],
          accommodation: "Overnight in Sa Pa",
          places: ["Fansipan", "Cat Cat"],
        },
        {
          title: "Sa Pa – Hanoi – End",
          summary: "A local market and the journey back.",
          activities: [
            "Visit the Sa Pa market or the Lao Chai – Ta Van village.",
            "Check out and have lunch.",
            "Return to Hanoi, where the programme ends.",
          ],
          meals: ["Breakfast", "Lunch"],
          places: ["Sa Pa", "Hanoi"],
        },
      ],
      included: [
        "Transport between Hanoi and Sa Pa",
        "02 hotel nights in Sa Pa",
        "Meals as listed in the itinerary",
        "Fansipan cable car tickets and village entrance tickets",
        "An accompanying tour guide",
      ],
      excluded: [
        "Personal expenses",
        "Drinks not listed in the programme",
        "Travel insurance",
      ],
      notes: [
        "Sa Pa's weather changes quickly and can bring rain or heavy mist; bring a raincoat and shoes with good grip.",
        "Cable car times may change with the season and operating conditions.",
      ],
      tags: ["3 days", "Northern Vietnam", "Mountains", "Light trekking"],
      departurePoints: ["Hanoi"],
      priceNote:
        "The price depends on the mode of transport between Hanoi and Sa Pa and the hotel category.",
      imageAlts: ["Rice terraces and mountains in Sa Pa"],
    },

    tour_mb_ninh_binh_2n1d: {
      translationStatus: "draft",
      title: "Ninh Binh – Trang An – Bai Dinh 2 Days 1 Night",
      summary:
        "Two days in Ninh Binh: a rowboat through Trang An, Mua Cave, and the Bai Dinh pagoda complex.",
      highlights: [
        "Take a rowboat through the water caves of Trang An",
        "Climb Mua Cave for a panoramic view of Tam Coc from above",
        "Visit the Bai Dinh pagoda complex",
        "Only about two hours from Hanoi, ideal for a weekend trip",
        "One night in Ninh Binh, with little travelling",
        "Try local specialities: crispy rice and mountain goat meat",
      ],
      overview: [
        "Ninh Binh is about two hours by car from Hanoi, well suited to a short weekend break amid limestone mountains and small rivers.",
      ],
      itinerary: [
        {
          title: "Hanoi – Trang An – Mua Cave",
          summary: "The scenic highlight.",
          activities: [
            "Depart from Hanoi for Ninh Binh.",
            "Take a rowboat tour of Trang An.",
            "Lunch featuring local specialities.",
            "Climb Mua Cave for panoramic views of Tam Coc.",
            "Check in at the hotel.",
          ],
          meals: ["Lunch", "Dinner"],
          accommodation: "Overnight in Ninh Binh",
          places: ["Trang An", "Mua Cave", "Tam Coc"],
        },
        {
          title: "Bai Dinh – Hanoi – End",
          summary: "Visit the pagoda and head back.",
          activities: [
            "Visit the Bai Dinh pagoda complex.",
            "Have lunch and check out.",
            "Return to Hanoi, where the programme ends.",
          ],
          meals: ["Breakfast", "Lunch"],
          places: ["Bai Dinh", "Hanoi"],
        },
      ],
      included: [
        "Transport from Hanoi",
        "01 hotel night in Ninh Binh",
        "Meals as listed in the itinerary",
        "Trang An boat tickets and entrance tickets",
        "An accompanying tour guide",
      ],
      excluded: [
        "Personal expenses",
        "Drinks not listed in the programme",
        "Travel insurance",
      ],
      notes: [
        "Mua Cave has many steps and is not suitable for guests with limited mobility.",
      ],
      tags: ["2 days", "Northern Vietnam", "Weekend"],
      departurePoints: ["Hanoi"],
      priceNote:
        "The price depends on the number of guests and the hotel category in Ninh Binh.",
      imageAlts: ["Trang An landscape, Ninh Binh"],
    },

    tour_mt_dn_ha_hue_4n3d: {
      translationStatus: "draft",
      title: "Da Nang – Hoi An – Hue 4 Days 3 Nights",
      summary:
        "A Central Vietnam heritage route combining Da Nang's beaches, Hoi An's Old Town, and the former imperial city of Hue over four days.",
      highlights: [
        "Three heritage sites in one journey, with short transfers between them",
        "An evening in Hoi An releasing lanterns on the Hoai River",
        "Visit the Imperial City and Thien Mu Pagoda on the Perfume River",
        "Free time to explore the Old Town's food",
        "Sample Hue cuisine on your guide's recommendations",
        "The order of the three stops can change to suit your return flight",
      ],
      overview: [
        "Central Vietnam's main sights sit close together, which suits a short trip. The four-day programme divides the time among Da Nang, Hoi An, and Hue.",
        "Road travel between the stops takes about 30–120 minutes, making it suitable for families with young children.",
      ],
      itinerary: [
        {
          title: "Da Nang – Son Tra Peninsula",
          summary: "Pick up guests and explore Da Nang.",
          activities: [
            "Pick up guests at Da Nang airport.",
            "Check in at the hotel.",
            "Visit Son Tra Peninsula and My Khe beach.",
            "Free evening in the centre.",
          ],
          meals: ["Dinner"],
          accommodation: "Overnight in Da Nang",
          places: ["Da Nang", "Son Tra", "My Khe"],
        },
        {
          title: "Hoi An – Old Town",
          summary: "Transfer to Hoi An and tour the Old Town.",
          activities: [
            "Depart for Hoi An.",
            "Visit the Japanese Covered Bridge, old houses, and assembly halls.",
            "Release flower lanterns on the Hoai River in the evening.",
            "Free time to explore the Old Town's food.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Hoi An",
          places: ["Hoi An"],
        },
        {
          title: "Hue – Imperial City – Thien Mu Pagoda",
          summary: "Transfer to Hue and tour the former imperial capital.",
          activities: [
            "Depart for Hue.",
            "Visit the Imperial City.",
            "Stop at Thien Mu Pagoda on the Perfume River.",
            "Enjoy Hue cuisine in the evening.",
          ],
          meals: ["Breakfast", "Lunch", "Dinner"],
          accommodation: "Overnight in Hue",
          places: ["Hue"],
        },
        {
          title: "Hue – Da Nang – End",
          summary: "A free morning and departure.",
          activities: [
            "Free morning or a visit to Dong Ba market.",
            "Have lunch and check out.",
            "Transfer back to Da Nang.",
            "See guests off at the airport.",
          ],
          meals: ["Breakfast", "Lunch"],
          places: ["Hue", "Da Nang"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "03 hotel nights in the category selected",
        "Meals as listed in the itinerary",
        "Entrance tickets as listed in the programme",
        "An accompanying tour guide",
      ],
      excluded: [
        "Air tickets to Da Nang and back from Hue/Da Nang",
        "Personal expenses and drinks not listed in the programme",
        "Single-room supplement and travel insurance",
      ],
      notes: [
        "The order of Da Nang – Hoi An – Hue can change depending on your return flight.",
        "Hoi An's evenings are crowded in peak season, so head out earlier to get a good spot.",
      ],
      tags: ["4 days", "Heritage", "Central Vietnam"],
      departurePoints: ["Da Nang"],
      priceNote:
        "The price depends on the hotel category and the departure date.",
      imageAlts: [
        "Dragon Bridge over the Han River, Da Nang",
        "Hoi An Ancient Town beside the river",
        "Meridian Gate at the Hue Citadel",
      ],
    },

    tour_mt_di_san_5n4d: {
      translationStatus: "draft",
      title: "Central Vietnam Heritage 5 Days 4 Nights",
      summary:
        "A five-day journey through Quang Binh, Hue, Da Nang, and Hoi An at a slow pace, with ample time for sightseeing.",
      highlights: [
        "One extra day compared with the four-day route, at a more relaxed pace",
        "A full day devoted to Ba Na Hills",
        "Visit the Imperial City and a notable royal tomb in Hue",
        "Four nights' accommodation, split among Da Nang, Hoi An, and Hue",
        "Plenty of free time for Hoi An and Da Nang's beaches",
        "Well suited to family groups and older travellers",
      ],
      overview: [
        "The five-day version adds rest time and an afternoon of local food experiences while keeping the main sights of the four-day route.",
      ],
      itinerary: [
        {
          title: "Pick-up – Da Nang",
          summary: "Check in and stroll by the sea.",
          activities: [
            "Pick up guests at the airport.",
            "Check in.",
            "Stroll My Khe beach in the afternoon.",
          ],
          meals: ["Dinner"],
          accommodation: "Overnight in Da Nang",
          places: ["Da Nang"],
        },
        {
          title: "Ba Na Hills – Da Nang",
          summary: "A day of fun.",
          activities: [
            "Transfer to Ba Na Hills.",
            "Visit the Golden Bridge and the amusement area.",
            "Return to Da Nang, with the evening free.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Da Nang",
          places: ["Ba Na Hills"],
        },
        {
          title: "Hoi An",
          summary: "The Old Town and craft villages.",
          activities: [
            "Transfer to Hoi An.",
            "Visit the Old Town and traditional craft villages.",
            "Release flower lanterns in the evening.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Hoi An",
          places: ["Hoi An"],
        },
        {
          title: "Hue – Imperial City – Royal Tombs",
          summary: "Explore the former imperial capital.",
          activities: [
            "Transfer to Hue.",
            "Visit the Imperial City and Thien Mu Pagoda.",
            "Stop at a notable royal tomb.",
          ],
          meals: ["Breakfast", "Lunch", "Dinner"],
          accommodation: "Overnight in Hue",
          places: ["Hue"],
        },
        {
          title: "Hue – End",
          summary: "A free morning and departure.",
          activities: [
            "Free time or a visit to Dong Ba market.",
            "Check out.",
            "See guests off at Phu Bai airport.",
          ],
          meals: ["Breakfast"],
          places: ["Hue"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "04 hotel nights in the category selected",
        "Meals as listed in the itinerary",
        "Entrance tickets as listed in the programme",
        "An accompanying tour guide",
      ],
      excluded: [
        "Air tickets",
        "Personal expenses and drinks not listed in the programme",
        "Single-room supplement",
      ],
      notes: ["Ba Na Hills can be crowded and misty; bring a light jacket."],
      tags: ["5 days", "Heritage", "Central Vietnam", "Family"],
      departurePoints: ["Da Nang", "Hue"],
      priceNote:
        "The price depends on the hotel category, the number of guests, and the season.",
      imageAlts: [
        "Meridian Gate at the Hue Citadel",
        "Dragon Bridge over the Han River, Da Nang",
        "Hoi An Ancient Town beside the river",
      ],
    },

    tour_mn_phu_quoc_4n3d: {
      translationStatus: "draft",
      title: "Phu Quoc 4 Days 3 Nights",
      summary:
        "Four days of leisure on Vietnam's largest island: beaches, the Hon Thom cable car, and the night market.",
      highlights: [
        "Three nights at a single resort, with no mid-trip change of accommodation",
        "Ride the cable car over the sea to Hon Thom",
        "Visit a traditional fish sauce facility and a pepper farm",
        "Explore the night market and try the local seafood",
        "Afternoons are left open for guests to rest at their own pace",
        "Ideal for a short, slow-paced holiday",
      ],
      overview: [
        "Phu Quoc suits a short, slow-paced holiday. The programme keeps the afternoons open so guests can rest at their own pace.",
      ],
      itinerary: [
        {
          title: "Pick-up – Beach",
          summary: "Check in and rest.",
          activities: [
            "Pick up guests at Phu Quoc airport.",
            "Check in at the resort.",
            "Free time to swim.",
          ],
          meals: ["Dinner"],
          accommodation: "Overnight in Phu Quoc",
          places: ["Phu Quoc"],
        },
        {
          title: "South Island – Hon Thom Cable Car",
          summary: "Explore the south of the island.",
          activities: [
            "Visit a fishing village and a traditional fish sauce facility.",
            "Ride the cable car over the sea to Hon Thom.",
            "Swim and rest on the beach.",
            "Free evening.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Phu Quoc",
          places: ["Hon Thom", "South Island"],
        },
        {
          title: "North Island – Night Market",
          summary: "Explore the north and the evening food scene.",
          activities: [
            "Visit a pepper farm and a pearl farm.",
            "Stop at a northern beach.",
            "Stroll the night market and eat seafood.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Phu Quoc",
          places: ["North Island", "Night Market"],
        },
        {
          title: "Phu Quoc – End",
          summary: "A free morning and departure.",
          activities: [
            "Free morning.",
            "Check out.",
            "See guests off at the airport.",
          ],
          meals: ["Breakfast"],
          places: ["Phu Quoc"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "03 resort nights in the category selected",
        "Meals as listed in the itinerary",
        "Cable car tickets and entrance tickets",
        "An accompanying tour guide",
      ],
      excluded: [
        "Air tickets to and from Phu Quoc",
        "Personal expenses and drinks not listed in the programme",
        "Single-room supplement",
      ],
      notes: [
        "The rainy season in Phu Quoc can affect activities at sea.",
        "Hon Thom cable car times may change with the operating schedule.",
      ],
      tags: ["4 days", "Southern Vietnam", "Leisure", "Islands & beaches"],
      departurePoints: ["Phu Quoc"],
      priceNote:
        "The price depends on the resort category and the season (peak season differs considerably).",
      imageAlts: ["Phu Quoc beach"],
    },

    tour_mn_mien_tay_3n2d: {
      translationStatus: "draft",
      title: "Mekong Delta – Can Tho 3 Days 2 Nights",
      summary:
        "Three days exploring the waterways of the Mekong: Cai Rang floating market, fruit orchards, and craft villages.",
      highlights: [
        "A boat trip to Cai Rang floating market in the early morning",
        "A boat ride around the islets of My Tho on the way to Can Tho",
        "Visit a fruit orchard and taste seasonal fruit",
        "Learn about traditional crafts at local craft villages",
        "Departs from Ho Chi Minh City, ideal for a short two-night trip",
        "Two nights in Can Tho, convenient for the early floating market",
      ],
      overview: [
        "The Mekong Delta is a route for experiencing river culture. The main activities take place in the early morning, when the floating market is busiest.",
      ],
      itinerary: [
        {
          title: "Ho Chi Minh City – My Tho – Can Tho",
          summary: "Travel and make the first stop.",
          activities: [
            "Depart from Ho Chi Minh City.",
            "Take a boat around the islets of My Tho.",
            "Lunch featuring local specialities.",
            "Continue to Can Tho and check in.",
          ],
          meals: ["Lunch", "Dinner"],
          accommodation: "Overnight in Can Tho",
          places: ["My Tho", "Can Tho"],
        },
        {
          title: "Cai Rang Floating Market – Fruit Orchard",
          summary: "The highlight of the trip.",
          activities: [
            "Take a boat to Cai Rang floating market in the early morning.",
            "Stop at a cake-making facility and a craft village.",
            "Visit a fruit orchard and taste seasonal fruit.",
            "Return to the hotel, with the evening free.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Can Tho",
          places: ["Cai Rang"],
        },
        {
          title: "Can Tho – Ho Chi Minh City – End",
          summary: "A free morning and the journey back.",
          activities: [
            "Visit a pagoda or shop at your leisure.",
            "Check out and have lunch.",
            "Return to Ho Chi Minh City, where the programme ends.",
          ],
          meals: ["Breakfast", "Lunch"],
          places: ["Can Tho", "Ho Chi Minh City"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "02 hotel nights in Can Tho",
        "Meals as listed in the itinerary",
        "Boat tours and entrance tickets",
        "An accompanying tour guide",
      ],
      excluded: [
        "Personal expenses",
        "Drinks not listed in the programme",
        "Travel insurance",
      ],
      notes: [
        "Wake up early to reach the floating market; activities end before the heat of the day.",
      ],
      tags: ["3 days", "Southern Vietnam", "Waterways", "Culture"],
      departurePoints: ["Ho Chi Minh City"],
      priceNote:
        "The price depends on the number of guests and the mode of transport from Ho Chi Minh City.",
      imageAlts: ["Boats at Cai Rang floating market, Can Tho"],
    },

    tour_tn_da_lat_4n3d: {
      translationStatus: "draft",
      title: "Da Lat 4 Days 3 Nights",
      summary:
        "Four days in the highland city: pine hills, lakes, flower gardens, and Da Lat coffee.",
      highlights: [
        "A cool climate year-round, ideal for a restful break",
        "Visit Truc Lam Zen Monastery and Tuyen Lam Lake",
        "Stop at Datanla Waterfall and the pine hills on the city's outskirts",
        "Experience coffee at a local roasting facility",
        "A free afternoon around Xuan Huong Lake",
        "Visit Da Lat night market and buy local specialities to take home",
      ],
      overview: [
        "Da Lat has many sights within a short radius. The four-day programme spreads the time across several clusters and leaves the afternoons free.",
      ],
      itinerary: [
        {
          title: "Pick-up – Da Lat City Centre",
          summary: "Check in and stroll around Xuan Huong Lake.",
          activities: [
            "Pick up guests at Lien Khuong airport or the bus station.",
            "Check in at the hotel.",
            "Walk around Xuan Huong Lake.",
            "Visit Da Lat night market.",
          ],
          meals: ["Dinner"],
          accommodation: "Overnight in Da Lat",
          places: ["Xuan Huong Lake", "Night Market"],
        },
        {
          title: "South Da Lat – Waterfall and Monastery",
          summary: "The southern cluster of sights.",
          activities: [
            "Visit Truc Lam Zen Monastery.",
            "Stop at Tuyen Lam Lake.",
            "Visit Datanla Waterfall.",
            "Return to the centre, with the evening free.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Da Lat",
          places: ["Truc Lam", "Tuyen Lam", "Datanla"],
        },
        {
          title: "Flower Garden – Coffee – Pine Hills",
          summary: "A gentle day.",
          activities: [
            "Visit the city flower garden.",
            "Stop at a coffee roasting facility.",
            "Walk among the pine hills and watch the sunset.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Da Lat",
          places: ["Flower Garden", "Pine Hills"],
        },
        {
          title: "Da Lat – End",
          summary: "Shop for specialities and depart.",
          activities: [
            "Buy specialities at the market.",
            "Check out.",
            "See guests off at the airport or bus station.",
          ],
          meals: ["Breakfast"],
          places: ["Da Lat"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "03 hotel nights in the category selected",
        "Meals as listed in the itinerary",
        "Entrance tickets as listed in the programme",
        "An accompanying tour guide",
      ],
      excluded: [
        "Air or bus tickets to Da Lat",
        "Personal expenses",
        "Single-room supplement",
      ],
      notes: ["Da Lat is chilly at night, so bring a light jacket."],
      tags: ["4 days", "Central Highlands", "Leisure", "Cool climate"],
      departurePoints: ["Da Lat"],
      priceNote:
        "The price depends on the hotel category and the season (weekends cost more).",
      imageAlts: ["Xuan Huong Lake seen from Dalat Palace"],
    },

    tour_tn_buon_ma_thuot_3n2d: {
      translationStatus: "draft",
      title: "Buon Ma Thuot – Waterfalls 3 Days 2 Nights",
      summary:
        "Discover the coffee capital of Dak Lak: waterfalls, village life, and gong culture.",
      highlights: [
        "Visit the major waterfalls of Dak Lak",
        "Learn about gong culture and village life",
        "Taste coffee right where it is produced",
        "Stop at the museum and the city's central square",
        "Ideal for travellers who enjoy nature and local culture",
        "Buy coffee and specialities directly at the roasting facility",
      ],
      overview: [
        "Buon Ma Thuot is the centre of Dak Lak, convenient for combining waterfall visits with learning about local culture.",
      ],
      itinerary: [
        {
          title: "Pick-up – Buon Ma Thuot",
          summary: "Check in and get to know the city.",
          activities: [
            "Pick up guests at Buon Ma Thuot airport.",
            "Check in at the hotel.",
            "Visit the museum and the central square.",
          ],
          meals: ["Dinner"],
          accommodation: "Overnight in Buon Ma Thuot",
          places: ["Buon Ma Thuot"],
        },
        {
          title: "Waterfalls – Village",
          summary: "The main sightseeing day.",
          activities: [
            "Visit Dray Nur or Dray Sap waterfall.",
            "Lunch featuring local specialities.",
            "Stop at a village and learn about gong culture.",
            "Return to the hotel, with the evening free.",
          ],
          meals: ["Breakfast", "Lunch"],
          accommodation: "Overnight in Buon Ma Thuot",
          places: ["Dray Nur", "Village"],
        },
        {
          title: "Coffee – End",
          summary: "Visit a coffee facility, then see guests off.",
          activities: [
            "Visit a coffee roasting facility.",
            "Buy specialities and check out.",
            "See guests off at the airport.",
          ],
          meals: ["Breakfast"],
          places: ["Buon Ma Thuot"],
        },
      ],
      included: [
        "Transportation as listed in the programme",
        "02 hotel nights",
        "Meals as listed in the itinerary",
        "Entrance tickets as listed in the programme",
        "An accompanying tour guide",
      ],
      excluded: [
        "Air tickets",
        "Personal expenses",
        "Drinks not listed in the programme",
      ],
      notes: [
        "The paths to some waterfalls have steep sections; wear shoes with good grip.",
      ],
      tags: ["3 days", "Central Highlands", "Nature", "Culture"],
      departurePoints: ["Buon Ma Thuot"],
      priceNote:
        "The price depends on the number of guests and the mode of transport to Dak Lak.",
      imageAlts: ["Dray Nur waterfall, Dak Lak"],
    },
  };
