# Property Search Criteria Guide

## Overview

We've implemented a more robust approach to handling property search criteria in our system. Instead of trying to extract property search criteria from natural language using complex regex patterns, we now rely on structured data provided directly by the AI assistant.

## How It Works

1. When a user updates their property search criteria, the AI assistant will include a structured JSON object in its response
2. The JSON object is formatted with a specific prefix: `NEW PROPERTY SEARCH: {...}`
3. Our system parses this structured data directly, eliminating the need for complex text extraction
4. **Important**: Property search criteria are now cumulative - include only the fields that are being changed

## Example

When a user says something like "I want to change to 4+ bedrooms," the AI assistant should respond with something like:

```
I'll update your search to include properties with 4 or more bedrooms. I'll keep your other criteria the same.

NEW PROPERTY SEARCH: {"minBedrooms": 4}
```

This will update only the bedroom requirement while preserving all other previously specified criteria.

## Cumulative Updates

Each property search criteria update builds upon previous criteria rather than replacing them entirely. This means:

1. Only include fields that are being modified in the NEW PROPERTY SEARCH JSON
2. Any fields not specified will retain their previous values
3. To clear a field, explicitly set it to null (e.g., `"location": null`)

### Example Sequence

1. User: "I'm looking for houses with 3+ bedrooms"
   ```
   NEW PROPERTY SEARCH: {"minBedrooms": 3}
   ```

2. User: "I also want at least 2 bathrooms"
   ```
   NEW PROPERTY SEARCH: {"minBathrooms": 2}
   ```

3. User: "Actually, I want 4+ bedrooms instead"
   ```
   NEW PROPERTY SEARCH: {"minBedrooms": 4}
   ```

The final criteria would be `{"minBedrooms": 4, "minBathrooms": 2}`.

## Supported Properties

The structured property search criteria supports the following fields:

| Field | Description | Example |
|-------|-------------|---------|
| beds / bedrooms | Exact number of bedrooms | `"bedrooms": 3` |
| minBedrooms / minBeds | Minimum number of bedrooms | `"minBedrooms": 4` |
| maxBedrooms / maxBeds | Maximum number of bedrooms | `"maxBedrooms": 5` |
| baths / bathrooms | Exact number of bathrooms | `"bathrooms": 2.5` |
| minBathrooms / minBaths | Minimum number of bathrooms | `"minBathrooms": 2.5` |
| maxBathrooms / maxBaths | Maximum number of bathrooms | `"maxBathrooms": 3.5` |
| minPrice | Minimum price | `"minPrice": 500000` |
| maxPrice | Maximum price | `"maxPrice": 800000` |
| minSqft / minSquareFeet | Minimum square footage | `"minSqft": 2000` |
| maxSqft / maxSquareFeet | Maximum square footage | `"maxSqft": 3000` |
| location | Single location | `"location": "Austin, TX"` |
| locations | Multiple locations | `"locations": ["Austin, TX", "Round Rock, TX"]` |

## Fallback Mechanisms

For backward compatibility, our system still supports:

1. The explicit `NEW SEARCH CRITERIA:` format with key-value pairs
2. Natural language parsing as a last resort

However, the structured JSON approach is the most reliable and should be the primary method moving forward.

## Integration with AI System

When configuring the AI assistant, include instructions to output property search criteria in the structured format whenever a user updates their search preferences.

### Example AI Prompt Addition

```
When a user updates their property search criteria, include a machine-readable JSON object at the end of your response that ONLY contains the fields being updated:

NEW PROPERTY SEARCH: {"minBedrooms": 4}

Important: Only include the fields that are changing. Property search criteria are cumulative and build upon previous criteria.
```

## Benefits

1. **Accuracy**: No more regex errors or missed criteria
2. **Maintainability**: Simpler code with fewer edge cases
3. **Extensibility**: Easy to add new property criteria fields
4. **Performance**: Faster and more efficient processing
5. **Cumulative Updates**: Changes build upon previous criteria instead of replacing them

## Implementation Details

The main components of this implementation are:

1. `propertySearchApi.parseStructuredPropertySearch()` - Parses the structured JSON format
2. `findPropertySearchCriteriaInMessages()` - Accumulates property search criteria across messages
3. `PropertySearchCriteriaSummary` component - Displays the parsed criteria to users 