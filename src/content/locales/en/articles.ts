import type { ArticleTranslationInput } from "@/domain/localization";

/**
 * DRAFT English translations for travel-guide articles.
 *
 * Keyed by the SOURCE record `id` (not the slug). `body` blocks are matched to
 * the Vietnamese source by position, and only text-bearing fields are carried
 * over. `translationStatus: "draft"` means this copy is machine-written and
 * must be reviewed before indexing.
 */
export const articleTranslations: Readonly<
  Record<string, ArticleTranslationInput>
> = {
  art_kinh_nghiem_qn_py: {
    translationStatus: "draft",
    title: "Travel tips for Quy Nhon – Phu Yen for first-time visitors",
    excerpt:
      "A round-up of what to know before a trip to Quy Nhon – Phu Yen: when to go, how to get around, which places to see, and how to plan your itinerary.",
    tags: ["Quy Nhon", "Phu Yen", "Tips"],
    body: [
      {
        text: "Quy Nhon and Phu Yen sit side by side, about 100 km apart by road. That is why the two are often combined in a single trip, even when you only have three days.",
      },
      { text: "When should you go?" },
      {
        text: "The South Central Coast has two fairly distinct seasons. The calm-sea period is usually best for island trips and snorkelling; during the rainier, stormier period, it is better to focus on mainland sights.",
      },
      {
        title: "A note on the rainy season",
        text: "For itineraries with sea activities, check the weather again before departure. Operators usually have an alternative plan if the sea is rough.",
      },
      { text: "Getting to Quy Nhon" },
      {
        items: [
          "By plane: Phu Cat airport is about 30 km from central Quy Nhon.",
          "By train: Dieu Tri station lies on the North–South line.",
          "By coach: many services from provinces in both the south and the north.",
        ],
      },
      { text: "Places worth your time" },
      { text: "The Ky Co – Eo Gio cluster" },
      {
        text: "This is Quy Nhon's most famous cluster, best enjoyed over a full day. Get to the beach early for clear water and to avoid the harsh sun.",
      },
      { text: "Ghenh Da Dia and Bai Xep" },
      {
        text: "Both are in Phu Yen and are often combined in half a day. Ghenh Da Dia stands out for its layered basalt columns; Bai Xep has two rocky slabs jutting into the sea that are easy to recognise.",
      },
      {
        alt: "Layered basalt columns at Ghenh Da Dia",
        caption: "Ghenh Da Dia, Phu Yen's geological highlight.",
      },
      { text: "A suggested three-day itinerary" },
      {
        items: [
          "Day 1: Ky Co – Eo Gio, overnight in Quy Nhon.",
          "Day 2: transfer to Phu Yen and visit Ghenh Da Dia – Bai Xep – O Loan Lagoon.",
          "Day 3: catch sunrise at Mui Dien, then return to Quy Nhon.",
        ],
      },
      {
        title: "A small tip",
        text: "If you have four days, add a morning on the island instead of cramming in more mainland stops. A slower pace is more enjoyable.",
      },
    ],
    coverAlt: "Ghenh Rang coastline, Quy Nhon",
  },

  art_thoi_diem_qn: {
    translationStatus: "draft",
    title: "When is the best time to visit Quy Nhon?",
    excerpt:
      "A look at the pros and cons of each period of the year so you can choose the timing that suits your kind of trip.",
    tags: ["Quy Nhon", "Timing", "Tips"],
    body: [
      {
        text: "There is no single answer to the question of which month is best for Quy Nhon, because it depends on whether you want to swim, head out to the islands, or simply wander the city.",
      },
      { text: "If you want to visit the islands and snorkel" },
      {
        text: "Prioritise the calm-sea period. This is the most important factor, because boats and speedboats may be postponed when the sea is rough, no matter how far in advance you booked.",
      },
      { text: "If you want to avoid the crowds" },
      {
        text: "Major holidays tend to push up room prices and fill the beaches. Travelling a few days either side of a holiday usually gives a much nicer experience.",
      },
      {
        title: "Do not look at the temperature alone",
        text: "The midday sun in Central Vietnam is quite strong. Even if the forecast does not look very hot, plan outdoor activities for the early morning and late afternoon.",
      },
      { text: "How to check before you lock in your dates" },
      {
        items: [
          "Check the weather forecast about a week before you travel.",
          "Ask the organiser about an alternative plan if the sea is rough.",
          "Choose a hotel with a clear refund or cancellation policy if you travel in the rainy season.",
        ],
      },
    ],
    coverAlt: "Ghenh Rang coastline, Quy Nhon",
  },

  art_an_gi_o_qn: {
    translationStatus: "draft",
    title: "What to eat in Quy Nhon: dishes worth trying",
    excerpt:
      "A list of local dishes and tips for planning your meals through the day so you do not miss Quy Nhon's specialities.",
    tags: ["Quy Nhon", "Food"],
    body: [
      {
        text: "Quy Nhon's food revolves around fresh seafood and side dishes with the bold flavours of Central Vietnam. Prices can vary by season and by vendor, so ask before you order.",
      },
      { text: "Morning" },
      {
        items: [
          "Banh xeo tom nhay (sizzling shrimp pancake), Quy Nhon's famous speciality.",
          "Fish cake noodle soup, a light choice for the morning.",
        ],
      },
      { text: "Lunch and dinner" },
      {
        items: [
          "Grilled seafood at seaside restaurants.",
          "Chicken rice and other local rice dishes.",
          "Che (sweet soup) and street desserts.",
        ],
      },
      {
        title: "Ask the price first",
        text: "For seafood sold by weight, ask about the price and weight before it is cooked to avoid unexpected charges.",
      },
    ],
    coverAlt: "Ghenh Rang coastline, Quy Nhon",
  },

  art_di_chuyen_qn: {
    translationStatus: "draft",
    title: "How do you get to Quy Nhon?",
    excerpt:
      "Comparing plane, train, and coach travel to Quy Nhon, with notes on travel time and distance to the centre.",
    tags: ["Quy Nhon", "Getting around"],
    body: [
      {
        text: "There are three main ways to reach Quy Nhon. Each suits a different kind of trip in terms of time and budget.",
      },
      { text: "By plane" },
      {
        text: "The fastest option, best when you have only a few days. Phu Cat airport is about 30 km from the city centre, so allow extra time for the transfer by car.",
      },
      { text: "By train" },
      {
        text: "Dieu Tri station lies on the North–South line. The train suits you if you want to take in the scenery along the way and do not mind a long journey.",
      },
      { text: "By coach" },
      {
        text: "Flexible in terms of departure times and pick-up points, but the journey is longer. Choose a sleeper coach for the long haul.",
      },
      {
        title: "Combining Quy Nhon and Phu Yen",
        text: "If you visit both provinces, decide in advance where you will fly in and out so you do not have to return to your starting point.",
      },
    ],
    coverAlt: "Ghenh Rang coastline, Quy Nhon",
  },

  art_ghenh_da_dia_bai_xep: {
    translationStatus: "draft",
    title: "Ghenh Da Dia and Bai Xep in one day",
    excerpt:
      "How to fit Phu Yen's two signature sights into a single unhurried day, with suggested timings.",
    tags: ["Phu Yen", "Itinerary"],
    body: [
      {
        text: "Ghenh Da Dia and Bai Xep are fairly close together, so it is entirely possible to visit both in one day if you plan the timing well.",
      },
      { text: "Morning: Ghenh Da Dia" },
      {
        text: "Arrive early, as the area is quite exposed and the sun climbs quickly. Take care walking on the rocks, since the surface can be slippery.",
      },
      { text: "Afternoon: Bai Xep" },
      {
        text: "Bai Xep is small and more pleasant in the afternoon. It is also a good spot to rest and eat seafood nearby.",
      },
      {
        items: [
          "Early morning: Ghenh Da Dia.",
          "Midday: eat in the O Loan Lagoon area.",
          "Afternoon: Bai Xep, then back to your accommodation.",
        ],
      },
      {
        title: "Safety on the rocks",
        text: "Do not stand too close to the water's edge when the waves are high. The basalt area can be slippery after rain.",
      },
    ],
    coverAlt: "Bai Xep beach, Phu Yen",
  },
};
