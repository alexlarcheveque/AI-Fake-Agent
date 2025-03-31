# Structured Data vs. Regex for Property Search

## Overview

We've updated the property search criteria system to use structured data produced by the AI model directly, rather than attempting to parse natural language text with regex patterns. This document explains the advantages of this approach and how it works.

## Structured Data vs. Regex: Key Differences

| Aspect | Regex Approach | Structured Data Approach |
|--------|---------------|--------------------------|
| Reliability | ❌ Prone to errors when text format varies | ✅ Highly reliable as data is explicitly structured |
| Maintainability | ❌ Complex regex patterns are hard to maintain | ✅ Simple JSON parsing is easy to maintain |
| Extensibility | ❌ Adding new fields requires new regex patterns | ✅ New fields can be added without code changes |
| Performance | ❌ Can be slow with complex patterns | ✅ Fast, direct parsing of structured data |
| Accuracy | ❌ May miss criteria or extract incorrect values | ✅ Accurate extraction of exactly what's intended |
| Context Awareness | ❌ Struggles with contextual understanding | ✅ AI model handles context when creating the data |

## How It Works

1. The AI model formulates its response to the user as usual
2. At the end of the response, it includes a structured JSON object with a specific prefix
3. Our code parses this structured data directly, rather than trying to extract it from the natural text
4. The property search criteria are accumulated across messages, building upon previous criteria

Example:
```
I'll update your search to include properties with 4 or more bedrooms.

NEW PROPERTY SEARCH: {"minBedrooms": 4}
```

## Key Implementation Details

1. The `parseStructuredPropertySearch` function looks for the `NEW PROPERTY SEARCH:` prefix followed by a JSON object
2. It extracts and parses only the JSON portion
3. The `findPropertySearchCriteriaInMessages` function accumulates criteria across messages
4. Fields not included in an update retain their previous values
5. Fields can be explicitly cleared by setting them to `null`

## Advantages of Cumulative Updates

With the new approach, property search criteria are cumulative rather than being completely replaced with each update:

1. Each update only needs to include fields that are changing
2. Users can build their search criteria incrementally
3. Context is preserved across the conversation
4. The UI reflects the full combined criteria

## Example Sequence

1. User specifies bedrooms: `{"minBedrooms": 3}`
2. User adds bathrooms: `{"minBathrooms": 2}` 
3. Combined criteria is now: `{"minBedrooms": 3, "minBathrooms": 2}`
4. User updates bedrooms: `{"minBedrooms": 4}`
5. Final criteria: `{"minBedrooms": 4, "minBathrooms": 2}`

## Fallback Mechanisms

For backward compatibility, the system still supports:

1. The explicit `NEW SEARCH CRITERIA:` format with key-value pairs
2. Natural language parsing as a last resort

However, the structured JSON approach is the most reliable and should be the primary method moving forward.

## Best Practices for AI Development

1. Always output property search criteria in the structured format
2. Only include fields that are changing in each update
3. Set fields to `null` to explicitly clear them
4. Be consistent with field names from the PropertySearchCriteria interface

See `frontend/docs/PROPERTY_SEARCH_GUIDE.md` for detailed implementation and usage information, and `frontend/examples/property-search-examples.md` for examples of proper formatting. 