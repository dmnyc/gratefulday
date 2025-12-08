import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWallet } from '@/hooks/useWallet';
import { useNWC } from '@/hooks/useNWCContext';
import { useToast } from '@/hooks/useToast';
import { useAppContext } from '@/hooks/useAppContext';
import { nip57 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { isBot } from '@/lib/botDetection';
import { openInvoiceInWalletApp, getWalletAppInfo } from '@/lib/walletApps';

/**
 * Hook for sending anonymous gratitude gifts (zaps) to random Nostr users
 */
export function useGratitudeGift() {
  const [isSending, setIsSending] = useState(false);
  const { user } = useCurrentUser();
  const { webln, activeNWC } = useWallet();
  const { sendPayment, getActiveConnection } = useNWC();
  const { toast } = useToast();
  const { config } = useAppContext();
  const { nostr } = useNostr();

  /**
   * Helper function to publish zap request to relays (non-blocking)
   */
  const publishZapRequest = async (zapRequest: any) => {
    try {
      await nostr.event(zapRequest, { signal: AbortSignal.timeout(5000) });
    } catch (error) {
      // Payment succeeded but publishing failed - log but don't fail
      console.warn('Payment succeeded but failed to publish zap request to relays:', error);
    }
  };

  /**
   * Select a random active Nostr pubkey with lightning address and return profile event
   * Queries for random active users from recent events and verifies they have lightning addresses
   */
  const selectRandomRecipient = async (): Promise<{ pubkey: string; profileEvent: any; profileData: any } | null> => {
    // Select random recipient from active users with lightning addresses
    try {
      // Query for recent kind 1 events and select a random author
      const signal = AbortSignal.timeout(5000); // Increased timeout for profile checks
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
      ).filter((pk) => pk !== user?.pubkey); // Exclude current user

      if (pubkeys.length === 0) {
        return null;
      }

      // Check each pubkey for lightning address
      const pubkeysWithLightning: string[] = [];
      
      // Batch fetch profiles (query all at once for efficiency)
      const profileSignal = AbortSignal.timeout(5000);
      const profileEvents = await nostr.query(
        [{ kinds: [0], authors: pubkeys, limit: pubkeys.length }],
        { signal: profileSignal }
      );

      // Create a map of pubkey -> profile event
      const profileMap = new Map<string, typeof profileEvents[0]>();
      profileEvents.forEach((event) => {
        profileMap.set(event.pubkey, event);
      });

      // Check each pubkey for lightning address and filter out bots/news accounts
      const validRecipients: Array<{ pubkey: string; profileEvent: any; profileData: any }> = [];
      
      for (const pubkey of pubkeys) {
        const profileEvent = profileMap.get(pubkey);
        if (!profileEvent) {
          continue;
        }

        try {
          const profileData = JSON.parse(profileEvent.content);
          const lightningAddress = profileData.lud16 || profileData.lud06;
          
          if (lightningAddress && !isBot(profileData.nip05, lightningAddress)) {
            validRecipients.push({ pubkey, profileEvent, profileData });
          }
        } catch {
          // Invalid profile JSON, skip
          continue;
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
   * Send a gratitude gift (zap) to a random Nostr user
   * The zap will appear in the recipient's client notifications
   * @param amount - Amount in sats to send
   * @param message - Optional custom message (defaults to standard gratitude message)
   */
  const sendGratitudeGift = async (amount: number, message?: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to send a gratitude gift.',
        variant: 'destructive',
      });
      return false;
    }

    if (amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please select a valid amount.',
        variant: 'destructive',
      });
      return false;
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
        return false;
      }

      const { pubkey: recipientPubkey, profileEvent, profileData } = recipient;
      const lightningAddress = profileData.lud16 || profileData.lud06;

      // Get zap endpoint
      const zapEndpoint = await nip57.getZapEndpoint(profileEvent);
      if (!zapEndpoint) {
        toast({
          title: 'Zap endpoint not found',
          description: 'Could not find zap endpoint for recipient.',
          variant: 'destructive',
        });
        setIsSending(false);
        return false;
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
        return true;
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
          const webLnProvider = webln.enable && typeof webln.enable === 'function'
            ? await webln.enable() || webln
            : webln;
          await webLnProvider.sendPayment(invoice);
          return await handlePaymentSuccess();
        } catch (weblnError) {
          console.error('WebLN payment failed:', weblnError);
          toast({
            title: 'Payment failed',
            description: 'Could not complete payment. Please try again.',
            variant: 'destructive',
          });
          setIsSending(false);
          return false;
        }
      }

      // Try default wallet app
      if (config.defaultWalletApp !== 'none') {
        const walletInfo = getWalletAppInfo(config.defaultWalletApp);
        if (walletInfo && openInvoiceInWalletApp(invoice, config.defaultWalletApp)) {
          await publishZapRequest(signedZapRequest);
          toast({
            title: 'Opening in wallet app',
            description: `Opening invoice in ${walletInfo.name}. Complete the payment there.`,
          });
          setIsSending(false);
          return true;
        }
      }

      // No payment method available
      toast({
        title: 'No payment method',
        description: 'Please connect a Lightning wallet or set a default wallet app in settings to send gratitude gifts.',
        variant: 'destructive',
      });
      setIsSending(false);
      return false;
    } catch (error) {
      console.error('Gratitude gift error:', error);
      toast({
        title: 'Gift failed',
        description: error instanceof Error ? error.message : 'Could not send gratitude gift. Please try again.',
        variant: 'destructive',
      });
      setIsSending(false);
      return false;
    }
  };

  return {
    sendGratitudeGift,
    isSending,
  };
}

