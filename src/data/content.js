import {
  Flame, ShieldAlert, Sparkles, UtensilsCrossed, Wheat, Salad, Layers,
  PackagePlus, Drumstick, Droplet, Droplets, Users, LifeBuoy,
  List,
} from "lucide-react";

export const KITCHEN_MODULES = [
  {
    id: "fire", title: "Morning Charcoal Fire", icon: Flame, color: "#D9662C", items: [
      { label: "How to start the charcoal fire", duration: "2:20", done: true },
    ]
  },
  {
    id: "fryer", title: "Fryer Oil Setup", icon: Droplet, color: "#C4471F", items: [
      { label: "Filling & changing fryer oil", duration: "1:45", done: false },
    ]
  },
  {
    id: "hotfood", title: "Hot Food Ready", icon: UtensilsCrossed, color: "#E3A94A", items: [
      { label: "Scallop potatoes", duration: "3:10", done: false },
      { label: "Mac and cheese", duration: "2:50", done: false },
      { label: "Roasted veg", duration: "2:15", done: false },
    ]
  },
  {
    id: "pastarice", title: "Backup Pasta & Rice", icon: Wheat, color: "#B8862F", items: [
      { label: "Cooking backup pasta & rice for chicken", duration: "2:30", done: false },
    ]
  },
  {
    id: "saladprep", title: "Salad Preparation", icon: Salad, color: "#5B6E3F", items: [
      { label: "Greek salad", duration: "1:50", done: false },
      { label: "Pesto pasta salad", duration: "2:05", done: false },
      { label: "Beetroot salad", duration: "1:40", done: false },
      { label: "Slaw salad", duration: "1:35", done: false },
      { label: "7 mix beans salad", duration: "1:55", done: false },
      { label: "Chicken avocado salad", duration: "2:10", done: false },
      { label: "Tabouli salad", duration: "2:00", done: false },
    ]
  },
  {
    id: "saladbar", title: "Salad Bar Setup", icon: Layers, color: "#7C8F52", items: [
      { label: "Tomato slices for souvlaki & burgers (4 Tubs)", duration: "1:20", done: false },
      { label: "Chopped onion (3 Tubs)", duration: "1:10", done: false },
      { label: "Lettuce (3 Tubs)", duration: "1:05", done: false },
      { label: "2 tubs of tzatziki", duration: "1:00", done: false },
      { label: "5 takeaway containers of tzatziki", duration: "1:00", done: false },
    ]
  },
  {
    id: "backup", title: "Backup Prep", icon: PackagePlus, color: "#8A6A3E", items: [
      { label: "Chopped cucumber & tomato for Greek salad (1 Med Tubs Each)", duration: "1:40", done: false },
      { label: "Mixed grass (capsicum, celery, parsley)", duration: "1:50", done: false },
      { label: "Roasted veg prep (4 Tubs Daily)", duration: "1:45", done: false },
      { label: "Scallop potatoes backup (1 Big Tray and 1 Small Tray)", duration: "1:55", done: false },
    ]
  },
  {
    id: "marination", title: "Marination", icon: Drumstick, color: "#D9662C", items: [
      { label: "Chicken marination", duration: "3:10", done: true },
      { label: "Lamb marination", duration: "3:05", done: false },
    ]
  },
  {
    id: "tzatziki", title: "Tzatziki Sauce", icon: Droplets, color: "#6E8A8A", items: [
      { label: "Making tzatziki sauce", duration: "2:00", done: false },
    ]
  },
  {
  id: "chickensalt", title: "Chicken Salt", icon: Sparkles, color: "#b46f52", items: [
  { label: "Mixing chicken salt", duration: "2:00", done: false },
  ]
  },
];

export const SAFETY_MODULES = [
  {
    id: "hygiene", title: "Safety & Hygiene", icon: ShieldAlert, color: "#5B6E3F", items: [
      { label: "Food safety & hygiene basics", duration: "3:00", done: false },
    ]
  },
  {
    id: "conduct", title: "Workplace Conduct", icon: Users, color: "#8A6A3E", items: [
      { label: "Bullying & harassment — what not to do", duration: "2:30", done: false },
    ]
  },
  {
  id: "support",
  title: "Help & Support — Who Can I Talk To?",
  icon: LifeBuoy,
  color: "#6E8A8A",
  items: [
    { label: "👤 Talk to your supervisor or manager" },
    { label: "🦺 Report hazards, injuries and unsafe situations" },
    { label: "🤝 Ask for help if you are unsure how to perform a task" },
    { label: "🧠 Speak up if work is affecting your mental wellbeing" },
    { label: "🚨 Report bullying, harassment or inappropriate behaviour" },
    { label: "📋 Know your workplace's reporting procedure" },
    { label: "🏥 Seek appropriate medical help after an injury" },
    { label: "🛡️ Know that WorkSafe Victoria provides workplace safety information and support" },
  ]
  },
];

