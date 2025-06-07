// Centralized utility functions to avoid duplication across components

export const formatReleaseDate = (dateString?: string) => {
  if (!dateString) return 'TBA';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export const isUpcoming = (dateString?: string) => {
  if (!dateString) return true;
  return new Date(dateString) > new Date();
};

export const getDaysLeft = (dateString?: string) => {
  if (!dateString) return null;
  const releaseDate = new Date(dateString);
  const now = new Date();
  const diffTime = releaseDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
};

export const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'text-gray-400';
    case 'uncommon': return 'text-gray-300';
    case 'rare': return 'text-yellow-400';
    case 'mythic': return 'text-orange-500';
    default: return 'text-gray-400';
  }
}; 