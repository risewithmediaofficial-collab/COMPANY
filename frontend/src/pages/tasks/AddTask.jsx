import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { PageHeader } from '../../components/ui/page';
import { AddTaskModal } from '../../components/modals/AddTaskModal';

const AddTask = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Create New Task</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Select a project first, then choose content or non-content task fields.</p>
        </div>
        <Button variant="outline" size="icon" className="shrink-0 rounded-xl" onClick={() => navigate('/tasks')} aria-label="Close">
          <X size={18} />
        </Button>
      </div>

      <div className="rounded-[24px] border border-border bg-card p-6 shadow-none">
        <AddTaskModal
          open
          onOpenChange={(open) => {
            if (!open) navigate('/tasks');
          }}
          pageMode
        />
      </div>
    </div>
  );
};

export default AddTask;
