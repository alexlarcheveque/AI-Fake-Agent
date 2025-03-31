# Property Search Examples for AI Integration

This document provides examples of how to format property search criteria updates for the AI assistant. The key change is that property search criteria are now **cumulative** - each update builds on previous criteria rather than replacing them.

## Key Principles

1. Only include fields that are changing in each update
2. Property search criteria build on top of one another
3. Use structured JSON format with the prefix `NEW PROPERTY SEARCH:`
4. To remove a field, explicitly set it to `null`

## Example Conversation Flow

### Example 1: Building Criteria Incrementally

**User:** I'm looking for houses with 3+ bedrooms.

**AI Assistant:**
```
I'll help you find houses with 3 or more bedrooms. I'll search our listings for properties that match this criteria.

NEW PROPERTY SEARCH: {"minBedrooms": 3}
```

**User:** It should also have at least 2 bathrooms.

**AI Assistant:**
```
I'll update your search to include properties with 3+ bedrooms and at least 2 bathrooms. Let me refine the property matches for you.

NEW PROPERTY SEARCH: {"minBathrooms": 2}
```

**User:** I want to focus on properties between $400,000 and $600,000.

**AI Assistant:**
```
I'll narrow down the search to properties between $400,000 and $600,000 that have 3+ bedrooms and 2+ bathrooms. Let me update your criteria.

NEW PROPERTY SEARCH: {"minPrice": 400000, "maxPrice": 600000}
```

**User:** Actually, I need at least 4 bedrooms now.

**AI Assistant:**
```
I'll increase the bedroom requirement to 4+ bedrooms. The search will still include properties with 2+ bathrooms in the $400,000-$600,000 range.

NEW PROPERTY SEARCH: {"minBedrooms": 4}
```

Final criteria after all updates: `{"minBedrooms": 4, "minBathrooms": 2, "minPrice": 400000, "maxPrice": 600000}`

### Example 2: Changing Criteria

**User:** I want to see houses in Austin with 2+ bedrooms under $500k.

**AI Assistant:**
```
I'll search for houses in Austin with 2+ bedrooms under $500,000. Let me find some options for you.

NEW PROPERTY SEARCH: {"minBedrooms": 2, "maxPrice": 500000, "location": "Austin"}
```

**User:** Actually, let's look in San Francisco instead.

**AI Assistant:**
```
I'll update your search to look in San Francisco instead of Austin. I'll still search for properties with 2+ bedrooms under $500,000.

NEW PROPERTY SEARCH: {"location": "San Francisco"}
```

**User:** I think we need to increase the budget to $800k for San Francisco.

**AI Assistant:**
```
You're right, San Francisco has a higher price point. I'll update your budget to $800,000 while keeping the 2+ bedroom requirement.

NEW PROPERTY SEARCH: {"maxPrice": 800000}
```

Final criteria after all updates: `{"minBedrooms": 2, "maxPrice": 800000, "location": "San Francisco"}`

### Example 3: Clearing a Field

**User:** I want to see 3 bedroom houses in Phoenix with a pool.

**AI Assistant:**
```
I'll search for 3 bedroom houses in Phoenix with a pool. Let me find some options for you.

NEW PROPERTY SEARCH: {"bedrooms": 3, "location": "Phoenix", "features": ["pool"]}
```

**User:** Actually, I don't care about the location anymore. Show me houses anywhere.

**AI Assistant:**
```
I'll remove the location requirement and show you 3 bedroom houses with a pool from all locations.

NEW PROPERTY SEARCH: {"location": null}
```

Final criteria after all updates: `{"bedrooms": 3, "features": ["pool"]}`

## Important Notes for AI Developers

1. Only include fields that are explicitly mentioned or updated by the user
2. Don't repeat unchanged criteria in the NEW PROPERTY SEARCH JSON
3. Use null to clear a field
4. Property search criteria persist between messages
5. Always use the proper field names from the PropertySearchCriteria interface 