// ==========================================================================
// K95 CLONE & PALAK SILAWAT ARCHIVE DATA
// Curated by pippostyles • Founded June 4, 2025
// Strictly NO emojis • Pure typographic and visual fidelity
// ==========================================================================

export let projects = [];

export const studio = {
  title: "STORY",
  subtitle: "THE STORY BEHIND THIS FANPAGE",
  image: "/assets/images/pic_1788018245147_1.png",
  founded: "June 4, 2025",
  founder: "pippostyles",
  influencer: "palaksilawat",
  location: "Based in India",
  headlineTop: { word1: "HOW", sub1: "IN OUR", sub2: "PAGE", word2: "WE" },
  headlineBottom: { word: "CURATE", sub: "STORIES" },
  leadStory: [
    "The journey began on Instagram on June 4, 2025, when I created my very first fanpage dedicated to palaksilawat. I was genuinely excited to start something of my own for someone I admire so much, and that was the beginning of a journey that has become very special to me.",
    "The fanpage, pippostyles, started with a simple purpose: to appreciate palaksilawat, share her photographs and memorable moments, and create a space dedicated to celebrating her.",
    "As a dedicated No. 1 fan, I have continued to follow her journey closely and regularly share photographs, edits, and moments that I find special. Over time, I began collecting not only recent pictures but also older photographs that had been shared online and could easily be forgotten."
  ],
  cookStory: [
    "This site is an extension of that journey. Over time, I have collected photographs of palaksilawat from different moments she has shared publicly online, preserving little moments from different points in time that could otherwise become difficult to find.",
    "Every photograph here has been collected because it caught my attention or became a moment worth remembering. The idea is to create a growing collection where these moments can be discovered, revisited, and appreciated together rather than being lost among years of posts and updates.",
    "This is only the beginning. The collection will continue to grow as I discover more photographs, videos, memorable clips, and edits, dedicated to celebrating palaksilawat."
  ],
  chapters: [
    {
      title: "The Story Behind This Fanpage",
      desc: "The journey began on Instagram on June 4, 2025, when I created my very first fanpage dedicated to palaksilawat. Started with a simple purpose: to appreciate palaksilawat, share her photographs and memorable moments, and create a space dedicated to celebrating her as a dedicated No. 1 fan."
    },
    {
      title: "A Collection of Her Moments",
      desc: "This site is an extension of that journey. Over time, I have collected photographs of palaksilawat from different moments she has shared publicly online, preserving little moments from different points in time so they can be discovered, revisited, and appreciated together."
    },
    {
      title: "More to Come",
      desc: "This is only the beginning. The collection will continue to grow as I discover more photographs and as palaksilawat shares new moments. I also plan to add videos, memorable clips, edits, and other content in the future, making this a more complete collection."
    },
    {
      title: "Made by a Fan Dedicated to Palak Silawat",
      desc: "What started with my first fanpage on Instagram has now grown into something I am continuing to build with the same excitement and admiration from the very beginning. A collection made by a fan, filled with moments worth remembering, and dedicated to celebrating palaksilawat. This is a fan made project and is not officially affiliated with palaksilawat."
    }
  ],
  milestones: [
    { project: "First Fanpage Created (pippostyles)", event: "The Journey Began", entity: "Instagram", year: "June 4, 2025" },
    { project: "Curating Rare and Online Moments", event: "Memories Collection", entity: "Digital Archive", year: "2025" },
    { project: "Interactive 3D Tribute Space", event: "Dedicated Site Launch", entity: "pippostyles", year: "2026" },
    { project: "Expanding Photos, Clips and Edits", event: "More to Come", entity: "Ongoing Journey", year: "Future" }
  ]
};

export const contact = {
  instagram: "https://instagram.com/pippostyles",
  creatorHandle: "@pippostyles",
  influencerHandle: "@palaksilawat",
  influencerUrl: "https://instagram.com/palaksilawat",
  address: "Based in India",
  legal: "© 2026 Dedicated to Palak Silawat, Curated by pippostyles",
  socials: [
    { label: "pippostyles (Creator)", url: "https://instagram.com/pippostyles" },
    { label: "Palak Silawat (Influencer)", url: "https://instagram.com/palaksilawat" },
    { label: "Instagram", url: "https://instagram.com/pippostyles" }
  ]
};

