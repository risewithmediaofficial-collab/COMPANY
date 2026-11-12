import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveWorkspace } from '../../store/slices/authSlice';
import { ChevronDown, Building, Briefcase } from '@/components/ui/muiIcons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

export default function WorkspaceSwitcher({ sidebarOpen }) {
  const dispatch = useDispatch();
  const { user, activeWorkspace } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const ref = useRef(null);

  // Fetch assigned brands for the switcher
  useEffect(() => {
    if (['editor', 'designer', 'adsManager'].includes(user?.role)) {
      api.get('/brands/assigned').then(r => setBrands(r.data.brands || [])).catch(() => {});
    } else if (['superAdmin', 'organizationOwner', 'manager'].includes(user?.role)) {
      api.get('/brands/all').then(r => setBrands(r.data.brands || [])).catch(() => {});
    }
  }, [user]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (brandId) => {
    dispatch(setActiveWorkspace(brandId));
    setOpen(false);
    // Optionally trigger a data reload here or let components react to activeWorkspace change
    window.location.reload(); // Simple reload for now to apply new scope globally
  };

  const activeName = activeWorkspace === 'global' ? 'Global View' 
                   : brands.find(b => b._id === activeWorkspace)?.name 
                   || 'Select Workspace';

  // If client or simple employee, don't show switcher
  if (['clientAdmin', 'clientMember', 'employee', 'referral'].includes(user?.role)) {
    return null;
  }

  return (
    <div className="relative px-3 py-2" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card/70 p-2 transition-all hover:bg-secondary"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {activeWorkspace === 'global' ? <Building size={14} className="text-primary" /> : <Briefcase size={14} className="text-primary" />}
          </div>
          {sidebarOpen && (
            <span className="text-xs font-bold truncate text-foreground">
              {activeName}
            </span>
          )}
        </div>
        {sidebarOpen && <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute left-3 right-3 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto">
              {['superAdmin', 'organizationOwner', 'manager'].includes(user?.role) && (
                <button 
                  onClick={() => handleSelect('global')}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary flex items-center gap-2
                    ${activeWorkspace === 'global' ? 'text-primary font-bold bg-primary/5' : 'text-foreground'}`}
                >
                  <Building size={12} /> Global Overview
                </button>
              )}
              {brands.map(brand => (
                <button 
                  key={brand._id}
                  onClick={() => handleSelect(brand._id)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary flex items-center gap-2
                    ${activeWorkspace === brand._id ? 'text-primary font-bold bg-primary/5' : 'text-foreground'}`}
                >
                  <Briefcase size={12} /> {brand.name}
                </button>
              ))}
              {brands.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground italic">No workspaces found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
