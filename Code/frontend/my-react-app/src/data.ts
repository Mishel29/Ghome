export interface Property {
  id: string;
  name: string;
  location: string;
  county: string;
  postalCode?: string;
  address: string;
  status: "on-sale" | "coming-soon" | "sold-out" | "offline" | "draft";
  type: string;
  saleType?: string;
  price: { min: number; max: number };
  beds: number[];
  baths: number[];
  image: string;
  photos: string[];
  videoUrl?: string;
  historyIsSynthetic?: boolean;
  overlayColor: string;
  description: string;
  features: string[];
  stage: "Planning" | "Under Construction" | "Ready to Move" | "Not specified";
  completionYear?: number | null;
  listedDate: string;
  sqft: { min: number; max: number };
  agent: string;
  valueGrowth: { year: string; value: number; growth: number }[];
  interestCount: number;
  clickCount: number;
  saveCount: number;
  campaigned: boolean;
}

export const properties: Property[] = [
  {
    id: "meridian-01",
    name: "The Meridian",
    location: "Dublin City Centre",
    county: "Dublin",
    address: "Grand Canal Dock, Dublin 2",
    status: "on-sale",
    type: "1, 2 & 3 Bedroom Apartments",
    price: { min: 395000, max: 650000 },
    beds: [1, 2, 3],
    baths: [1, 2],
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=800&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&h=800&fit=crop&auto=format",
    ],
    overlayColor: "rgba(74,103,65,0.78)",
    description:
      "Contemporary waterfront living at Grand Canal Dock. The Meridian offers striking modern apartments with exceptional amenity spaces and unrivalled views over the water.",
    features: ["Concierge service", "Rooftop terrace", "Gym & wellness suite", "Underground parking", "Cycle storage", "EV charging"],
    stage: "Ready to Move",
    listedDate: "2024-03-01",
    sqft: { min: 520, max: 1100 },
    agent: "Sarah O'Brien",
    valueGrowth: [
      { year: "2020", value: 340000, growth: 0 },
      { year: "2021", value: 358000, growth: 5.3 },
      { year: "2022", value: 382000, growth: 6.7 },
      { year: "2023", value: 412000, growth: 7.9 },
      { year: "2024", value: 450000, growth: 9.2 },
      { year: "2025", value: 495000, growth: 10.0 },
    ],
    interestCount: 47,
    clickCount: 312,
    saveCount: 89,
    campaigned: true,
  },
  {
    id: "oakfield-02",
    name: "Oakfield Manor",
    location: "Sandyford",
    county: "Dublin",
    address: "Sandyford Business District, Dublin 18",
    status: "on-sale",
    type: "3 & 4 Bedroom Homes",
    price: { min: 520000, max: 780000 },
    beds: [3, 4],
    baths: [2, 3],
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop&auto=format",
    ],
    overlayColor: "rgba(107,43,76,0.78)",
    description:
      "Elegant family homes set within mature oak woodlands. Oakfield Manor blends thoughtful architecture with the tranquility of established green surroundings.",
    features: ["A-rated energy", "South-facing gardens", "Double garage", "Premium kitchen", "Smart home system", "Walk to LUAS"],
    stage: "Under Construction",
    listedDate: "2024-05-15",
    sqft: { min: 1250, max: 1800 },
    agent: "James Kelleher",
    valueGrowth: [
      { year: "2020", value: 460000, growth: 0 },
      { year: "2021", value: 490000, growth: 6.5 },
      { year: "2022", value: 528000, growth: 7.8 },
      { year: "2023", value: 570000, growth: 7.9 },
      { year: "2024", value: 625000, growth: 9.6 },
      { year: "2025", value: 680000, growth: 8.8 },
    ],
    interestCount: 33,
    clickCount: 228,
    saveCount: 64,
    campaigned: true,
  },
  {
    id: "riverside-03",
    name: "River's Edge",
    location: "Cork City",
    county: "Cork",
    address: "Marina Park, Cork City",
    status: "coming-soon",
    type: "Studios, 1 & 2 Bedroom Apartments",
    price: { min: 285000, max: 450000 },
    beds: [0, 1, 2],
    baths: [1, 2],
    image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&h=800&fit=crop&auto=format"],
    overlayColor: "rgba(27,42,74,0.78)",
    description:
      "A stunning new riverside quarter bringing premium urban living to Cork's waterfront. Launching Q3 2025.",
    features: ["River views", "Residents lounge", "Roof garden", "Secure parking", "Bike storage"],
    stage: "Planning",
    listedDate: "2024-07-01",
    sqft: { min: 380, max: 820 },
    agent: "Aoife Murphy",
    valueGrowth: [
      { year: "2020", value: 240000, growth: 0 },
      { year: "2021", value: 255000, growth: 6.3 },
      { year: "2022", value: 272000, growth: 6.7 },
      { year: "2023", value: 295000, growth: 8.5 },
      { year: "2024", value: 320000, growth: 8.5 },
      { year: "2025", value: 348000, growth: 8.8 },
    ],
    interestCount: 62,
    clickCount: 445,
    saveCount: 103,
    campaigned: false,
  },
  {
    id: "willows-04",
    name: "The Willows",
    location: "Salthill",
    county: "Galway",
    address: "Salthill Road, Galway City",
    status: "on-sale",
    type: "2, 3 & 4 Bedroom Homes",
    price: { min: 340000, max: 580000 },
    beds: [2, 3, 4],
    baths: [1, 2, 3],
    image: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&h=800&fit=crop&auto=format"],
    overlayColor: "rgba(74,103,65,0.78)",
    description:
      "Beautifully crafted family homes moments from Salthill Promenade and Galway Bay.",
    features: ["Sea views (select homes)", "A2 energy rating", "Landscaped gardens", "Near schools & amenities"],
    stage: "Ready to Move",
    listedDate: "2024-01-20",
    sqft: { min: 980, max: 1550 },
    agent: "Ciarán Walsh",
    valueGrowth: [
      { year: "2020", value: 290000, growth: 0 },
      { year: "2021", value: 308000, growth: 6.2 },
      { year: "2022", value: 330000, growth: 7.1 },
      { year: "2023", value: 358000, growth: 8.5 },
      { year: "2024", value: 392000, growth: 9.5 },
      { year: "2025", value: 428000, growth: 9.2 },
    ],
    interestCount: 28,
    clickCount: 198,
    saveCount: 52,
    campaigned: true,
  },
  {
    id: "sycamore-05",
    name: "Sycamore Park",
    location: "Dooradoyle",
    county: "Limerick",
    address: "Dooradoyle Road, Limerick",
    status: "on-sale",
    type: "2 & 3 Bedroom Homes",
    price: { min: 295000, max: 425000 },
    beds: [2, 3],
    baths: [1, 2],
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=800&fit=crop&auto=format"],
    overlayColor: "rgba(232,118,27,0.78)",
    description:
      "Affordable family homes in a thriving Limerick suburb. Sycamore Park puts exceptional value at the heart of every home.",
    features: ["A-rated energy", "Open-plan living", "Generous garden", "EV charger ready", "Near UL campus"],
    stage: "Ready to Move",
    listedDate: "2023-11-10",
    sqft: { min: 850, max: 1200 },
    agent: "Niamh Collins",
    valueGrowth: [
      { year: "2020", value: 240000, growth: 0 },
      { year: "2021", value: 254000, growth: 5.8 },
      { year: "2022", value: 272000, growth: 7.1 },
      { year: "2023", value: 295000, growth: 8.5 },
      { year: "2024", value: 322000, growth: 9.2 },
      { year: "2025", value: 350000, growth: 8.7 },
    ],
    interestCount: 19,
    clickCount: 145,
    saveCount: 38,
    campaigned: false,
  },
  {
    id: "coastal-06",
    name: "Coastal View",
    location: "Bray",
    county: "Wicklow",
    address: "Bray Seafront, Co. Wicklow",
    status: "sold-out",
    type: "1, 2 & 3 Bedroom Apartments",
    price: { min: 380000, max: 560000 },
    beds: [1, 2, 3],
    baths: [1, 2],
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop&auto=format"],
    overlayColor: "rgba(107,43,76,0.78)",
    description:
      "A sold-out seafront development in the heart of Bray. Outstanding sea views and DART connectivity.",
    features: ["Sea views", "DART access", "Balconies", "Underground parking", "Landscaped courtyard"],
    stage: "Ready to Move",
    listedDate: "2023-06-15",
    sqft: { min: 490, max: 950 },
    agent: "Sarah O'Brien",
    valueGrowth: [
      { year: "2020", value: 320000, growth: 0 },
      { year: "2021", value: 340000, growth: 6.3 },
      { year: "2022", value: 368000, growth: 8.2 },
      { year: "2023", value: 402000, growth: 9.2 },
      { year: "2024", value: 440000, growth: 9.5 },
      { year: "2025", value: 482000, growth: 9.5 },
    ],
    interestCount: 0,
    clickCount: 89,
    saveCount: 22,
    campaigned: true,
  },
  {
    id: "hazel-07",
    name: "Hazel Grove",
    location: "Naas",
    county: "Kildare",
    address: "Monread Road, Naas, Co. Kildare",
    status: "offline",
    type: "3 & 4 Bedroom Homes",
    price: { min: 420000, max: 590000 },
    beds: [3, 4],
    baths: [2, 3],
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=800&fit=crop&auto=format"],
    overlayColor: "rgba(74,103,65,0.78)",
    description:
      "Spacious family homes in the heart of Naas with easy access to the M7 motorway and Kildare Village.",
    features: ["A-rated energy", "Landscaped estates", "Near Naas town", "M7 access"],
    stage: "Under Construction",
    listedDate: "2025-01-15",
    sqft: { min: 1100, max: 1650 },
    agent: "James Kelleher",
    valueGrowth: [
      { year: "2020", value: 360000, growth: 0 },
      { year: "2021", value: 382000, growth: 6.1 },
      { year: "2022", value: 408000, growth: 6.8 },
      { year: "2023", value: 440000, growth: 7.8 },
      { year: "2024", value: 478000, growth: 8.6 },
      { year: "2025", value: 520000, growth: 8.8 },
    ],
    interestCount: 8,
    clickCount: 54,
    saveCount: 15,
    campaigned: false,
  },
];

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  publishDate: string;
  activeDate: string;
  image: string;
  relatedProperties: string[];
  published: boolean;
}

