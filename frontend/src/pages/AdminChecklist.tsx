import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, LayoutDashboard, Building2, Users, UserCheck, ClipboardList, Search, Plus, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminChecklist: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [establishmentFilter, setEstablishmentFilter] = useState('All');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    vendorType: 'other-vendor',
    id: '',
    serialNumber: '',
    title: '',
    type: 'CL Act',
    particulars: '',
    statutoryRequirement: '',
    active: true
  });
  const [error, setError] = useState('');

  const sidebarItems = getAdminSidebarItems('Checklist');

  const fetchChecklist = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/checklist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Flatten the returned structure
        const other = (data.data.otherVendor || []).map((i: any) => ({ ...i, vendorCategory: 'Other Vendor' }));
        const sec = (data.data.securityVendor || []).map((i: any) => ({ ...i, vendorCategory: 'Security Vendor' }));
        setItems([...other, ...sec]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, []);

  const handleToggleStatus = async (item: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE_URL}/admin/checklist/${item.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: item.active === false ? true : false })
      });
      fetchChecklist();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          vendorType: formData.vendorType, 
          item: {
            id: formData.id || `NEW-${Date.now()}`,
            serialNumber: Number(formData.serialNumber) || items.length + 1,
            title: formData.title,
            type: formData.type,
            particulars: formData.particulars,
            statutoryRequirement: formData.statutoryRequirement,
            active: formData.active
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setFormData({ vendorType: 'other-vendor', id: '', serialNumber: '', title: '', type: 'CL Act', particulars: '', statutoryRequirement: '', active: true });
        fetchChecklist();
      } else {
        setError(data.error || 'Failed to create item');
      }
    } catch (err) {
      setError('An error occurred.');
    }
  };

  const filtered = items.filter(i => {
    const s = (i.title || i.particulars || i.id || '').toLowerCase();
    const searchMatch = s.includes(searchTerm.toLowerCase());
    const estMatch = establishmentFilter === 'All' || (i.vendorCategory === establishmentFilter);
    return searchMatch && estMatch;
  });

  return (
    <DashboardLayout title="Admin Portal - Checklist" sidebarItems={sidebarItems}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0B1F3A]">Compliance Checklist</h2>
        <button className="db-btn db-btn-primary" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </button>
      </div>

      {isAdding && (
        <div className="db-card mb-8">
          <div className="db-card-header">
            <h3 className="db-card-title">Add Compliance Item</h3>
          </div>
          <div className="db-card-body">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleAddSubmit} className="db-form-grid" autoComplete="off">
              <div>
                <label className="db-label">Establishment Type *</label>
                <select required className="db-select" value={formData.vendorType} onChange={e => setFormData({...formData, vendorType: e.target.value})}>
                  <option value="other-vendor">Other Vendor</option>
                  <option value="security-vendor">Security Vendor</option>
                </select>
              </div>
              <div>
                <label className="db-label">Labour Code / Act *</label>
                <input required className="db-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
              </div>
              <div>
                <label className="db-label">Title *</label>
                <input required className="db-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="db-label">ID Code</label>
                <input className="db-input" placeholder="Auto-generated if empty" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="db-label">Requirement *</label>
                <textarea required className="db-input" rows={2} value={formData.statutoryRequirement} onChange={e => setFormData({...formData, statutoryRequirement: e.target.value})} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <button type="button" className="db-btn db-btn-outline" onClick={() => setIsAdding(false)}>Cancel</button>
                <button type="submit" className="db-btn db-btn-primary">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="db-card">
        <div className="db-card-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search compliance requirement..." 
                className="pl-9 pr-4 py-2 border rounded-md w-full text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="border rounded-md px-3 py-2 text-sm"
              value={establishmentFilter}
              onChange={e => setEstablishmentFilter(e.target.value)}
            >
              <option value="All">All Establishments</option>
              <option value="Other Vendor">Other Vendor</option>
              <option value="Security Vendor">Security Vendor</option>
            </select>
          </div>
        </div>
        <div className="db-table-wrapper">
          <table className="db-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Establishment</th>
                <th>Code / Act</th>
                <th>Title / Requirement</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="animate-spin w-6 h-6 mx-auto text-[#1565C0]" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No checklist items found</td></tr>
              ) : (
                filtered.map(i => (
                  <tr key={i.id} className={i.active === false ? 'opacity-50' : ''}>
                    <td className="font-semibold text-xs text-[#0B1F3A]">{i.id}</td>
                    <td className="text-xs">{i.vendorCategory}</td>
                    <td className="text-xs">{i.type}</td>
                    <td>
                      <div className="font-semibold text-sm">{i.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{i.statutoryRequirement}</div>
                    </td>
                    <td>
                      {i.active !== false 
                        ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Active</span> 
                        : <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">Inactive</span>}
                    </td>
                    <td>
                      <button onClick={() => handleToggleStatus(i)} className="db-btn db-btn-outline text-xs py-1 px-2">
                        {i.active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};
