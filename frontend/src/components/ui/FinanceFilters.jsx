import { useProjects } from '../../hooks/useProjects';
import { useClients } from '../../hooks/useClients';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

/**
 * FinanceFilters - Filter finance entries by project, client, status, type
 */
const FinanceFilters = ({
  onFilterChange,
  selectedProject = '',
  selectedClient = '',
  selectedStatus = '',
  selectedType = '',
}) => {
  const { data: projects = [] } = useProjects({ limit: 100 });
  const { data: clients = [] } = useClients({ limit: 100 });

  const statuses = ['Pending', 'Completed', 'Cancelled'];
  const types = ['Income', 'Expense'];

  return (
    <div className="flex flex-col md:flex-row gap-3 p-4 rounded-lg bg-secondary/30 border border-border">
      {/* Project Filter */}
      <Select value={selectedProject || '_all'} onValueChange={(value) => onFilterChange({ project: value === '_all' ? '' : value })}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="All Projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project._id} value={project._id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Client Filter */}
      <Select value={selectedClient || '_all'} onValueChange={(value) => onFilterChange({ client: value === '_all' ? '' : value })}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="All Clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Clients</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client._id} value={client._id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type Filter */}
      <Select value={selectedType || '_all'} onValueChange={(value) => onFilterChange({ type: value === '_all' ? '' : value })}>
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Types</SelectItem>
          {types.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={selectedStatus || '_all'} onValueChange={(value) => onFilterChange({ status: value === '_all' ? '' : value })}>
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Status</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FinanceFilters;
