# AI Property Search Criteria Guide

## Property Search Format

When generating responses that update property search criteria, the AI should include a structured format at the end of the message using the following syntax:

```
NEW CRITERIA SEARCH: Min Bed, Min Bath, Min Price, Max Price, Min Square Foot, Max Square Footage, etc.
```

For example:

```
NEW CRITERIA SEARCH: BED:4+, BATH:2.5+, PRICE:$800,000-$1,000,000, SQFT:1200-2500, LOCATION:Pasadena
```

## Key Points

1. Each property update should be separated by commas.
2. Use the `+` symbol to indicate minimum values (e.g., `BED:4+` for 4 or more bedrooms).
3. Use a range with `-` to indicate minimum and maximum values (e.g., `SQFT:1200-2500`).
4. Include a descriptive key before each value (BED, BATH, PRICE, SQFT, LOCATION).
5. Format should be included at the end of the message after the natural language response.

## Supported Fields

- **BED/BEDROOM**: Number of bedrooms (e.g., `BED:3`, `BED:4+`, `BED:3-5`)
- **BATH/BATHROOM**: Number of bathrooms (e.g., `BATH:2`, `BATH:2.5+`)
- **PRICE**: Price range (e.g., `PRICE:$500,000-$800,000`, `PRICE:$800,000`)
- **SQFT**: Square footage (e.g., `SQFT:1500-2500`, `SQFT:2000+`)
- **LOCATION**: Location(s) (e.g., `LOCATION:Austin`, `LOCATION:Pasadena, Culver City`)

## Examples

### Example 1: Setting initial criteria

```
I'll search for homes with 3+ bedrooms in Austin under $500,000.

NEW CRITERIA SEARCH: BED:3+, PRICE:$0-$500,000, LOCATION:Austin
```

### Example 2: Updating criteria

```
I'll update your search to include properties with 2.5 or more bathrooms while keeping your other criteria.

NEW CRITERIA SEARCH: BATH:2.5+
```

### Example 3: Complete criteria set

```
Based on your preferences, I've updated your search criteria to 4+ bedrooms, 2.5+ bathrooms, price range $800,000-$1,000,000, and 1,200-2,500 square feet.

NEW CRITERIA SEARCH: BED:4+, BATH:2.5+, PRICE:$800,000-$1,000,000, SQFT:1200-2500
```

## Implementation Notes

The system parses these criteria in a cumulative manner, meaning each update will only modify the specified fields while preserving previously defined criteria. This allows for incremental updates to the search parameters.

When responding to users about property searches, always include the structured format to ensure proper tracking of their requirements. 