export const translations = {
  en: {
    nav_pics: "All Pics",
    nav_story: "Story",
    nav_contact: "Contact",
    btn_rings: "Rings",
    btn_spiral: "Spiral",
    focal_label: "selected Moments",
    home_h1: "MM Digital Archive and Memories",
    home_tag: "HOUSE OF MEMORIES",
    all_pics_title: "All Pics",
    grid: "Grid",
    list: "List",
    story_title: "Story",
    contacts_title: "Contact",
    back_to_space: "Back to Space",
    next_memory: "Next Pic",
    view_pic: "View Pic",
    memories_count: "Moments"
  },
  hi: {
    nav_pics: "सभी तस्वीरें",
    nav_story: "कहानी",
    nav_contact: "संपर्क",
    btn_rings: "रिंग्स",
    btn_spiral: "स्पाइरल",
    focal_label: "चुनिंदा लम्हें",
    home_h1: "MM — डिजिटल यादें और तस्वीरें",
    home_tag: "हाउस ऑफ मेमोरीज़",
    all_pics_title: "सभी तस्वीरें",
    grid: "ग्रिड",
    list: "सूची",
    story_title: "कहानी",
    contacts_title: "संपर्क",
    back_to_space: "वापस स्पेस में",
    next_memory: "अगली तस्वीर",
    view_pic: "तस्वीर देखें",
    memories_count: "लम्हें"
  }
};

export function getAllCards() {
  return projects;
}

export function setAllCards(newCards) {
  projects = Array.isArray(newCards) ? newCards : [];
  try {
    localStorage.setItem('k95_cards', JSON.stringify(projects));
  } catch (e) {}
  return projects;
}

export function loadSavedCards() {
  try {
    const saved = localStorage.getItem('k95_cards');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        projects = parsed;
      }
    }
  } catch (e) {}
  return projects;
}

export function getCardBySlug(slug) {
  return projects.find((c) => c.slug === slug || c.id === slug);
}

export function addNewCard(cardData) {
  const cardNum = projects.length + 1;
  const newCard = {
    id: cardData.id || `card-${Date.now()}-${cardNum}`,
    slug: cardData.slug || `pic-${cardNum}`,
    title: cardData.title || `pic${cardNum}`,
    client: "Palak Silawat",
    year: cardData.year || String(new Date().getFullYear()),
    month: cardData.month || "2026",
    category: cardData.category || "Moments",
    categories: cardData.categories || [cardData.category || "Moments"],
    aspectRatio: "3:4",
    cover: cardData.cover || cardData.image || "",
    image: cardData.image || cardData.cover || "",
    imageSmall: cardData.imageSmall || cardData.cover || "",
    tags: cardData.tags || ["Palak Silawat", "pippostyles"],
    note: cardData.note || "just another moment.",
    summary: cardData.summary || "A collection of moments, photographs, and memories kept here, one frame at a time.",
    sections: [
      {
        type: "sections.media-single",
        full: true,
        position: "center",
        media: { url: cardData.image || cardData.cover || "", alt: cardData.title || `pic${cardNum}` }
      }
    ]
  };
  projects.push(newCard);
  try {
    localStorage.setItem('k95_cards', JSON.stringify(projects));
  } catch (e) {}
  return newCard;
}

export function updateCardName(id, newTitle) {
  const card = projects.find(c => c.id === id || c.slug === id);
  if (card) {
    card.title = newTitle;
    try {
      localStorage.setItem('k95_cards', JSON.stringify(projects));
    } catch (e) {}
    try {
      fetch('/api/cards/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, title: newTitle })
      }).catch(() => {});
    } catch (e) {}
    return card;
  }
  return null;
}

export function updateCardData(id, updatedFields) {
  const index = projects.findIndex(c => c.id === id || c.slug === id);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updatedFields };
    try {
      localStorage.setItem('k95_cards', JSON.stringify(projects));
    } catch (e) {}
    try {
      fetch('/api/cards/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projects[index].id, ...updatedFields })
      }).catch(() => {});
    } catch (e) {}
    return projects[index];
  }
  return null;
}

export function deleteCard(id) {
  const index = projects.findIndex(c => c.id === id || c.slug === id);
  if (index !== -1) {
    const deleted = projects.splice(index, 1)[0];
    try {
      localStorage.setItem('k95_cards', JSON.stringify(projects));
    } catch (e) {}
    try {
      fetch('/api/cards/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleted.id })
      }).catch(() => {});
    } catch (e) {}
    return deleted;
  }
  return null;
}

export function clearAllCards() {
  projects = [];
  try {
    localStorage.removeItem('k95_cards');
    localStorage.removeItem('k95_image_overrides');
  } catch (e) {}
  try {
    fetch('/api/cards/clear', { method: 'POST' }).catch(() => {});
  } catch (e) {}
  return [];
}

export function getCustomImageOverrides() {
  try {
    return JSON.parse(localStorage.getItem('k95_image_overrides') || '{}');
  } catch (e) {
    return {};
  }
}

export function saveCustomImageOverride(cardId, dataUrl) {
  const current = getCustomImageOverrides();
  current[cardId] = dataUrl;
  try {
    localStorage.setItem('k95_image_overrides', JSON.stringify(current));
  } catch (e) {}
}

export function resetCustomImageOverrides() {
  localStorage.removeItem('k95_image_overrides');
}