export const newsArticles: NewsArticle[] = [
  {
    id: "news-01",
    title: "Harborstone Homes Wins Best Developer at Irish Property Awards 2025",
    summary: "We're thrilled to announce recognition as Ireland's leading residential developer for the third consecutive year.",
    content:
      "Harborstone Homes has been named Best Residential Developer at this year's Irish Property Awards. The award recognises our commitment to quality construction, sustainable design, and community-focused developments across Ireland.",
    publishDate: "2025-08-15",
    activeDate: "2025-08-15",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=500&fit=crop&auto=format",
    relatedProperties: ["meridian-01", "oakfield-02"],
    published: true,
  },
  {
    id: "news-02",
    title: "River's Edge Cork: Planning Permission Secured",
    summary: "Delighted to confirm planning permission has been granted for our ambitious Cork Marina development.",
    content:
      "Following a thorough planning process, Cork City Council has granted full planning permission for River's Edge at Marina Park. Construction is set to begin Q1 2026 with first completions expected Q3 2027.",
    publishDate: "2025-07-22",
    activeDate: "2025-07-22",
    image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&h=500&fit=crop&auto=format",
    relatedProperties: ["riverside-03"],
    published: true,
  },
  {
    id: "news-03",
    title: "Help to Buy Scheme Extended: What It Means for First-Time Buyers",
    summary: "The government has extended the Help to Buy scheme through 2026. Here's everything you need to know.",
    content:
      "The Irish government's Help to Buy scheme has been extended for a further year, allowing first-time buyers to claim back up to €30,000 in income tax and DIRT paid over the previous four years.",
    publishDate: "2025-06-10",
    activeDate: "2025-06-10",
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=500&fit=crop&auto=format",
    relatedProperties: ["sycamore-05", "willows-04"],
    published: true,
  },
  {
    id: "news-04",
    title: "Hazel Grove Kildare: Construction Update",
    summary: "Phase 1 of Hazel Grove is progressing well, with 24 homes now at roof stage.",
    content:
      "We are pleased to share the latest construction update for Hazel Grove in Naas. Phase 1 homes are tracking well for Q2 2026 completion. Show homes will open for viewing in January 2026.",
    publishDate: "2025-09-01",
    activeDate: "2025-09-01",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=500&fit=crop&auto=format",
    relatedProperties: ["hazel-07"],
    published: false,
  },
];

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subscribedDate: string;
  unsubscribed: boolean;
  unsubscribedDate?: string;
}

