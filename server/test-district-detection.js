/**
 * Test script for district detection
 * Tests the detection logic on sample addresses before running on full database
 */

// Import just the detection logic without database dependencies
const LIMA_DISTRICTS = {
  'miraflores': ['miraflores'],
  'san juan de miraflores': ['san juan de miraflores', 'sjm'],
  'san isidro': ['san isidro'],
  'san miguel': ['san miguel'],
  'san borja': ['san borja'],
  'surco': ['surco', 'santiago de surco'],
  'la molina': ['la molina'],
  'barranco': ['barranco'],
  'jesus maria': ['jesus maria', 'jesús maría'],
  'magdalena del mar': ['magdalena del mar', 'magdalena'],
  'pueblo libre': ['pueblo libre'],
  'lince': ['lince'],
  'breña': ['breña', 'brena'],
  'callao': ['callao'],
  'chorrillos': ['chorrillos']
};

class TestDistrictDetector {
  static detectDistrictFromAddress(address) {
    if (!address || typeof address !== 'string') {
      return null;
    }
    
    const addressLower = address.toLowerCase();
    
    for (const [district, variations] of Object.entries(LIMA_DISTRICTS)) {
      for (const variation of variations) {
        const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(addressLower)) {
          if (district === 'miraflores' && addressLower.includes('san juan')) {
            continue;
          }
          return district;
        }
      }
    }
    
    return null;
  }
  
  static detectDistrict(business) {
    return this.detectDistrictFromAddress(business.address);
  }
}

// Sample business addresses to test
const testBusinesses = [
  {
    id: 1,
    name: "Wolf's Den Barber Studio | Miraflores",
    address: "15046, Miraflores 15046, Perú",
    latitude: "-12.1064614",
    longitude: "-77.0303547"
  },
  {
    id: 2,
    name: "OPHTALMIC CENTER - ZEISS VISION EXPERT",
    address: "Av. Los Conquistadores 665, San Isidro 15073, Perú",
    latitude: "-12.1026439",
    longitude: "-77.0367423"
  },
  {
    id: 3,
    name: "INKUT STUDIO - Barber & Tattoo",
    address: "Av. de la Marina 859, Pueblo Libre 15084, Perú",
    latitude: "-12.0819737",
    longitude: "-77.0709001"
  },
  {
    id: 4,
    name: "Garibaldi Extensiones",
    address: "Jr huaraz 775 Breña, Av. España, Lima LIMA 1, Perú",
    latitude: "-12.0580565",
    longitude: "-77.0443773"
  },
  {
    id: 5,
    name: "carsalud",
    address: "XX27+P5F, Calle Miguel Grau San Juanito, San Juan de Miraflores 15001, Perú",
    latitude: "-12.0481916",
    longitude: "-77.0370651"
  },
  {
    id: 6,
    name: "Barberia Nicolas",
    address: "Tulipanes 467, Urb. Santa Isabel, Lima",
    latitude: null,
    longitude: null
  },
  {
    id: 7,
    name: "Test Business",
    address: "Av. Javier Prado Este 996, San Isidro 15036, Perú",
    latitude: null,
    longitude: null
  }
];

console.log('🧪 Testing District Detection Logic\n');

testBusinesses.forEach((business, index) => {
  console.log(`Test ${index + 1}: ${business.name}`);
  console.log(`Address: ${business.address}`);
  console.log(`Coordinates: ${business.latitude || 'N/A'}, ${business.longitude || 'N/A'}`);
  
  const detectedDistrict = TestDistrictDetector.detectDistrict(business);
  
  console.log(`Result: ${detectedDistrict || 'Not detected'}`);
  console.log('---');
});

console.log('\n✅ District detection test completed!');