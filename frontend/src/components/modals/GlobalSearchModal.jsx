import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader } from 'lucide-react';
import api from '../../api';
import { Dialog, DialogContent } from '../ui/dialog';
import { Input } from '../ui/input';

const GlobalSearchModal = ({ open, onOpenChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const searchItems = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [projects, tasks, clients, leads] = await Promise.all([
        api.get('/projects', { params: { search: searchTerm } }).catch(() => ({ data: [] })),
        api.get('/tasks', { params: { search: searchTerm } }).catch(() => ({ data: [] })),
        api.get('/clients', { params: { search: searchTerm } }).catch(() => ({ data: [] })),
        api.get('/crm/leads', { params: { search: searchTerm } }).catch(() => ({ data: [] })),
      ]);

      const formattedResults = [
        ...(projects.data?.data || []).map((item) => ({
          id: item._id,
          title: item.name,
          type: 'project',
          description: item.description,
          path: `/projects/${item._id}`,
          icon: '📋',
        })),
        ...(tasks.data?.data || []).map((item) => ({
          id: item._id,
          title: item.title,
          type: 'task',
          description: item.description,
          path: `/tasks/${item._id}`,
          icon: '✓',
        })),
        ...(clients.data?.data || []).map((item) => ({
          id: item._id,
          title: item.name,
          type: 'client',
          description: item.company,
          path: `/clients/${item._id}`,
          icon: '👤',
        })),
        ...(leads.data?.data || []).map((item) => ({
          id: item._id,
          title: item.name,
          type: 'lead',
          description: item.email,
          path: `/crm/leads/${item._id}`,
          icon: '🎯',
        })),
      ];

      setResults(formattedResults.slice(0, 20)); // Limit to 20 results
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchItems(query);
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [query, searchItems]);

  const handleSelect = (path) => {
    navigate(path);
    setQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent noPadding className="max-w-2xl p-0 gap-0">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-muted-foreground" />
            <Input
              placeholder="Search projects, tasks, clients, leads..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {!loading && results.length === 0 && !query && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Start typing to search...
            </div>
          )}

          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result.path)}
              className="w-full px-4 py-3 hover:bg-secondary/80 flex items-start gap-3 transition-colors text-left border-b border-border/50 last:border-0"
            >
              <span className="text-xl flex-shrink-0">{result.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{result.title}</div>
                <div className="text-xs text-muted-foreground truncate">{result.description || result.type}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-border bg-secondary/20 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Press ESC to close</span>
          <span>{results.length} results</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearchModal;
