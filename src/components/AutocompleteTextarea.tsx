
import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useProfileSearchService } from '@/lib/profileSearchService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { nip19 } from 'nostr-tools';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

type Profile = {
  name: string;
  picture: string;
  pubkey: string;
};

type AutocompleteTextareaProps = {
  value: string;
  onChange: (value: string) => void;
};

export const AutocompleteTextarea = ({ value, onChange }: AutocompleteTextareaProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { searchProfiles, fetchProfile, parseIdentifier } = useProfileSearchService();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const atMatch = textBeforeCursor.match(/@(\w{2,})$/);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (atMatch) {
      setSearching(true);
      setShowDropdown(true);
      debounceTimeout.current = setTimeout(async () => {
        const identifier = parseIdentifier(atMatch[1]);
        if (identifier) {
          const profile = await fetchProfile(identifier.pubkey);
          if (profile) {
            setSuggestions([profile]);
          }
        } else {
          const profiles = await searchProfiles(atMatch[1]);
          setSuggestions(profiles);
        }
        setSearching(false);
      }, 500);
    } else {
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  const handleUserSelect = (profile: Profile) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const mention = `nostr:${nip19.npubEncode(profile.pubkey)}`;
    const newText = `${textBeforeCursor.replace(/@(\w+)$/, mention)} ${textAfterCursor}`;
    onChange(newText);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'ArrowDown') {
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && highlightedIndex > -1) {
      handleUserSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Share what you're grateful for..."
      />
      {showDropdown && (
        <Popover open={showDropdown} onOpenChange={setShowDropdown}>
          <PopoverTrigger asChild>
            <div />
          </PopoverTrigger>
          <PopoverContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="w-80 shadow-lg rounded-lg border"
          >
            {searching && <Loader2 className="animate-spin" />}
            {suggestions.length > 0 ? (
              suggestions.map((profile, index) => (
                <div
                  key={profile.pubkey}
                  className={`p-2 cursor-pointer ${highlightedIndex === index ? 'bg-gray-200' : ''}`}
                  onMouseDown={() => handleUserSelect(profile)}
                >
                  <div className="flex items-center">
                    <Avatar>
                      <AvatarImage src={profile.picture} />
                      <AvatarFallback>{profile.name?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="ml-2">{profile.name}</span>
                  </div>
                </div>
              ))
            ) : (
              !searching && <div className="p-2 text-gray-500">No results found</div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