export const subscribers: Subscriber[] = [
  { id: "s01", name: "Aoife Brennan", email: "aoife.brennan@gmail.com", phone: "087-123-4567", subscribedDate: "2024-11-15", unsubscribed: false },
  { id: "s02", name: "Cian Murphy", email: "cian.murphy@outlook.com", subscribedDate: "2024-12-01", unsubscribed: false },
  { id: "s03", name: "Siobhán Kelly", email: "siobhan.kelly@gmail.com", phone: "086-987-6543", subscribedDate: "2025-01-08", unsubscribed: false },
  { id: "s04", name: "Darragh O'Connor", email: "darragh.oconnor@gmail.com", subscribedDate: "2025-01-20", unsubscribed: false },
  { id: "s05", name: "Niamh Walsh", email: "niamh.walsh@yahoo.com", phone: "089-456-7890", subscribedDate: "2025-02-05", unsubscribed: false },
  { id: "s06", name: "Fionn Doyle", email: "fionn.doyle@gmail.com", subscribedDate: "2025-02-18", unsubscribed: true, unsubscribedDate: "2025-05-10" },
  { id: "s07", name: "Roisín McCarthy", email: "roisin.mccarthy@gmail.com", phone: "085-321-6547", subscribedDate: "2025-03-02", unsubscribed: false },
  { id: "s08", name: "Tadhg Flaherty", email: "tadhg.flaherty@gmail.com", subscribedDate: "2025-03-14", unsubscribed: false },
  { id: "s09", name: "Caoimhe Ryan", email: "caoimhe.ryan@outlook.com", phone: "083-765-4321", subscribedDate: "2025-04-01", unsubscribed: true, unsubscribedDate: "2025-07-15" },
  { id: "s10", name: "Seán Burke", email: "sean.burke@gmail.com", subscribedDate: "2025-04-22", unsubscribed: false },
];

