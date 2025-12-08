# User Search Implementation

This document summarizes the work that has been done to implement the user search functionality.

## Changes

- **`src/lib/profileSearchService.ts`**: A new service was created to handle the logic for searching for users on Nostr. This service includes functions for searching for profiles by username and fetching a single profile by pubkey.
- **`src/components/AutocompleteTextarea.tsx`**: A new component was created to provide an inline search experience for mentioning users in the gratitude entry. This component uses the `profileSearchService` to fetch user suggestions and displays them in a dropdown menu.
- **`src/components/DayDetailDialog.tsx`**: The `DayDetailDialog` component was modified to use the new `AutocompleteTextarea` component.

## Current Status

The user search functionality is partially implemented. The UI has been updated to provide an inline search experience, but the search is not yet returning any results. The current implementation uses a NIP-50 search to query for users on Nostr relays.

## Next Steps

The next step is to debug why the search is not returning any results. This may involve:
- Investigating the `nostr.query` call in `profileSearchService.ts` to ensure it is being executed correctly.
- Trying different Nostr relays to see if the issue is with the relays being used.
- Implementing a different search method, such as the Primal API, if the NIP-50 search continues to fail.
