export type PlanFeature = { label: string; free: boolean | string; premium: boolean | string };

export const planFeatures: PlanFeature[] = [
  { label: "Interactive map with search & zoom", free: true, premium: true },
  { label: "Basic locations & category filters", free: true, premium: true },
  { label: "Discovery details", free: "Summary", premium: "Full details & notes" },
  { label: "Full verified discovery database", free: false, premium: true },
  { label: "Hidden discoveries", free: false, premium: true },
  { label: "Collectibles & mission progress tracking", free: false, premium: true },
  { label: "Personal saved locations", free: false, premium: true },
  { label: "Advanced filters (verification, found, saved)", free: false, premium: true },
  { label: "Future map updates", free: "Public updates", premium: "All updates, for life" },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: "Is ViceCityMap official?",
    a: "No. ViceCityMap is an independent fan project. It is not affiliated with, endorsed by, or sponsored by Rockstar Games or Take-Two Interactive.",
  },
  {
    q: "Is the map content real game data?",
    a: "Not yet. Until a verified, legally usable map source is available we show an original placeholder map, and any sample markers are clearly labelled as demonstration data. Discoveries are only marked “Verified” once they have been confirmed.",
  },
  {
    q: "What does $10 lifetime mean?",
    a: "A single $10 USD payment unlocks Premium on your account permanently, including future map and database updates. There is no subscription and nothing renews.",
  },
  {
    q: "How are payments handled?",
    a: "Checkout is processed by Stripe. We never see or store your card details. Access is granted only after Stripe confirms the payment to our server through a signed webhook.",
  },
  {
    q: "Can I get a refund?",
    a: "Contact support within 14 days of purchase and we’ll review your request. Refunded purchases remove Premium access from the account.",
  },
  {
    q: "Do I need an account to use the map?",
    a: "No. The public map, basic locations and search are free without an account. An account is needed for Premium features like progress tracking and saved locations.",
  },
];
