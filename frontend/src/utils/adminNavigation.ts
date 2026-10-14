import { 
  LayoutDashboard, Building2, Users, UserCheck, 
  FileCheck, ClipboardList, BarChart3 
} from 'lucide-react';

export interface SidebarItem {
  name: string;
  icon: any;
  active?: boolean;
  path?: string;
}

export const getAdminSidebarItems = (activeName: string): SidebarItem[] => [
  { name: 'Dashboard', icon: LayoutDashboard, active: activeName === 'Dashboard', path: '/admin' },
  { name: 'Vendors', icon: Building2, active: activeName === 'Vendors', path: '/admin/vendors' },
  { name: 'Customers', icon: Users, active: activeName === 'Customers', path: '/admin/customers' },
  { name: 'Auditors', icon: UserCheck, active: activeName === 'Auditors', path: '/admin/auditors' },
  { name: 'Audits', icon: FileCheck, active: activeName === 'Audits', path: '/admin/audits' },
  { name: 'Checklist', icon: ClipboardList, active: activeName === 'Checklist', path: '/admin/checklist' },
  { name: 'Reports', icon: BarChart3, active: activeName === 'Reports', path: '/admin/reports' },
];
