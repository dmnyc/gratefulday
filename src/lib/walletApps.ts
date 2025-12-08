import type { WalletApp } from '@/contexts/AppContext';

export interface WalletAppInfo {
  id: WalletApp;
  name: string;
  description: string;
  website?: string;
}

export const WALLET_APPS: WalletAppInfo[] = [
  {
    id: 'alby',
    name: 'Alby',
    description: 'Browser extension and mobile app',
    website: 'https://getalby.com',
  },
  {
    id: 'breez',
    name: 'Breez',
    description: 'Mobile Lightning wallet',
    website: 'https://breez.technology',
  },
  {
    id: 'zeus',
    name: 'Zeus',
    description: 'Mobile Lightning wallet',
    website: 'https://zeusln.app',
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    description: 'Mobile Lightning wallet',
    website: 'https://phoenix.acinq.co',
  },
  {
    id: 'wallet-of-satoshi',
    name: 'Wallet of Satoshi',
    description: 'Mobile Lightning wallet',
    website: 'https://www.walletofsatoshi.com',
  },
];

/**
 * Open a Lightning invoice using the standard lightning: protocol
 * Works with browser extensions (Alby) and mobile apps that register as handlers
 * @param invoice - The Lightning invoice (BOLT11 format)
 * @param walletApp - The wallet app preference (unused, kept for API consistency)
 * @returns true if the link was opened, false otherwise
 */
export function openInvoiceInWalletApp(invoice: string, walletApp: WalletApp): boolean {
  if (walletApp === 'none') {
    return false;
  }

  const lightningLink = `lightning:${invoice}`;
  
  try {
    // Create a temporary anchor element to trigger the protocol handler
    const link = document.createElement('a');
    link.href = lightningLink;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('Failed to open wallet app:', error);
    // Fallback: try direct navigation
    try {
      window.location.href = lightningLink;
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get wallet app info by ID
 */
export function getWalletAppInfo(walletApp: WalletApp): WalletAppInfo | undefined {
  if (walletApp === 'none') {
    return undefined;
  }
  return WALLET_APPS.find(w => w.id === walletApp);
}

