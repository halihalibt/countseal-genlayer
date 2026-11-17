import React from 'react';
import {
  ShieldCheck, Wallet, ChevronDown, ExternalLink
} from 'lucide-react';
import { shortenAddress } from '../utils/format';
import type { Connection } from '../chain';

interface HeaderProps {
  sourceVerified: boolean;
  connection: Connection | undefined;
  onWalletClick: () => void;
}

export function Header({ sourceVerified, connection, onWalletClick }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">CS</div>
          <div className="header-brand-text">
            <span className="header-brand-name">CountSeal</span>
            <span className="header-brand-tagline">Procurement Reconciliation</span>
          </div>
        </div>

        <div className="header-meta">
          <div className="header-network-badge">
            <span className={`header-network-dot ${sourceVerified ? '' : 'verifying'}`} />
            <span>Studionet 61999</span>
            {sourceVerified && <ShieldCheck size={12} />}
          </div>

          <button
            className={`btn ${connection ? 'btn-secondary' : 'btn-primary'}`}
            onClick={onWalletClick}
          >
            <Wallet size={14} />
            {connection
              ? shortenAddress(connection.address)
              : 'Connect Wallet'}
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
    </header>
  );
}
