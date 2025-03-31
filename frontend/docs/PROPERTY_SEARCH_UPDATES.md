# Property Search Criteria Updates

## Summary of Changes

We've made several improvements to the property search criteria system to fix issues with criteria not updating correctly:

1. **Added support for the `NEW CRITERIA SEARCH` format**
   - The system now recognizes `NEW CRITERIA SEARCH: BED:4+, BATH:2.5+, ...` patterns in AI responses
   - This format allows for clear, structured updates to property search criteria

2. **Cumulative Criteria Updates**
   - Fixed the `findPropertySearchCriteriaInMessages` function to properly accumulate criteria
   - Each update now builds upon previous criteria instead of replacing them
   - Added special handling for null values to explicitly clear fields

3. **Enhanced Parsing Logic**
   - Updated `parseStructuredPropertySearch` to check for multiple format patterns
   - Added more robust error handling and logging
   - Improved handling of edge cases

4. **New Developer Tools and Documentation**
   - Created `AI_SEARCH_GUIDE.md` with instructions for AI developers
   - Added `criteria-format-examples.js` with sample responses
   - Created `propertySearchFormatConverter.ts` utility to help with format conversion

## How to Use the New Format

When generating AI responses that update property search criteria, include a line with the following format:

```
NEW CRITERIA SEARCH: BED:4+, BATH:2.5+, PRICE:$800000-$1000000, SQFT:1200-2500, LOCATION:San Francisco
```

Key points:
- Only include fields that are changing
- Each update builds on previous criteria
- Use `+` for minimum values (e.g., `BED:4+`)
- Use ranges with `-` for min/max values (e.g., `SQFT:1200-2500`)
- Include an empty value to clear a field (e.g., `LOCATION:`)

## Testing

You can test these changes by:

1. Sending messages that include the `NEW CRITERIA SEARCH` format
2. Using the "Sync" button on the Property Search Criteria panel
3. Checking the browser console logs to see detected criteria

## Technical Implementation

- Updated regex patterns in `propertySearchApi.ts` to match the new format
- Enhanced the cumulative criteria building logic in `MessageThread.tsx`
- Added improved error handling and logging throughout the criteria extraction process

These changes should ensure that property search criteria are correctly accumulated and displayed throughout the conversation, solving the issue where criteria weren't being properly updated. 