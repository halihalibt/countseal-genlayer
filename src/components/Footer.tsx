import React from 'react';
import { ExternalLink, Github, Shield } from 'lucide-react';
import { explorer } from '../chain';
import type { Deployment } from '../types';

interface FooterProps {
  deployment: Deployment | undefined;
}

export function Footer({ deployment }: FooterProps) {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <a
          href="https://github.com/halihalibt/countseal-genlayer"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
          Source &amp; Documentation
        </a>
        {deployment && (
          <a
            href={`${explorer}/address/${deployment.contract}`}
            target="_blank"
            rel="noreferrer"
          >
            <Shield size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
            Deployed Contract
          </a>
        )}
        <span>No asset transfers · Public testnet · English</span>
      </div>
    </footer>
  );
}
