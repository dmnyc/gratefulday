import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWallet } from '@/hooks/useWallet';
import { useNWC } from '@/hooks/useNWCContext';
import { useToast } from '@/hooks/useToast';
import { useAppContext } from '@/hooks/useAppContext';
import { nip57 } from 'nostr-tools';
import type { Event } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { isBot } from '@/lib/botDetection';
import { openInvoiceInWalletApp, getWalletAppInfo } from '@/lib/walletApps';

/**
 * Hook for sending anonymous gratitude gifts (zaps) to random Nostr users
 */
export function useGratitudeGift() {
  const [isSending, setIsSending] = useState(false);
  const { user } = useCurrentUser();
  const { webln } = useWallet();
  const { sendPayment, getActiveConnection } = useNWC();
  const { toast } = useToast();
  const { config } = useAppContext();
  const { nostr } = useNostr();

  /**
   * Helper function to publish zap request to relays (non-blocking)
   */
  const publishZapRequest = async (zapRequest: unknown) => {
    try {
      await nostr.event(zapRequest as NostrEvent, { signal: AbortSignal.timeout(5000) });
    } catch (error) {
      // Payment succeeded but publishing failed - log but don't fail
      console.warn('Payment succeeded but failed to publish zap request to relays:', error);
    }
  };

  /**
   * Get recent recipients (last 5) from localStorage to avoid repeating
   */
  const getRecentRecipients = (): string[] => {
    try {
      const stored = localStorage.getItem('gratitudeGift_recentRecipients');
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch {
      return [];
    }
  };

  /**
   * Save a recipient to the recent recipients list (keeps last 5)
   */
  const saveRecentRecipient = (pubkey: string): void => {
    try {
      const recent = getRecentRecipients();
      // Remove if already exists
      const filtered = recent.filter(p => p !== pubkey);
      // Add to front
      filtered.unshift(pubkey);
      // Keep only last 5
      const toStore = filtered.slice(0, 5);
      localStorage.setItem('gratitudeGift_recentRecipients', JSON.stringify(toStore));
    } catch (error) {
      console.warn('Failed to save recent recipient:', error);
    }
  };

  /**
   * Select a random active Nostr pubkey with lightning address and return profile event
   * Queries for random active users from recent events and verifies they have lightning addresses
   * Also filters to only include users who have sent a zap in the last 10 days
   * Excludes the last recipient to avoid zapping the same person twice in a row
   */
  const selectRandomRecipient = async (excludePubkey?: string | null): Promise<{ pubkey: string; profileEvent: unknown; profileData: unknown } | null> => {
    // Select random recipient from active users with lightning addresses
    try {
      // Get recent recipients to exclude (last 5 to ensure variety)
      const recentRecipients = excludePubkey ? [excludePubkey] : getRecentRecipients();
      
      // Query for recent kind 1 events and select a random author
      const signal = AbortSignal.timeout(5000);
      const recentEvents = await nostr.query(
        [{ kinds: [1], limit: 50 }],
        { signal }
      );

      if (recentEvents.length === 0) {
        return null;
      }

      // Get unique pubkeys from recent events
      const pubkeys = Array.from(
        new Set(recentEvents.map((e) => e.pubkey))
      ).filter((pk) => {
        // Exclude current user
        if (pk === user?.pubkey) return false;
        // Exclude recent recipients to avoid zapping same people repeatedly
        if (recentRecipients.includes(pk)) {
          console.log(`[GratitudeGift] Excluding recent recipient: ${pk.substring(0, 8)}...`);
          return false;
        }
        return true;
      });

      console.log(`[GratitudeGift] Found ${pubkeys.length} unique pubkeys from recent events${recentRecipients.length > 0 ? ` (excluding ${recentRecipients.length} recent recipient(s))` : ''}`);

      if (pubkeys.length === 0) {
        console.log('[GratitudeGift] No pubkeys found after filtering current user');
        return null;
      }

      // Batch fetch profiles (query all at once for efficiency)
      const profileSignal = AbortSignal.timeout(5000);
      const profileEvents = await nostr.query(
        [{ kinds: [0], authors: pubkeys, limit: pubkeys.length }],
        { signal: profileSignal }
      );

      console.log(`[GratitudeGift] Fetched ${profileEvents.length} profiles`);

      // Create a map of pubkey -> profile event
      const profileMap = new Map<string, typeof profileEvents[0]>();
      profileEvents.forEach((event) => {
        profileMap.set(event.pubkey, event);
      });

      // First pass: filter by lightning address and bot status
      const candidatesWithLightning: Array<{ pubkey: string; profileEvent: unknown; profileData: unknown }> = [];
      
      for (const pubkey of pubkeys) {
        const profileEvent = profileMap.get(pubkey);
        if (!profileEvent) {
          continue;
        }

        try {
          const profileData = JSON.parse(profileEvent.content);
          const lightningAddress = profileData.lud16 || profileData.lud06;
          
          // Must have lightning address and not be a bot
          if (lightningAddress && !isBot(profileData.nip05, lightningAddress)) {
            candidatesWithLightning.push({ pubkey, profileEvent, profileData });
          }
        } catch {
          // Invalid profile JSON, skip
          continue;
        }
      }

      console.log(`[GratitudeGift] ${candidatesWithLightning.length} candidates with lightning addresses (after bot filtering)`);

      if (candidatesWithLightning.length === 0) {
        return null;
      }

      // Background zap activity check (non-blocking, for future use)
      // Note: We don't filter by zap activity anymore as it was limiting the pool too much
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
      nostr.query(
        [{
          kinds: [9734], // Zap request
          since: thirtyDaysAgo,
          limit: 5000
        }],
        { signal: AbortSignal.timeout(5000) }
      ).catch(() => {
        // Ignore errors - this is just for background info
      });

      // Use all candidates - no zap filtering
      const validRecipients = candidatesWithLightning;

      // If we excluded recent recipients and now have no valid recipients, 
      // allow them again as a fallback (better than no recipient)
      if (validRecipients.length === 0 && recentRecipients.length > 0) {
        // Re-check candidates to see if any recent recipients are available
        const fallbackRecipient = candidatesWithLightning.find(c => recentRecipients.includes(c.pubkey));
        if (fallbackRecipient) {
          return fallbackRecipient;
        }
      }

      if (validRecipients.length === 0) {
        return null;
      }

      // Select random recipient from valid ones
      const randomIndex = Math.floor(Math.random() * validRecipients.length);
      return validRecipients[randomIndex];
    } catch (error) {
      console.error('Error selecting random recipient:', error);
      return null;
    }
  };

  /**
   * Check if an invoice has been paid by querying the zap endpoint
   * Tries multiple methods to verify payment status
   */
  const checkInvoiceStatus = async (zapEndpoint: string, invoice: string): Promise<boolean> => {
    try {
      // Method 1: Try to check invoice status via the zap endpoint
      // Some LNURL endpoints support checking invoice status
      try {
        const response = await fetch(`${zapEndpoint}/check/${encodeURIComponent(invoice)}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.paid === true || data.settled === true) {
            return true;
          }
        }
      } catch {
        // Endpoint doesn't support status checking, try next method
      }

      // Method 2: Extract payment hash for potential future use
      // Note: Most LNURL endpoints don't support payment hash lookup
      // This is kept for potential future service-specific implementations
      
      // Since we can't reliably check invoice status without service-specific APIs,
      // we return false and let polling continue. Users can manually confirm payment.
      return false;
    } catch (error) {
      console.debug('Invoice status check error:', error);
      return false;
    }
  };

  /**
   * Send a gratitude gift (zap) to a random Nostr user
   * The zap will appear in the recipient's client notifications
   * @param amount - Amount in sats to send
   * @param message - Optional custom message (defaults to standard gratitude message)
   * @returns Object with success status and invoice info if manual payment needed
   */
  const sendGratitudeGift = async (
    amount: number, 
    message?: string
  ): Promise<{ success: boolean; invoice?: string; zapEndpoint?: string; signedZapRequest?: unknown }> => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to send a gratitude gift.',
        variant: 'destructive',
      });
      return { success: false };
    }

    if (amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please select a valid amount.',
        variant: 'destructive',
      });
      return { success: false };
    }

    setIsSending(true);

    try {
      // Select random recipient (already includes profile validation)
      const recipient = await selectRandomRecipient();

      if (!recipient) {
        toast({
          title: 'No recipient found',
          description: 'Could not find a recipient. Please try again later.',
          variant: 'destructive',
        });
        setIsSending(false);
        return { success: false };
      }

      const { pubkey: recipientPubkey, profileEvent } = recipient;
      
      // Save this recipient to recent recipients list to avoid zapping them again soon
      saveRecentRecipient(recipientPubkey);

      // Get zap endpoint
      const zapEndpoint = await nip57.getZapEndpoint(profileEvent as Event);
      if (!zapEndpoint) {
        toast({
          title: 'Zap endpoint not found',
          description: 'Could not find zap endpoint for recipient.',
          variant: 'destructive',
        });
        setIsSending(false);
        return { success: false };
      }

      // Create zap request with gratitude message
      const zapAmount = amount * 1000; // convert to millisats
      const defaultMessage = "A small gift of gratitude from someone who appreciates you today. 💜";
      const baseMessage = message || defaultMessage;
      // Ensure website URL is included (append if not already present)
      const gratitudeMessage = baseMessage.includes("gratefulday.space") 
        ? baseMessage 
        : `${baseMessage} https://gratefulday.space`;
      
      // Get relay URLs for publishing zap request
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.write)
        .map(r => r.url);
      
      const zapRequest = nip57.makeZapRequest({
        profile: recipientPubkey,
        event: null, // No event reference - profile zap
        amount: zapAmount,
        relays: relayUrls.length > 0 ? relayUrls : [],
        comment: gratitudeMessage,
      });

      // Sign the zap request
      const signedZapRequest = await user.signer.signEvent(zapRequest);

      // Get invoice from zap endpoint
      const res = await fetch(
        `${zapEndpoint}?amount=${zapAmount}&nostr=${encodeURI(JSON.stringify(signedZapRequest))}`
      );

      if (!res.ok) {
        throw new Error('Lightning service did not return a valid invoice');
      }

      const data = await res.json();
      const invoice = data.pr;

      if (!invoice) {
        throw new Error('Lightning service did not return a valid invoice');
      }

      // Pay the invoice
      const currentNWCConnection = getActiveConnection();

      // Helper to handle successful payment
      const handlePaymentSuccess = async () => {
        await publishZapRequest(signedZapRequest);
        setIsSending(false);
        return { success: true };
      };

      // Try NWC first
      if (currentNWCConnection?.connectionString && currentNWCConnection.isConnected) {
        try {
          await sendPayment(currentNWCConnection, invoice);
          return await handlePaymentSuccess();
        } catch (nwcError) {
          console.error('NWC payment failed, falling back:', nwcError);
        }
      }

      // Try WebLN
      if (webln) {
        try {
          let webLnProvider = webln;
          if (webln.enable && typeof webln.enable === 'function') {
            try {
              await webln.enable();
              // enable() may return a provider or void - use original if void
              webLnProvider = webln;
            } catch {
              // Enable failed, use original provider
              webLnProvider = webln;
            }
          }
          await webLnProvider.sendPayment(invoice);
          return await handlePaymentSuccess();
        } catch (weblnError) {
          console.error('WebLN payment failed, falling back to manual payment:', weblnError);
          // Fall through to manual payment option
        }
      }

      // Try default wallet app
      if (config.defaultWalletApp !== 'none') {
        const walletInfo = getWalletAppInfo(config.defaultWalletApp);
        if (walletInfo && openInvoiceInWalletApp(invoice, config.defaultWalletApp)) {
          // User opened in wallet app - return invoice info for polling
          setIsSending(false);
          return {
            success: false,
            invoice,
            zapEndpoint,
            signedZapRequest,
          };
        }
      }

      // No automatic payment method available - return invoice for manual payment
      setIsSending(false);
      return {
        success: false,
        invoice,
        zapEndpoint,
        signedZapRequest,
      };
    } catch (error) {
      console.error('Gratitude gift error:', error);
      toast({
        title: 'Gift failed',
        description: error instanceof Error ? error.message : 'Could not send gratitude gift. Please try again.',
        variant: 'destructive',
      });
      setIsSending(false);
      return { success: false };
    }
  };

  /**
   * Verify payment and publish zap request after manual payment
   * @param forcePublish - If true, publish zap request even if payment can't be verified (user confirmed payment)
   */
  const verifyAndPublishPayment = async (
    invoice: string,
    zapEndpoint: string,
    signedZapRequest: unknown,
    forcePublish: boolean = false
  ): Promise<boolean> => {
    try {
      // Check if invoice is paid
      const isPaid = await checkInvoiceStatus(zapEndpoint, invoice);
      
      if (isPaid || forcePublish) {
        await publishZapRequest(signedZapRequest);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Payment verification error:', error);
      // If force publish, still try to publish
      if (forcePublish) {
        try {
          await publishZapRequest(signedZapRequest);
          return true;
        } catch (publishError) {
          console.error('Failed to publish zap request:', publishError);
        }
      }
      return false;
    }
  };

  return {
    sendGratitudeGift,
    verifyAndPublishPayment,
    checkInvoiceStatus,
    isSending,
  };
}

