/**
 * Examples of AI responses using the NEW CRITERIA SEARCH format
 * 
 * These examples show how to properly format property search criteria in AI responses.
 * The format consists of a prefix "NEW CRITERIA SEARCH:" followed by comma-separated key-value pairs.
 */

// Example 1: Initial search criteria
const example1 = `
I'll help you find properties that match your requirements of 3+ bedrooms in Austin under $500,000. Let me know if you'd like to refine your search criteria further.

NEW CRITERIA SEARCH: BED:3+, PRICE:$0-$500000, LOCATION:Austin
`;

// Example 2: Updating bathrooms only
const example2 = `
I'll update your search to include properties with 2.5 or more bathrooms while keeping your other criteria the same. This will narrow down the results to homes with 3+ bedrooms, 2.5+ bathrooms, under $500,000 in Austin.

NEW CRITERIA SEARCH: BATH:2.5+
`;

// Example 3: Changing location
const example3 = `
I'll update your search to focus on properties in San Francisco instead of Austin. I'll keep the same criteria for 3+ bedrooms, 2.5+ bathrooms, and under $500,000.

NEW CRITERIA SEARCH: LOCATION:San Francisco
`;

// Example 4: Complete updated criteria set
const example4 = `
Based on your preferences, I've updated your search criteria to 4+ bedrooms, 2.5+ bathrooms, price range $800,000-$1,000,000, and 1,200-2,500 square feet in San Francisco.

NEW CRITERIA SEARCH: BED:4+, BATH:2.5+, PRICE:$800000-$1000000, SQFT:1200-2500, LOCATION:San Francisco
`;

// Example 5: Updating price only
const example5 = `
I understand you'd like to increase your budget to $1,000,000. I'll update your search criteria to reflect this change while keeping all your other preferences the same.

NEW CRITERIA SEARCH: PRICE:$0-$1000000
`;

// Example 6: Including a range of bedrooms
const example6 = `
I'll adjust your search to look for properties with 3 to 5 bedrooms as requested. This gives you a good range of options while still focusing on your other criteria.

NEW CRITERIA SEARCH: BED:3-5
`;

// Example 7: Clearing a field (setting to null)
const example7 = `
I'll update your search to remove the location restriction. This will allow you to see properties that match your other criteria anywhere in the area.

NEW CRITERIA SEARCH: LOCATION:
`;

console.log("Examples of AI responses with NEW CRITERIA SEARCH format:");
console.log(example1);
console.log("\n--------\n");
console.log(example2);
console.log("\n--------\n");
console.log(example3);
console.log("\n--------\n");
console.log(example4);
console.log("\n--------\n");
console.log(example5);
console.log("\n--------\n");
console.log(example6);
console.log("\n--------\n");
console.log(example7); 