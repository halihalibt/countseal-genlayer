import React from 'react';
import {
  FileText, FilePlus, ArrowLeftRight, RefreshCw
} from 'lucide-react';

export type TabId = 'orders' | 'new' | 'transactions';

interface NavigationProps {
  active: TabId;
  txCount: number;
  reading: boolean;
  onTabChange: (tab: TabId) => void;
  onRefresh: () => void;
}

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'orders', label: 'Purchase Orders', icon: FileText },
  { id: 'new', label: 'New Order', icon: FilePlus },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
];

export function Navigation({ active, txCount, reading, onTabChange, onRefresh }: NavigationProps) {
  return (
    <nav className="app-nav" aria-label="Main navigation">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className="nav-tab"
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onTabChange(id)}
        >
          <Icon size={15} />
          {label}
          {id === 'transactions' && txCount > 0 && (
            <span className="nav-badge">{txCount}</span>
          )}
        </button>
      ))}
      <div className="nav-actions">
        <button
          className="btn btn-ghost btn-sm"
          disabled={reading}
          onClick={onRefresh}
          aria-label="Refresh chain data"
        >
          <RefreshCw size={14} className={reading ? 'spinner-icon' : ''} />
          {reading ? 'Reading…' : 'Refresh'}
        </button>
      </div>
    </nav>
  );
}