export const FRONT_CHECKLIST = [
  "Wipe down back wall",
  "Bring up 4 bags of charcoal",
  "Clean chicken machine",
  "Clean grill",
  "Change & clean all 5 bins",
  "Clean chip bin & store in cool room",
  "Wipe down all tables inside & outside",
  "Sweep & mop front floor with green mop",
  "Replace all lids with fresh & clean lids",
  "Wipe down bottom of chip holder bench",
  "Wipe down machinery",
  "Wipe bottom of grill",
  "Replace salad bar container lids",
  "Store all raw chicken products in cool room",
  "Wipe down Cold Bain Marie doors",
  "Wipe down blue cabinet doors & drawers",
  "Check overflow buckets near rods & souvlaki area",
  "Wipe bottom of Hot Bain Marie & inside Cold Bain Marie",
  "Wipe down tops of Bain Maries",
  "Windex all windows & glass on Cold Bain Marie",
  "Wipe down all stainless-steel benches",
  "Remove gunk, dirt & salt from Bain Marie corners",
  "Clean green scoop & hand brooms",
  "Remove rubbish from green scoop & brooms",
  "Put all bins back in allocated spots",
  "Refill both chicken salt shakers",
  "Sweep around charcoal machine & under chip machines",
  "Sweep & mop back of shop with yellow bucket",
  "Refill drink fridge if time allows",
  "Bring outdoor furniture inside",
  "Turn music off",
  "Turn rice cooker off",
  "Turn off lights to both Bain Maries",
  "Turn outside lights & signage off",
  "Turn all downstairs & office lights off",
  "Turn charcoal machines off",
  "Check all fryers are off",
  "Check all grills are off",
  "Ensure cool room door is shut securely",
  "Lock up securely",
  "Tidy entire front of house",
  "Clean all sinks",
  "Put blue cloths & sponges back in their proper places"
];

export const BACK_CHECKLIST = [
  "All rods must be cleaned",
  "All spikes must be soaked in caustic soda or cleaned",
  "Cool room floor must be mopped",
  "Kitchen aprons must be wiped down",
  "All blue cloths must be washed & soaked in soapy water at the end of each shift",
  "Cool room door handles must be cleaned and sanitised",
  "All benches must be sanitised at the end of each night",
  "Do not put bins by back staircase - this is a safety hazard",
  "Rice cooker must be off and cleaned",
  "All dishes & cutlery must be stored away correctly",
  "Kitchen area must be swept & mopped correctly at the end of each night to avoid pest control problems",
  "Area where the rice cooker lives must be cleaned and cleared because it's part of the kitchen",
  "Black mats - sweep",
  "Grey trolley - cleaned & cleared (at end of every night)",
  "Clean black fridge doors & sides",
  "Wipe Down All the Prep Benches",
  "Empty and Reline Kitchen Bins"
];

// Replace YOUR_VIDEO_ID with real YouTube video IDs (from youtube.com/watch?v=THIS_PART)
export const YOUTUBE_VIDEOS = {
  fire: ["https://www.youtube.com/watch?v=YOUR_VIDEO_ID"],
  fryer: ["https://www.youtube.com/watch?v=YOUR_VIDEO_ID"],
  hotfood: [
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
  ],
  pastarice: ["https://www.youtube.com/watch?v=YOUR_VIDEO_ID"],
  saladprep: [
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
  ],
  saladbar: [
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
  ],
  backup: [
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
  ],
  marination: [
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
  ],
  chickensalt: ["https://www.youtube.com/watch?v=TW-FqCTMpnE"],
  tzatziki: ["https://www.youtube.com/watch?v=YOUR_VIDEO_ID"],
  hygiene: ["https://www.youtube.com/watch?v=RUeVNCEDbCo"],
  conduct: ["https://www.youtube.com/watch?v=wdlbNahE8s8&t=30s"],
  support: ["https://www.youtube.com/watch?v=YOUR_VIDEO_ID"],
};

export function getVideoUrl(modId, idx) {
  return YOUTUBE_VIDEOS[modId]?.[idx] || "";
}
