import React from 'react';
import { Search, Layers, CheckSquare } from 'lucide-react';
import { useAudit } from '../context/AuditContext';

export const SearchAndFilter: React.FC = () => {
  const {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    categories
  } = useAudit();

  return (
    <div className="card search-filter-card">
      <div className="search-filter-grid">
        {/* Search input */}
        <div className="search-box">
          <label className="form-label search-filter-label" htmlFor="search-input">
            Search Audit Items
          </label>
          <div className="input-prefix-wrapper">
            <Search className="input-icon text-primary" />
            <input
              id="search-input"
              type="text"
              className="form-control search-filter-input"
              placeholder="Search by title, category, serial no., or particulars..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="filter-group">
          <label className="form-label search-filter-label" htmlFor="category-select">
            Filter By Category
          </label>
          <div className="input-prefix-wrapper">
            <Layers className="input-icon text-primary" />
            <select
              id="category-select"
              className="form-control search-filter-select"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status filter */}
        <div className="filter-group">
          <label className="form-label search-filter-label" htmlFor="status-select">
            Filter By Status
          </label>
          <div className="input-prefix-wrapper">
            <CheckSquare className="input-icon text-primary" />
            <select
              id="status-select"
              className="form-control search-filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Assessment Only</option>
              <option value="COMPLIANT">Compliant Only</option>
              <option value="NON_COMPLIANT">Non-Compliant Only</option>
              <option value="NA">Not Applicable (NA) Only</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

