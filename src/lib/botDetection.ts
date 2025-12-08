/**
 * Bot detection utilities
 * 
 * Functions to identify bot and news accounts in Nostr profiles
 */

/**
 * Check if a profile is a bot or news account
 * by looking for "bot" or "news" in nip05 or lightning address
 * 
 * @param nip05 - NIP-05 identifier (e.g., "user@example.com")
 * @param lightningAddress - Lightning address (e.g., "user@getalby.com")
 * @returns true if the account is identified as a bot or news account
 */
export function isBot(nip05?: string, lightningAddress?: string): boolean {
  const nip05Lower = nip05?.toLowerCase() || '';
  const lightningLower = lightningAddress?.toLowerCase() || '';
  return (
    nip05Lower.includes('bot') ||
    nip05Lower.includes('news') ||
    lightningLower.includes('bot')
  );
}

