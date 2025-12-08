# Random NPUB Generator

A standalone utility for selecting random Nostr pubkeys from active users with lightning addresses. Includes bot detection to identify and categorize bot accounts.

## Features

- **Random Selection**: Selects random pubkeys from recently active Nostr users
- **Lightning Verification**: Only includes users with configured lightning addresses (lud16 or lud06)
- **Bot Detection**: Identifies bot accounts by checking for "bot" or "news" in NIP-05 or lightning addresses
- **Detailed Stats**: Get comprehensive statistics about eligible recipients
- **TypeScript**: Fully typed for better developer experience

## Installation

This is a standalone TypeScript file. Copy `random-npub-generator.ts` to your project.

### Dependencies

- `@nostrify/nostrify` - Nostr protocol library
- `nostr-tools` (optional) - For npub encoding

## Usage

### Basic Usage

```typescript
import { RandomNpubGenerator } from './random-npub-generator';
import { useNostr } from '@nostrify/react'; // or your Nostr instance

// In a React component or function
const { nostr } = useNostr();
const currentUserPubkey = 'your-pubkey-here'; // optional

const generator = new RandomNpubGenerator(nostr, currentUserPubkey);

// Select a random recipient
const recipient = await generator.selectRandomRecipient();
if (recipient) {
  console.log('Selected recipient:', recipient);
}
```

### Get Detailed Information

```typescript
// Get all eligible recipients with details
const { recipients, stats } = await generator.getRecipientsWithDetails();

console.log('Stats:', stats);
// {
//   totalPubkeys: 50,
//   withLightning: 35,
//   withoutLightning: 15,
//   bots: 5,
//   humans: 30
// }

// Filter recipients
const bots = recipients.filter(r => r.isBot);
const humans = recipients.filter(r => !r.isBot);

// Select random from humans only
if (humans.length > 0) {
  const randomHuman = humans[Math.floor(Math.random() * humans.length)];
  console.log('Random human:', randomHuman);
}
```

### Encode to NPUB Format

```typescript
import { nip19 } from 'nostr-tools';

const recipient = await generator.selectRandomRecipient();
if (recipient) {
  const npub = nip19.npubEncode(recipient);
  console.log('NPUB:', npub);
}
```

## API Reference

### `RandomNpubGenerator`

#### Constructor

```typescript
new RandomNpubGenerator(nostr: Nostr, currentUserPubkey?: string)
```

- `nostr`: Your Nostr instance (from `@nostrify/nostrify`)
- `currentUserPubkey`: Optional pubkey to exclude from selection

#### Methods

##### `selectRandomRecipient(limit?: number, timeout?: number): Promise<string | null>`

Selects a random pubkey from eligible recipients.

- `limit`: Number of recent events to query (default: 50)
- `timeout`: Query timeout in milliseconds (default: 5000)
- Returns: Selected pubkey (hex) or `null` if none found

##### `getRecipientsWithDetails(limit?: number, timeout?: number): Promise<{ recipients: RecipientInfo[], stats: GeneratorStats }>`

Gets detailed information about all eligible recipients.

- `limit`: Number of recent events to query (default: 50)
- `timeout`: Query timeout in milliseconds (default: 10000)
- Returns: Object with recipients array and statistics

### Types

#### `RecipientInfo`

```typescript
interface RecipientInfo {
  pubkey: string;        // Hex pubkey
  npub: string;          // NPUB format (empty, encode separately)
  lightningAddress?: string;  // lud16 or lud06
  nip05?: string;        // NIP-05 identifier
  isBot: boolean;        // Bot detection result
}
```

#### `GeneratorStats`

```typescript
interface GeneratorStats {
  totalPubkeys: number;        // Total unique pubkeys found
  withLightning: number;       // Pubkeys with lightning addresses
  withoutLightning: number;    // Pubkeys without lightning addresses
  bots: number;               // Number of bots detected
  humans: number;             // Number of humans
}
```

### Utility Functions

#### `isBot(nip05?: string, lightningAddress?: string): boolean`

Checks if a profile is a bot by looking for "bot" or "news" in NIP-05 or lightning address.

## Bot Detection

An account is identified as a bot if:
- "bot" appears in the NIP-05 identifier (case-insensitive)
- "news" appears in the NIP-05 identifier (case-insensitive)
- "bot" appears in the lightning address (case-insensitive)

Examples:
- `user@bot.example.com` → Bot
- `user@news.example.com` → Bot
- `bot@getalby.com` → Bot
- `user@normal.com` → Human

## License

MIT - Use freely in your projects.

## Contributing

Feel free to submit issues or pull requests for improvements.

