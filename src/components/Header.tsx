import React from 'react';
import {
  ShieldCheck, Wallet, ChevronDown, Box
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
          <div className="header-logo"><Box size={22} aria-hidden="true"/></div>
          <div className="header-brand-text">
            <span className="header-brand-name">CountSeal</span>
            <span className="header-brand-tagline">Procurement Reconciliation</span>
          </div>
        </div>

        <div className="header-meta">
          <div className="header-network-badge">
            <span className={`header-network-dot ${sourceVerified ? '' : 'verifying'}`} />
            <span>Studionet <span className="network-id">61999</span></span>
            {sourceVerified && <ShieldCheck size={12} />}
          </div>

          <button
            className={`btn ${connection ? 'btn-secondary' : 'btn-primary'}`}
            onClick={onWalletClick}
          >
            <Wallet size={14} />
            {connection
              ? shortenAddress(connection.address)
              : <span><span className="wallet-connect-prefix">Connect </span>Wallet</span>}
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
    </header>
  );
}
