import React, { useEffect, useState } from 'react';
import { Plus, Globe, Mail, Phone, MapPin, Building2, Clock, Trash2, Edit2, Search } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

export default function SMMClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '', brandLogo: '', website: '', industry: '',
    primaryContact: '', phone: '', email: '', address: '', timezone: 'Asia/Kolkata', notes: '', status: 'Active'
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await smmApi.getClients({ search, status: statusFilter });
      if (res.data?.success) setClients(res.data.data);
    } catch (err) {
      toast.error('Failed to load SMM Clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, statusFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await smmApi.updateClient(editingClient._id, formData);
        toast.success('Client updated successfully');
      } else {
        await smmApi.createClient(formData);
        toast.success('Client created successfully');
      }
      setIsDrawerOpen(false);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save client');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this SMM Client?')) return;
    try {
      await smmApi.deleteClient(id);
      toast.success('Client deleted');
      fetchClients();
    } catch (err) {
      toast.error('Failed to delete client');
    }
  };

  const openAdd = () => {
    setEditingClient(null);
    setFormData({
      companyName: '', brandLogo: '', website: '', industry: '',
      primaryContact: '', phone: '', email: '', address: '', timezone: 'Asia/Kolkata', notes: '', status: 'Active'
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setFormData(client);
    setIsDrawerOpen(true);
  };

  const columns = [
    {
      key: 'companyName',
      label: 'Company Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.brandLogo ? (
            <img src={row.brandLogo} alt="" className="w-8 h-8 rounded-lg object-contain bg-secondary border border-border" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              {row.companyName?.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <span className="font-semibold text-foreground block">{row.companyName}</span>
            <span className="text-xs text-muted-foreground">{row.industry || 'General Industry'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'primaryContact',
      label: 'Primary Contact',
      render: (row) => (
        <div>
          <span className="font-medium text-foreground block">{row.primaryContact || 'N/A'}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => <span className="text-xs text-foreground font-mono">{row.phone || '—'}</span>,
    },
    {
      key: 'website',
      label: 'Website',
      render: (row) => row.website ? (
        <a href={row.website} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
          <Globe size={12} />
          {row.website.replace('https://', '').replace('http://', '')}
        </a>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadgeSmm status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMM Clients"
        subtitle="Manage brand clients and their timezone/contact specifications"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
            <Plus size={18} />
            Add SMM Client
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex-1 w-full">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by client name, email, contact..." />
        </div>
        <div className="w-full sm:w-48">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="app-select">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Prospect">Prospect</option>
            <option value="Paused">Paused</option>
          </select>
        </div>
      </div>

      <DataTable
        data={clients}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={(id) => handleDelete(id)}
        emptyTitle="No SMM Clients found"
        emptyDescription="Create your first SMM client to begin managing campaign structures."
      />

      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingClient ? 'Edit SMM Client' : 'Add New SMM Client'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground mb-1 block">Company Name *</label>
              <input type="text" required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="app-input" placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Brand Logo URL</label>
              <input type="text" value={formData.brandLogo} onChange={e => setFormData({...formData, brandLogo: e.target.value})} className="app-input" placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Industry</label>
              <input type="text" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="app-input" placeholder="e.g. E-Commerce" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Website</label>
              <input type="text" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="app-input" placeholder="https://acme.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Primary Contact Person</label>
              <input type="text" value={formData.primaryContact} onChange={e => setFormData({...formData, primaryContact: e.target.value})} className="app-input" placeholder="John Doe" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Phone Number</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="app-input" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="app-input" placeholder="contact@acme.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Timezone</label>
              <input type="text" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} className="app-input" placeholder="Asia/Kolkata" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="app-select">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Prospect">Prospect</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground mb-1 block">Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="app-input" placeholder="Office address..." />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground mb-1 block">Internal Notes</label>
              <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="app-input" placeholder="Key goals, preferences, etc." />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90">Save Client</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
