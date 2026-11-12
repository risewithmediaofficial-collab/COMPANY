import { Link2, Plus, Trash2 } from '@/components/ui/muiIcons';
import { Button } from './button';
import { Input } from './input';

/**
 * Reusable link attachments editor for SOPs, Proposals, etc.
 * links: [{ title, url }]
 */
const LinksEditor = ({ links = [], onChange, label = 'Attachments & Links' }) => {
  const updateLink = (index, field, value) => {
    const next = links.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(next);
  };

  const addLink = () => onChange([...links, { title: '', url: '' }]);

  const removeLink = (index) => onChange(links.filter((_, i) => i !== index));

  return (
    <div className="rounded-2xl bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Link2 size={16} className="text-primary" />
          {label}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addLink}>
          <Plus size={14} className="mr-1" />
          Add Link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground">No links added yet.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="grid gap-2 rounded-xl bg-background p-3 md:grid-cols-[1fr_1fr_auto]">
              <Input
                placeholder="Link title (e.g. Brand Guide)"
                value={link.title || ''}
                onChange={(e) => updateLink(index, 'title', e.target.value)}
              />
              <Input
                placeholder="https://..."
                value={link.url || ''}
                onChange={(e) => updateLink(index, 'url', e.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(index)} aria-label="Remove link">
                <Trash2 size={16} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const LinksList = ({ links = [] }) => {
  if (!links?.length) return <p className="text-sm text-muted-foreground">No links attached.</p>;

  return (
    <ul className="space-y-2">
      {links.map((link, index) => (
        <li key={index}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Link2 size={14} />
            {link.title || link.url}
          </a>
        </li>
      ))}
    </ul>
  );
};

export default LinksEditor;
