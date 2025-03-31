module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add sample properties to the database
      await queryInterface.bulkInsert('Properties', [
        {
          address: '123 Main Street',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          price: 750000,
          bedrooms: 3,
          bathrooms: 2,
          squareFeet: 1800,
          propertyType: 'Single Family Home',
          images: JSON.stringify(['https://images.unsplash.com/photo-1564013799919-ab600027ffc6']),
          description: 'Beautiful single family home in a quiet neighborhood with excellent schools.',
          features: JSON.stringify(['Hardwood floors', 'Renovated kitchen', 'Large backyard']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          address: '456 Oak Avenue',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90024',
          price: 1250000,
          bedrooms: 4,
          bathrooms: 3,
          squareFeet: 2500,
          propertyType: 'Single Family Home',
          images: JSON.stringify(['https://images.unsplash.com/photo-1568605114967-8130f3a36994']),
          description: 'Spacious family home in the heart of Westwood with a pool and updated finishes.',
          features: JSON.stringify(['Swimming pool', 'Gourmet kitchen', 'Master suite', 'Home office']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          address: '789 Pine Lane',
          city: 'Beverly Hills',
          state: 'CA',
          zipCode: '90210',
          price: 3500000,
          bedrooms: 5,
          bathrooms: 4.5,
          squareFeet: 4200,
          propertyType: 'Luxury Estate',
          images: JSON.stringify(['https://images.unsplash.com/photo-1613977257363-707ba9348227']),
          description: 'Exclusive Beverly Hills estate with high-end finishes and spectacular city views.',
          features: JSON.stringify(['City views', 'Home theater', 'Wine cellar', 'Smart home technology']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          address: '101 Beach Road',
          city: 'Malibu',
          state: 'CA',
          zipCode: '90265',
          price: 5750000,
          bedrooms: 4,
          bathrooms: 3.5,
          squareFeet: 3200,
          propertyType: 'Beach House',
          images: JSON.stringify(['https://images.unsplash.com/photo-1512917774080-9991f1c4c750']),
          description: 'Stunning beachfront property with direct access to the sand and panoramic ocean views.',
          features: JSON.stringify(['Beachfront', 'Ocean views', 'Deck', 'Open floor plan']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          address: '222 Sunset Blvd',
          city: 'West Hollywood',
          state: 'CA',
          zipCode: '90069',
          price: 1800000,
          bedrooms: 3,
          bathrooms: 2.5,
          squareFeet: 2100,
          propertyType: 'Condo',
          images: JSON.stringify(['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267']),
          description: 'Modern condo with upscale amenities in a prime West Hollywood location.',
          features: JSON.stringify(['Rooftop pool', 'Gym', 'Concierge', 'Secure parking']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          address: '333 Downtown Drive',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90017',
          price: 950000,
          bedrooms: 2,
          bathrooms: 2,
          squareFeet: 1500,
          propertyType: 'Loft',
          images: JSON.stringify(['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688']),
          description: 'Urban loft in the heart of downtown with industrial finishes and city views.',
          features: JSON.stringify(['High ceilings', 'Exposed brick', 'Open concept', 'Balcony']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          address: '444 Valley Road',
          city: 'Sherman Oaks',
          state: 'CA',
          zipCode: '91403',
          price: 1350000,
          bedrooms: 4,
          bathrooms: 3,
          squareFeet: 2800,
          propertyType: 'Single Family Home',
          images: JSON.stringify(['https://images.unsplash.com/photo-1558036117-15d82a90b9b1']),
          description: 'Spacious family home in the Valley with a large yard and updated kitchen.',
          features: JSON.stringify(['Updated kitchen', 'Backyard', 'Fireplace', 'Two-car garage']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          address: '555 Highland Avenue',
          city: 'Hollywood',
          state: 'CA',
          zipCode: '90028',
          price: 1150000,
          bedrooms: 3,
          bathrooms: 2,
          squareFeet: 1700,
          propertyType: 'Bungalow',
          images: JSON.stringify(['https://images.unsplash.com/photo-1604014237800-1c9102c219da']),
          description: 'Charming Hollywood bungalow with character and modern updates.',
          features: JSON.stringify(['Original details', 'Updated bathroom', 'Garden', 'Porch']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          address: '666 Wilshire Blvd',
          city: 'Santa Monica',
          state: 'CA',
          zipCode: '90401',
          price: 2200000,
          bedrooms: 3,
          bathrooms: 2.5,
          squareFeet: 2000,
          propertyType: 'Townhouse',
          images: JSON.stringify(['https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6']),
          description: 'Luxury townhouse within walking distance to the beach and Santa Monica Pier.',
          features: JSON.stringify(['Rooftop deck', 'Ocean views', 'Smart home', 'Designer finishes']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          address: '777 Mountain Drive',
          city: 'Pasadena',
          state: 'CA',
          zipCode: '91105',
          price: 2750000,
          bedrooms: 5,
          bathrooms: 4,
          squareFeet: 3500,
          propertyType: 'Craftsman',
          images: JSON.stringify(['https://images.unsplash.com/photo-1570129477492-45c003edd2be']),
          description: 'Historic Craftsman home in Pasadena with original details and modern amenities.',
          features: JSON.stringify(['Wood details', 'Built-ins', 'Front porch', 'Mature landscaping']),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      
      console.log('Added sample properties to the database');
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding sample properties:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove all sample properties
      await queryInterface.bulkDelete('Properties', null, {});
      
      console.log('Removed sample properties from the database');
      return Promise.resolve();
    } catch (error) {
      console.error('Error removing sample properties:', error);
      return Promise.reject(error);
    }
  }
}; 