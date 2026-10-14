import { useNavigate } from 'react-router-dom';
import { KanbanCreateTaskModal } from '../../components/tasks/KanbanCreateTaskModal';

const AddTask = () => {
  const navigate = useNavigate();

  return (
    <KanbanCreateTaskModal
      isOpen={true}
      onClose={() => navigate('/tasks')}
      onTaskCreated={() => navigate('/tasks')}
    />
  );
};

export default AddTask;
