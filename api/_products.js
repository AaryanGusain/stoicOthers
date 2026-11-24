const PRODUCTS = {
  book_pdf: {
    name: '14 Days to a Stoic Mind PDF',
    description: 'The complete 14-day reader as a downloadable PDF.',
    usdAmount: 500,
    inrAmount: 42500,
    displayPrice: '$5',
    listedPrice: '5.00',
    discountAmount: 0,
    deliverables: [
      {
        label: '14 Days to a Stoic Mind PDF',
        href: '/book/downloads/14-days-to-a-stoic-mind.pdf',
        filename: '14-days-to-a-stoic-mind.pdf',
        type: 'PDF'
      }
    ]
  },
  audiobook: {
    name: '14 Days to a Stoic Mind Audiobook',
    description: 'All three narrated M4B editions.',
    usdAmount: 500,
    inrAmount: 42500,
    displayPrice: '$5',
    listedPrice: '5.00',
    discountAmount: 0,
    deliverables: [
      {
        label: 'American male voice (Michael)',
        href: '/audio/audio/am_michael/stoic_meditations.m4b',
        filename: 'stoic-meditations-am-michael.m4b',
        type: 'M4B'
      },
      {
        label: 'American female voice (Heart)',
        href: '/audio/audio/af_heart/stoic_meditations.m4b',
        filename: 'stoic-meditations-af-heart.m4b',
        type: 'M4B'
      },
      {
        label: 'British male voice (George)',
        href: '/audio/audio/bm_george/stoic_meditations.m4b',
        filename: 'stoic-meditations-bm-george.m4b',
        type: 'M4B'
      }
    ]
  },
  wallpaper_strength: {
    name: 'Wallpaper Bundle I: Strength & Discipline',
    description: '20 wallpapers for phone, tablet, and desktop.',
    usdAmount: 100,
    inrAmount: 8500,
    displayPrice: '$1',
    listedPrice: '1.00',
    discountAmount: 0,
    deliverables: [
      {
        label: 'Strength & Discipline wallpaper bundle',
        href: '/wallpapers/downloads/bundle-a-strength-and-discipline.zip',
        filename: 'bundle-strength-and-discipline.zip',
        type: 'ZIP'
      }
    ]
  },
  wallpaper_solitude: {
    name: 'Wallpaper Bundle II: Solitude & Stillness',
    description: '20 wallpapers for phone, tablet, and desktop.',
    usdAmount: 100,
    inrAmount: 8500,
    displayPrice: '$1',
    listedPrice: '1.00',
    discountAmount: 0,
    deliverables: [
      {
        label: 'Solitude & Stillness wallpaper bundle',
        href: '/wallpapers/downloads/bundle-b-solitude-and-stillness.zip',
        filename: 'bundle-solitude-and-stillness.zip',
        type: 'ZIP'
      }
    ]
  },
  wallpaper_wisdom: {
    name: 'Wallpaper Bundle III: Wisdom & Reflection',
    description: '20 wallpapers for phone, tablet, and desktop.',
    usdAmount: 100,
    inrAmount: 8500,
    displayPrice: '$1',
    listedPrice: '1.00',
    discountAmount: 0,
    deliverables: [
      {
        label: 'Wisdom & Reflection wallpaper bundle',
        href: '/wallpapers/downloads/bundle-c-wisdom-and-reflection.zip',
        filename: 'bundle-wisdom-and-reflection.zip',
        type: 'ZIP'
      }
    ]
  }
};

PRODUCTS.wallpaper_complete = {
  name: 'All Wallpaper Bundles',
  description: 'All three wallpaper bundles — Strength, Solitude, and Wisdom.',
  usdAmount: 200,
  inrAmount: 17000,
  displayPrice: '$2',
  listedPrice: '2.00',
  discountAmount: 100,
  deliverables: [
    ...PRODUCTS.wallpaper_strength.deliverables,
    ...PRODUCTS.wallpaper_solitude.deliverables,
    ...PRODUCTS.wallpaper_wisdom.deliverables
  ]
};

PRODUCTS.complete_pack = {
  name: 'Stoic Meditations Complete Pack',
  description: 'Book PDF, all three audiobook voices, and all wallpaper bundles.',
  usdAmount: 1000,
  inrAmount: 85000,
  displayPrice: '$10',
  listedPrice: '10.00',
  discountAmount: 300,
  deliverables: [
    ...PRODUCTS.book_pdf.deliverables,
    ...PRODUCTS.audiobook.deliverables,
    ...PRODUCTS.wallpaper_strength.deliverables,
    ...PRODUCTS.wallpaper_solitude.deliverables,
    ...PRODUCTS.wallpaper_wisdom.deliverables
  ]
};

module.exports = { PRODUCTS };