export interface Campaign {
  id: string;
  subject: string;
  status: "sent" | "draft" | "failed";
  sentDate?: string;
  properties: string[];
  clickCount: number;
  interestCount: number;
  saveCount: number;
  emailsSent: number;
  emailsFailed: number;
  dailyStats: { date: string; sent: number; clicks: number; interests: number; unsubscribes: number }[];
}

export const campaigns: Campaign[] = [
  {
    id: "camp-01",
    subject: "New Homes Available at The Meridian & Oakfield Manor",
    status: "sent",
    sentDate: "2025-05-10",
    properties: ["meridian-01", "oakfield-02"],
    clickCount: 124,
    interestCount: 18,
    saveCount: 34,
    emailsSent: 8,
    emailsFailed: 0,
    dailyStats: [
      { date: "10 May", sent: 8, clicks: 52, interests: 8, unsubscribes: 0 },
      { date: "11 May", sent: 0, clicks: 38, interests: 6, unsubscribes: 1 },
      { date: "12 May", sent: 0, clicks: 20, interests: 4, unsubscribes: 0 },
      { date: "13 May", sent: 0, clicks: 14, interests: 0, unsubscribes: 0 },
    ],
  },
  {
    id: "camp-02",
    subject: "Summer Showcase: The Willows & Sycamore Park",
    status: "sent",
    sentDate: "2025-06-20",
    properties: ["willows-04", "sycamore-05"],
    clickCount: 87,
    interestCount: 11,
    saveCount: 22,
    emailsSent: 8,
    emailsFailed: 1,
    dailyStats: [
      { date: "20 Jun", sent: 8, clicks: 40, interests: 5, unsubscribes: 1 },
      { date: "21 Jun", sent: 0, clicks: 28, interests: 4, unsubscribes: 0 },
      { date: "22 Jun", sent: 0, clicks: 19, interests: 2, unsubscribes: 0 },
    ],
  },
  {
    id: "camp-03",
    subject: "River's Edge Cork — Register Your Interest Early",
    status: "draft",
    properties: ["riverside-03"],
    clickCount: 0,
    interestCount: 0,
    saveCount: 0,
    emailsSent: 0,
    emailsFailed: 0,
    dailyStats: [],
  },
];

