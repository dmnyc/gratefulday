
import { useNostr } from '@nostrify/react';
import { useCallback } from 'react';
import { nip19 } from 'nostr-tools';

type User = {
  name: string;
  picture: string;
  pubkey: string;
};

export const useProfileSearchService = () => {
  const { nostr, relays: defaultRelays } = useNostr();

  const searchProfiles = useCallback(async (query: string): Promise<User[]> => {
    if (query.length < 2) {
      return [];
    }

    const combinedUsers: User[] = [];

    const allRelays = Array.from(new Set([
      ...(defaultRelays || []).map(r => r.url),
    ]));

    const events = await nostr.query(
      [
        {
          kinds: [0],
          search: query,
          limit: 10,
        },
      ],
      {
        relays: allRelays,
      }
    );

    for (const event of events) {
      try {
        const metadata = JSON.parse(event.content);
        if (metadata.name) {
          combinedUsers.push({
            name: metadata.name,
            picture: metadata.picture,
            pubkey: event.pubkey,
          });
        }
      } catch (e) {
        console.error('Error parsing metadata', e);
      }
    }

    const uniqueUsers = Array.from(new Set(combinedUsers.map((u) => u.pubkey))).map((pubkey) => {
      return combinedUsers.find((u) => u.pubkey === pubkey)!;
    });

    return uniqueUsers;
  }, [nostr, defaultRelays]);

  const fetchProfile = useCallback(async (pubkey: string): Promise<User | null> => {
    const events = await nostr.query(
      [
        {
          kinds: [0],
          authors: [pubkey],
          limit: 1,
        },
      ]
    );

    if (events && events.length > 0) {
      const event = events[0];
      try {
        const metadata = JSON.parse(event.content);
        return {
          name: metadata.name,
          picture: metadata.picture,
          pubkey: event.pubkey,
        };
      } catch (e) {
        console.error('Error parsing metadata', e);
        return null;
      }
    }

    return null;
  }, [nostr]);

  const parseIdentifier = (value: string): { pubkey: string, relays: string[] } | null => {
    try {
      if (value.startsWith('npub1')) {
        const { data } = nip19.decode(value);
        return { pubkey: data as string, relays: [] };
      } else if (value.startsWith('nprofile1')) {
        const { data } = nip19.decode(value);
        const { pubkey, relays } = data as { pubkey: string, relays?: string[] };
        return { pubkey, relays: relays || [] };
      }
    } catch (e) {
      console.error('Error parsing identifier', e);
    }
    return null;
  };


  return {
    searchProfiles,
    fetchProfile,
    parseIdentifier,
  };
};
