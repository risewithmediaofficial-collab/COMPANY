import { Star } from '@/components/ui/muiIcons';
import { useFavorites } from '../../hooks/useFavorites';
import { AppTooltip } from './tooltip';

/**
 * Reusable FavoriteButton component
 * @param {string} itemId - The ID of the item
 * @param {string} itemType - Type of item (project, task, client, lead)
 * @param {string} itemName - Display name of the item
 * @param {string} itemIcon - Emoji or icon for the item
 * @param {boolean} showLabel - Show label text
 * @param {string} className - Additional CSS classes
 */
const FavoriteButton = ({
  itemId,
  itemType,
  itemName,
  itemIcon = '⭐',
  showLabel = false,
  className = '',
}) => {
  const { toggleFavorite, isFavorited } = useFavorites();
  const isFav = isFavorited(itemId, itemType);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(itemId, itemType, itemName, itemIcon);
  };

  return (
    <AppTooltip content={isFav ? 'Remove from favorites' : 'Add to favorites'}>
      <button
        onClick={handleClick}
        className={`p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground inline-flex items-center justify-center ${
          isFav ? 'text-foreground bg-secondary' : ''
        } ${className}`}
      >
        <Star size={18} className={isFav ? 'fill-current text-foreground' : ''} />
        {showLabel && <span className="text-xs ml-1.5 font-medium">{isFav ? 'Favorited' : 'Favorite'}</span>}
      </button>
    </AppTooltip>
  );
};

export default FavoriteButton;
