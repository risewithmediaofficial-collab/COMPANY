import { Star, FolderKanban, CheckCircle2, Building2, Target } from '@/components/ui/muiIcons';
import { useFavorites } from '../../hooks/useFavorites';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';

const FavoritesPanel = () => {
  const { favorites } = useFavorites();
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground relative inline-flex items-center justify-center" title="View Favorites">
        <Star size={18} className={favorites.length > 0 ? 'fill-current text-foreground' : ''} />
        {favorites.length > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-primary text-primary-foreground rounded-full border-2 border-card text-[9px] font-bold flex items-center justify-center tabular-nums">
            {Math.min(favorites.length, 9)}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 mt-2">
        <DropdownMenuLabel>Favorites ({favorites.length})</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {favorites.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No favorites yet. Star items to add them here!
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {favorites.map((favorite) => {
              const typeKey = String(favorite.type || '').toLowerCase();
              const FavIcon =
                typeKey === 'project'
                  ? FolderKanban
                  : typeKey === 'task'
                    ? CheckCircle2
                    : typeKey === 'client'
                      ? Building2
                      : typeKey === 'lead'
                        ? Target
                        : Star;
              return (
                <button
                  key={`${favorite.type}-${favorite.id}`}
                  onClick={() => handleNavigate(favorite.path || '/')}
                  className="w-full px-3 py-2 hover:bg-secondary/80 flex items-center gap-3 transition-colors text-left border-b border-border/50 last:border-0"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary border border-border text-foreground">
                    <FavIcon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-foreground truncate">{favorite.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{favorite.type}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FavoritesPanel;
