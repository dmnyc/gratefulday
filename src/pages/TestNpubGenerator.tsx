import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Copy, Check, Zap, ZapOff, Bot } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { cn } from '@/lib/utils';

/**
 * Dev-only test page for testing the random npub generator
 * Only accessible in development mode
 */
export function TestNpubGenerator() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    allPubkeys: string[];
    pubkeysWithLightning: Array<{ 
      pubkey: string; 
      lightningAddress: string; 
      nip05?: string;
      isBot: boolean;
    }>;
    pubkeysWithoutLightning: string[];
    selectedPubkey: string | null;
    timestamp: Date;
  } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  /**
   * Check if a profile is a bot by looking for "bot" or "news" in nip05 or lightning address
   * Accounts with "news" in NIP-05 are treated as bots
   */
  const isBot = (nip05?: string, lightningAddress?: string): boolean => {
    const nip05Lower = nip05?.toLowerCase() || '';
    const lightningLower = lightningAddress?.toLowerCase() || '';
    return nip05Lower.includes('bot') || 
           nip05Lower.includes('news') || 
           lightningLower.includes('bot');
  };

  const testGenerator = async () => {
    setIsLoading(true);
    try {
      // Query for recent kind 1 events (same logic as useGratitudeGift)
      const signal = AbortSignal.timeout(10000); // Increased timeout for profile checks
      const recentEvents = await nostr.query(
        [{ kinds: [1], limit: 50 }],
        { signal }
      );

      if (recentEvents.length === 0) {
        setResults({
          allPubkeys: [],
          pubkeysWithLightning: [],
          pubkeysWithoutLightning: [],
          selectedPubkey: null,
          timestamp: new Date(),
        });
        setIsLoading(false);
        return;
      }

      // Get unique pubkeys from recent events
      const pubkeys = Array.from(
        new Set(recentEvents.map((e) => e.pubkey))
      ).filter((pk) => pk !== user?.pubkey); // Exclude current user

      if (pubkeys.length === 0) {
        setResults({
          allPubkeys: [],
          pubkeysWithLightning: [],
          pubkeysWithoutLightning: [],
          selectedPubkey: null,
          timestamp: new Date(),
        });
        setIsLoading(false);
        return;
      }

      // Check each pubkey for lightning address and bot status
      const pubkeysWithLightning: Array<{ 
        pubkey: string; 
        lightningAddress: string; 
        nip05?: string;
        isBot: boolean;
      }> = [];
      const pubkeysWithoutLightning: string[] = [];

      // Batch fetch profiles
      const profileSignal = AbortSignal.timeout(10000);
      const profileEvents = await nostr.query(
        [{ kinds: [0], authors: pubkeys, limit: pubkeys.length }],
        { signal: profileSignal }
      );

      // Create a map of pubkey -> profile event
      const profileMap = new Map<string, typeof profileEvents[0]>();
      profileEvents.forEach((event) => {
        profileMap.set(event.pubkey, event);
      });

      // Check each pubkey for lightning address and bot status
      for (const pubkey of pubkeys) {
        const profileEvent = profileMap.get(pubkey);
        if (!profileEvent) {
          pubkeysWithoutLightning.push(pubkey);
          continue;
        }

        try {
          const profileData = JSON.parse(profileEvent.content);
          const lightningAddress = profileData.lud16 || profileData.lud06;
          const nip05 = profileData.nip05;
          
          if (lightningAddress) {
            const botStatus = isBot(nip05, lightningAddress);
            pubkeysWithLightning.push({ 
              pubkey, 
              lightningAddress, 
              nip05,
              isBot: botStatus 
            });
          } else {
            pubkeysWithoutLightning.push(pubkey);
          }
        } catch {
          // Invalid profile JSON
          pubkeysWithoutLightning.push(pubkey);
        }
      }

      // Select random pubkey from those with lightning addresses
      let selectedPubkey: string | null = null;
      if (pubkeysWithLightning.length > 0) {
        const randomIndex = Math.floor(Math.random() * pubkeysWithLightning.length);
        selectedPubkey = pubkeysWithLightning[randomIndex].pubkey;
      }

      setResults({
        allPubkeys: pubkeys,
        pubkeysWithLightning,
        pubkeysWithoutLightning,
        selectedPubkey,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error testing npub generator:', error);
      setResults({
        allPubkeys: [],
        pubkeysWithLightning: [],
        pubkeysWithoutLightning: [],
        selectedPubkey: null,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatPubkey = (pubkey: string): string => {
    try {
      return nip19.npubEncode(pubkey);
    } catch {
      return pubkey;
    }
  };

  // Only show in dev mode
  if (import.meta.env.PROD) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              This page is only available in development mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Random NPUB Generator Test</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Test the random recipient selection logic used in the gratitude gift feature.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={testGenerator}
                disabled={isLoading}
                className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Test
                  </>
                )}
              </Button>
              {results && (
                <span className="text-sm text-muted-foreground">
                  Last run: {results.timestamp.toLocaleTimeString()}
                </span>
              )}
            </div>

            {results && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h3 className="font-semibold text-lg">
                      Found {results.allPubkeys.length} active pubkeys
                    </h3>
                    <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                      <Zap className="h-3 w-3 mr-1" />
                      {results.pubkeysWithLightning.length} with Lightning
                    </Badge>
                    <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                      <Bot className="h-3 w-3 mr-1" />
                      {results.pubkeysWithLightning.filter(p => p.isBot).length} Bots
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                      {results.pubkeysWithLightning.filter(p => !p.isBot).length} Humans
                    </Badge>
                    <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700">
                      <ZapOff className="h-3 w-3 mr-1" />
                      {results.pubkeysWithoutLightning.length} without Lightning
                    </Badge>
                  </div>
                  {results.selectedPubkey && (
                    <div className="p-4 rounded-lg bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-600">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                        Selected Recipient (Random - Has Lightning):
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded flex-1 break-all">
                          {formatPubkey(results.selectedPubkey!)}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(formatPubkey(results.selectedPubkey!), -1)}
                          className="flex-shrink-0"
                        >
                          {copiedIndex === -1 ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Hex: {results.selectedPubkey}
                      </p>
                      {results.pubkeysWithLightning.find(p => p.pubkey === results.selectedPubkey) && (
                        <>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            Lightning: {results.pubkeysWithLightning.find(p => p.pubkey === results.selectedPubkey)!.lightningAddress}
                          </p>
                          {results.pubkeysWithLightning.find(p => p.pubkey === results.selectedPubkey)!.nip05 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              NIP-05: {results.pubkeysWithLightning.find(p => p.pubkey === results.selectedPubkey)!.nip05}
                            </p>
                          )}
                          {results.pubkeysWithLightning.find(p => p.pubkey === results.selectedPubkey)!.isBot && (
                            <Badge variant="outline" className="mt-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                              <Bot className="h-3 w-3 mr-1" />
                              Bot Account
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {!results.selectedPubkey && results.pubkeysWithLightning.length === 0 && (
                    <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600">
                      <p className="text-sm text-yellow-900 dark:text-yellow-100">
                        No pubkeys with lightning addresses found. Cannot select a recipient.
                      </p>
                    </div>
                  )}
                </div>

                {results.pubkeysWithLightning.length > 0 && (
                  <div className="space-y-4">
                    {/* Humans */}
                    {results.pubkeysWithLightning.filter(p => !p.isBot).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                          Humans WITH Lightning ({results.pubkeysWithLightning.filter(p => !p.isBot).length}):
                        </h4>
                        <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20">
                          {results.pubkeysWithLightning
                            .filter(p => !p.isBot)
                            .map((item, index) => {
                              const isSelected = item.pubkey === results.selectedPubkey;
                              return (
                                <div
                                  key={item.pubkey}
                                  className={cn(
                                    'flex items-center gap-2 p-2 rounded',
                                    isSelected
                                      ? 'bg-amber-200 dark:bg-amber-800/50 border border-amber-400 dark:border-amber-600'
                                      : 'bg-background/50 hover:bg-background/80'
                                  )}
                                >
                                  <span className="text-xs text-muted-foreground w-8 flex-shrink-0">
                                    #{index + 1}
                                  </span>
                                  <code className="text-xs flex-1 break-all">
                                    {formatPubkey(item.pubkey)}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(formatPubkey(item.pubkey), index)}
                                    className="flex-shrink-0 h-8 w-8 p-0"
                                  >
                                    {copiedIndex === index ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 flex-shrink-0">
                                    {item.lightningAddress}
                                  </Badge>
                                  {item.nip05 && (
                                    <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 flex-shrink-0">
                                      {item.nip05}
                                    </Badge>
                                  )}
                                  {isSelected && (
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-shrink-0">
                                      (Selected)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Bots */}
                    {results.pubkeysWithLightning.filter(p => p.isBot).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          Bots WITH Lightning ({results.pubkeysWithLightning.filter(p => p.isBot).length}):
                        </h4>
                        <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/20">
                          {results.pubkeysWithLightning
                            .filter(p => p.isBot)
                            .map((item, index) => {
                              const isSelected = item.pubkey === results.selectedPubkey;
                              const humanIndex = results.pubkeysWithLightning.filter(p => !p.isBot).length;
                              return (
                                <div
                                  key={item.pubkey}
                                  className={cn(
                                    'flex items-center gap-2 p-2 rounded',
                                    isSelected
                                      ? 'bg-amber-200 dark:bg-amber-800/50 border border-amber-400 dark:border-amber-600'
                                      : 'bg-background/50 hover:bg-background/80'
                                  )}
                                >
                                  <span className="text-xs text-muted-foreground w-8 flex-shrink-0">
                                    #{humanIndex + index + 1}
                                  </span>
                                  <code className="text-xs flex-1 break-all">
                                    {formatPubkey(item.pubkey)}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(formatPubkey(item.pubkey), humanIndex + index)}
                                    className="flex-shrink-0 h-8 w-8 p-0"
                                  >
                                    {copiedIndex === humanIndex + index ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 flex-shrink-0">
                                    <Bot className="h-3 w-3 mr-1" />
                                    Bot
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 flex-shrink-0">
                                    {item.lightningAddress}
                                  </Badge>
                                  {item.nip05 && (
                                    <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 flex-shrink-0">
                                      {item.nip05}
                                    </Badge>
                                  )}
                                  {isSelected && (
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-shrink-0">
                                      (Selected)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {results.pubkeysWithoutLightning.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <ZapOff className="h-4 w-4 text-gray-500" />
                      Pubkeys WITHOUT Lightning ({results.pubkeysWithoutLightning.length}) - Excluded:
                    </h4>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-4 bg-gray-50/50 dark:bg-gray-950/20 opacity-60">
                      {results.pubkeysWithoutLightning.map((pubkey, index) => (
                        <div
                          key={pubkey}
                          className="flex items-center gap-2 p-2 rounded bg-background/30"
                        >
                          <span className="text-xs text-muted-foreground w-8 flex-shrink-0">
                            #{index + 1}
                          </span>
                          <code className="text-xs flex-1 break-all text-muted-foreground">
                            {formatPubkey(pubkey)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(formatPubkey(pubkey), results.pubkeysWithLightning.length + index)}
                            className="flex-shrink-0 h-8 w-8 p-0"
                          >
                            {copiedIndex === results.pubkeysWithLightning.length + index ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.allPubkeys.length === 0 && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                    <p className="text-sm text-muted-foreground text-center">
                      No active pubkeys found. Try running the test again or check your relay connections.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              1. Queries Nostr relays for recent kind 1 events (text notes)
            </p>
            <p>
              2. Extracts unique pubkeys from event authors
            </p>
            <p>
              3. Filters out your own pubkey (if logged in)
            </p>
            <p>
              4. Checks each pubkey's profile for lightning address (lud16 or lud06)
            </p>
            <p>
              5. Excludes pubkeys without lightning addresses
            </p>
            <p>
              6. Identifies bots by checking if "bot" or "news" appears in NIP-05, or "bot" in lightning address (kept in pool)
            </p>
            <p>
              7. Randomly selects one pubkey from those with lightning addresses (bots included)
            </p>
            <p className="pt-2 text-xs">
              This is the same logic used by the "Send a Gratitude Gift" feature.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

