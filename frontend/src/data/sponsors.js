export const SPONSORS = [
  {
    name: 'RTD. Commander Macdonald Ubah',
    category: 'Senior Boys',
    image: '/images/sponsors/RTD-Commander%20-Macdonald%20Ubah.jpg'
  },
  {
    name: 'Engr. Nnamdi Ezeigbo',
    category: 'Junior Boys',
    image: '/images/sponsors/engr-nnamdi-ezeigbo.jpg'
  },
  {
    name: 'Pastor Harrison Ugochukwu Asonye',
    category: 'Intermediate',
    image: '/images/sponsors/Pastor%20Harrison%20Ugochukwu%20Asonye.jpeg'
  },
  { name: 'Engr. Stanley Uche', category: 'Girls', image: null },
  {
    name: 'Engr. Ezinna Ogbuokiri',
    category: 'Men Above 50 Years',
    image: '/images/sponsors/Engr.%20Ezinna%20Ogbuokiri.jpeg'
  },
];

export function getSponsorInitials(name) {
  const words = name
    .replace(/^(Engr\.|Pastor|RTD\.)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
}