export interface Interest {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  date: string;
  agent: string;
  emailSent: boolean;
  dataConsent: boolean;
}

export const interests: Interest[] = [
  { id: "int-01", propertyId: "meridian-01", name: "Aoife Brennan", email: "aoife.brennan@gmail.com", phone: "087-123-4567", message: "Interested in a 2-bed on a high floor with water views.", date: "2025-07-01", agent: "Sarah O'Brien", emailSent: true, dataConsent: true },
  { id: "int-02", propertyId: "meridian-01", name: "Cian Murphy", email: "cian.murphy@outlook.com", message: "Looking for a 1-bed investment unit.", date: "2025-07-05", agent: "Sarah O'Brien", emailSent: false, dataConsent: true },
  { id: "int-03", propertyId: "oakfield-02", name: "Siobhán Kelly", email: "siobhan.kelly@gmail.com", phone: "086-987-6543", message: "Need a 4-bed for growing family.", date: "2025-07-08", agent: "James Kelleher", emailSent: true, dataConsent: true },
  { id: "int-04", propertyId: "riverside-03", name: "Darragh O'Connor", email: "darragh.oconnor@gmail.com", message: "Very interested in the studio apartments.", date: "2025-07-10", agent: "Aoife Murphy", emailSent: false, dataConsent: true },
  { id: "int-05", propertyId: "willows-04", name: "Niamh Walsh", email: "niamh.walsh@yahoo.com", phone: "089-456-7890", message: "Looking for a 3-bed near good schools.", date: "2025-07-12", agent: "Ciarán Walsh", emailSent: true, dataConsent: true },
  { id: "int-06", propertyId: "meridian-01", name: "Roisín McCarthy", email: "roisin.mccarthy@gmail.com", message: "3-bed apartment, ground-floor preferred.", date: "2025-08-02", agent: "Sarah O'Brien", emailSent: false, dataConsent: true },
  { id: "int-07", propertyId: "sycamore-05", name: "Seán Burke", email: "sean.burke@gmail.com", message: "First-time buyer, 2-bed preferred.", date: "2025-08-14", agent: "Niamh Collins", emailSent: false, dataConsent: true },
];

export const appUsers = [
  { id: "user-01", name: "Test User", email: "user@harborstone.ie", password: "password", role: "user" as const },
  { id: "admin-01", name: "Admin User", email: "admin@harborstone.ie", password: "admin123", role: "admin" as const },
];

export const fmt = (n: number) =>
  "€" + n.toLocaleString("en-IE");
