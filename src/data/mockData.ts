import { Zone, SafetyAlert, CityData, RiskLevel } from '../types';

export const CITIES: CityData[] = [
  { name: 'Andhra Pradesh', center: [15.9129, 79.7400], zoom: 7 },
  { name: 'Arunachal Pradesh', center: [28.2180, 94.7278], zoom: 7 },
  { name: 'Assam', center: [26.2006, 92.9376], zoom: 7 },
  { name: 'Bihar', center: [25.0961, 85.3131], zoom: 7 },
  { name: 'Chandigarh', center: [30.7333, 76.7794], zoom: 11 },
  { name: 'Chhattisgarh', center: [21.2787, 81.8661], zoom: 7 },
  { name: 'Delhi', center: [28.7041, 77.1025], zoom: 10 },
  { name: 'Goa', center: [15.2993, 74.1240], zoom: 9 },
  { name: 'Gujarat', center: [22.2587, 71.1924], zoom: 7 },
  { name: 'Haryana', center: [29.0588, 76.0856], zoom: 7 },
  { name: 'Himachal Pradesh', center: [31.1048, 77.1734], zoom: 7 },
  { name: 'Jammu and Kashmir', center: [33.7782, 76.5762], zoom: 7 },
  { name: 'Jharkhand', center: [23.6102, 85.2799], zoom: 7 },
  { name: 'Karnataka', center: [15.3173, 75.7139], zoom: 7 },
  { name: 'Kerala', center: [10.8505, 76.2711], zoom: 7 },
  { name: 'Ladakh', center: [34.1526, 77.5771], zoom: 7 },
  { name: 'Madhya Pradesh', center: [22.9734, 78.6569], zoom: 7 },
  { name: 'Maharashtra', center: [19.7515, 75.7139], zoom: 7 },
  { name: 'Manipur', center: [24.6637, 93.9063], zoom: 7 },
  { name: 'Meghalaya', center: [25.4670, 91.3662], zoom: 7 },
  { name: 'Mizoram', center: [23.1645, 92.9376], zoom: 7 },
  { name: 'Nagaland', center: [26.1584, 94.5624], zoom: 7 },
  { name: 'Odisha', center: [20.9517, 83.3074], zoom: 7 },
  { name: 'Puducherry', center: [11.9416, 79.8083], zoom: 11 },
  { name: 'Punjab', center: [31.1471, 75.3412], zoom: 7 },
  { name: 'Rajasthan', center: [27.0238, 74.2179], zoom: 7 },
  { name: 'Sikkim', center: [27.5330, 88.5122], zoom: 8 },
  { name: 'Tamil Nadu', center: [11.1271, 78.6569], zoom: 7 },
  { name: 'Telangana', center: [18.1124, 79.0193], zoom: 7 },
  { name: 'Tripura', center: [23.9408, 91.9882], zoom: 8 },
  { name: 'Uttar Pradesh', center: [26.8467, 80.9462], zoom: 7 },
  { name: 'Uttarakhand', center: [30.0668, 79.0193], zoom: 7 },
  { name: 'West Bengal', center: [22.9868, 87.8550], zoom: 7 },
  { name: 'Andaman and Nicobar Islands', center: [11.7401, 92.6586], zoom: 8 },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', center: [20.4283, 72.8397], zoom: 10 },
  { name: 'Lakshadweep', center: [10.5667, 72.6417], zoom: 9 }
];

// Helper to create rich zones for any state
function createZone(
  id: string,
  name: string,
  city: string,
  riskScore: number,
  coordinates: [number, number],
  traffic: number,
  crime: number,
  weatherSeverity: number,
  condition: 'Clear' | 'Rainy' | 'Cloudy' | 'Stormy' | 'Foggy' = 'Cloudy'
): Zone {
  const riskLevel: RiskLevel = riskScore >= 75 ? 'High' : riskScore >= 50 ? 'Medium' : 'Low';
  const primaryFactor = traffic > crime ? 'traffic congestion' : 'incident history';
  const primaryVal = Math.round(riskScore * 0.22);
  const secondaryVal = Math.round(riskScore * 0.14);
  
  return {
    id,
    name,
    city,
    riskScore,
    riskLevel,
    coordinates,
    factors: { traffic, crime, weather: weatherSeverity },
    weather: {
      temp: 24 + Math.round((riskScore % 7) - 3),
      condition,
      humidity: 60 + Math.round((riskScore % 25)),
      wind: 8 + Math.round((riskScore % 10)),
      visibility: riskLevel === 'High' ? 6 : 9
    },
    shapContributions: [
      { factor: 'Traffic Congestion', value: primaryVal, category: 'Traffic' },
      { factor: 'Past Incident History', value: secondaryVal, category: 'Crime' },
      { factor: 'Population Density', value: 8, category: 'Demographics' },
      { factor: 'Rush Hour Timing', value: 6, category: 'Demographics' },
      { factor: 'Emergency Response Coverage', value: -4, category: 'Response' },
      { factor: 'Street Lighting Coverage', value: -3, category: 'Infrastructure' }
    ],
    explanation: `Risk in ${name} (${city}) is classified as ${riskLevel.toUpperCase()} with a score of ${riskScore}/100, driven primarily by ${primaryFactor} (+${primaryVal}%) and localized density factors, partially moderated by active emergency coverage.`,
    confidenceScore: 86 + (riskScore % 10),
    modelName: 'Gradient Boosted Ensemble'
  };
}

export const MOCK_ZONES: Zone[] = [
  // Karnataka
  createZone('blr-electronic-city', 'Electronic City', 'Karnataka', 84, [12.8399, 77.6770], 82, 68, 30),
  createZone('blr-whitefield', 'Whitefield', 'Karnataka', 80, [12.9698, 77.7500], 88, 60, 35),
  createZone('blr-majestic', 'Majestic', 'Karnataka', 76, [12.9774, 77.5729], 92, 55, 30),
  createZone('blr-yeshwanthpur', 'Yeshwanthpur', 'Karnataka', 62, [13.0238, 77.5385], 70, 45, 40),
  createZone('blr-koramangala', 'Koramangala', 'Karnataka', 58, [12.9279, 77.6271], 65, 40, 35),
  createZone('blr-indiranagar', 'Indiranagar', 'Karnataka', 32, [12.9719, 77.6412], 45, 20, 30),
  createZone('mys-palace-zone', 'Mysuru Central', 'Karnataka', 45, [12.3051, 76.6551], 48, 32, 25),
  createZone('hub-junction', 'Hubballi Station Area', 'Karnataka', 64, [15.3647, 75.1240], 68, 52, 30),

  // Delhi
  createZone('del-connaught', 'Connaught Place', 'Delhi', 86, [28.6304, 77.2177], 86, 72, 50),
  createZone('del-noida-sec62', 'Noida Sector 62', 'Delhi', 68, [28.6275, 77.3724], 68, 48, 45),
  createZone('del-cyber-city', 'Gurugram Cyber City', 'Delhi', 75, [28.4950, 77.0878], 75, 34, 45),
  createZone('del-dwarka', 'Dwarka Sector 10', 'Delhi', 58, [28.5859, 77.0498], 58, 62, 40),
  createZone('del-saket', 'Saket District Centre', 'Delhi', 70, [28.5222, 77.2100], 70, 50, 40),
  createZone('del-chandni-chowk', 'Chandni Chowk', 'Delhi', 82, [28.6506, 77.2303], 90, 65, 45),

  // Maharashtra
  createZone('mah-bandra', 'Bandra West', 'Maharashtra', 78, [19.0583, 72.8302], 78, 38, 65),
  createZone('mah-andheri', 'Andheri East', 'Maharashtra', 88, [19.1176, 72.8631], 88, 45, 60),
  createZone('mah-nariman', 'Nariman Point', 'Maharashtra', 42, [18.9269, 72.8228], 54, 20, 50),
  createZone('mah-dadar', 'Dadar TT Circle', 'Maharashtra', 84, [19.0178, 72.8478], 84, 52, 60),
  createZone('mah-pune-hinjewadi', 'Pune Hinjewadi IT Hub', 'Maharashtra', 72, [18.5913, 73.7389], 76, 42, 35),
  createZone('mah-nagpur-sitabuldi', 'Nagpur Sitabuldi', 'Maharashtra', 61, [21.1458, 79.0882], 65, 46, 30),

  // Uttar Pradesh
  createZone('up-hazratganj', 'Hazratganj Lucknow', 'Uttar Pradesh', 80, [26.8486, 80.9454], 80, 55, 40),
  createZone('up-noida', 'Noida Expressway Hub', 'Uttar Pradesh', 74, [28.5355, 77.3910], 74, 58, 45),
  createZone('up-varanasi-cantt', 'Varanasi Cantt', 'Uttar Pradesh', 85, [25.3263, 82.9876], 85, 62, 35),
  createZone('up-kanpur-mall', 'Kanpur Mall Road', 'Uttar Pradesh', 77, [26.4499, 80.3319], 78, 64, 30),
  createZone('up-agra-taj', 'Taj Ganj Agra', 'Uttar Pradesh', 65, [27.1642, 78.0407], 65, 48, 45),
  createZone('up-prayagraj', 'Civil Lines Prayagraj', 'Uttar Pradesh', 63, [25.4530, 81.8340], 66, 49, 30),

  // Tamil Nadu
  createZone('tn-t-nagar', 'T. Nagar Chennai', 'Tamil Nadu', 83, [13.0418, 80.2341], 88, 52, 40),
  createZone('tn-omr', 'OMR Tech Corridor Chennai', 'Tamil Nadu', 71, [12.9165, 80.2280], 75, 42, 35),
  createZone('tn-anna-nagar', 'Anna Nagar Chennai', 'Tamil Nadu', 48, [13.0850, 80.2101], 52, 30, 30),
  createZone('tn-coimbatore-rs', 'RS Puram Coimbatore', 'Tamil Nadu', 59, [11.0094, 76.9499], 62, 38, 25),
  createZone('tn-madurai-meenakshi', 'Meenakshi Temple Zone Madurai', 'Tamil Nadu', 76, [9.9195, 78.1193], 79, 58, 30),

  // West Bengal
  createZone('wb-park-street', 'Park Street Kolkata', 'West Bengal', 79, [22.5516, 88.3524], 82, 54, 45),
  createZone('wb-salt-lake', 'Salt Lake Sector V Kolkata', 'West Bengal', 68, [22.5804, 88.4378], 72, 38, 40),
  createZone('wb-howrah', 'Howrah Station Area', 'West Bengal', 87, [22.5855, 88.3433], 92, 68, 50),
  createZone('wb-newtown', 'New Town Eco Park', 'West Bengal', 42, [22.5958, 88.4682], 46, 25, 30),

  // Gujarat
  createZone('guj-sg-highway', 'SG Highway Ahmedabad', 'Gujarat', 76, [23.0525, 72.5186], 80, 38, 35),
  createZone('guj-maninagar', 'Maninagar Ahmedabad', 'Gujarat', 61, [22.9967, 72.6026], 64, 42, 30),
  createZone('guj-surat-ring', 'Ring Road Surat', 'Gujarat', 78, [21.1959, 72.8302], 82, 45, 35),
  createZone('guj-vadodara-rc', 'RC Dutt Road Vadodara', 'Gujarat', 52, [22.3106, 73.1751], 55, 35, 25),

  // Rajasthan
  createZone('raj-mi-road', 'MI Road Jaipur', 'Rajasthan', 77, [26.9157, 75.8087], 80, 52, 30),
  createZone('raj-vaishali', 'Vaishali Nagar Jaipur', 'Rajasthan', 54, [26.9075, 75.7429], 58, 36, 25),
  createZone('raj-jodhpur-fort', 'Clock Tower Jodhpur', 'Rajasthan', 73, [26.2954, 73.0238], 76, 54, 35),
  createZone('raj-udaipur-lake', 'Fateh Sagar Udaipur', 'Rajasthan', 46, [24.6015, 73.6766], 48, 28, 25),

  // Andhra Pradesh
  createZone('ap-vizag-beach', 'RK Beach Visakhapatnam', 'Andhra Pradesh', 58, [17.7107, 83.3190], 62, 34, 40),
  createZone('ap-vijayawada-bus', 'PNBS Vijayawada', 'Andhra Pradesh', 79, [16.5131, 80.6200], 84, 58, 35),
  createZone('ap-tirupati-alipiri', 'Alipiri Tirupati', 'Andhra Pradesh', 67, [13.6500, 79.3900], 70, 42, 30),

  // Telangana
  createZone('tel-hitec-city', 'HITEC City Hyderabad', 'Telangana', 81, [17.4435, 78.3772], 86, 44, 30),
  createZone('tel-charminar', 'Charminar Heritage Zone', 'Telangana', 84, [17.3616, 78.4747], 88, 62, 35),
  createZone('tel-banjara-hills', 'Banjara Hills Hyderabad', 'Telangana', 49, [17.4156, 78.4350], 55, 28, 25),
  createZone('tel-warangal-chowrasta', 'Hanamkonda Chowrasta', 'Telangana', 63, [17.9980, 79.5600], 66, 48, 30),

  // Kerala
  createZone('ker-mg-road-kochi', 'MG Road Kochi', 'Kerala', 72, [9.9680, 76.2840], 76, 40, 55),
  createZone('ker-kakkanad', 'Kakkanad InfoPark Kochi', 'Kerala', 64, [10.0159, 76.3630], 68, 32, 50),
  createZone('ker-trivandrum-mg', 'East Fort Thiruvananthapuram', 'Kerala', 68, [8.4830, 76.9470], 72, 42, 45),
  createZone('ker-calicut-beach', 'Calicut Beach Kozhikode', 'Kerala', 52, [11.2610, 75.7690], 55, 30, 40),

  // Bihar
  createZone('bih-patna-dak', 'Dak Bungalow Patna', 'Bihar', 85, [25.6093, 85.1376], 89, 68, 35),
  createZone('bih-boring-road', 'Boring Road Patna', 'Bihar', 71, [25.6178, 85.1167], 75, 48, 30),
  createZone('bih-gaya-station', 'Gaya Junction Zone', 'Bihar', 76, [24.8020, 84.9980], 79, 62, 35),

  // Madhya Pradesh
  createZone('mp-indore-vijay', 'Vijay Nagar Indore', 'Madhya Pradesh', 75, [22.7533, 75.8937], 78, 45, 30),
  createZone('mp-bhopal-mpnagar', 'MP Nagar Bhopal', 'Madhya Pradesh', 72, [23.2332, 77.4338], 76, 48, 30),
  createZone('mp-gwalior-fort', 'Lashkar Gwalior', 'Madhya Pradesh', 68, [26.2040, 78.1600], 72, 55, 30),

  // Punjab
  createZone('pun-ludhiana-fzr', 'Ferozepur Road Ludhiana', 'Punjab', 81, [30.8900, 75.8200], 85, 56, 30),
  createZone('pun-amritsar-golden', 'Golden Temple Perimeter', 'Punjab', 76, [31.6200, 74.8765], 80, 52, 30),
  createZone('pun-mohali-phase7', 'Phase 7 Mohali', 'Punjab', 56, [30.7046, 76.7179], 60, 36, 25),

  // Haryana
  createZone('har-cyber-hub', 'DLF CyberHub Gurugram', 'Haryana', 78, [28.4950, 77.0878], 82, 42, 40),
  createZone('har-faridabad-sec15', 'Sector 15 Faridabad', 'Haryana', 65, [28.4089, 77.3178], 68, 48, 35),
  createZone('har-panipat-gt', 'GT Road Panipat', 'Haryana', 72, [29.3909, 76.9635], 76, 54, 30),

  // Jammu and Kashmir
  createZone('jk-lal-chowk', 'Lal Chowk Srinagar', 'Jammu and Kashmir', 74, [34.0720, 74.8100], 76, 58, 45),
  createZone('jk-jammu-raghunath', 'Raghunath Bazar Jammu', 'Jammu and Kashmir', 67, [32.7266, 74.8570], 70, 46, 35),
  createZone('jk-dal-gate', 'Dalgate Boulevard', 'Jammu and Kashmir', 51, [34.0860, 74.8320], 55, 32, 40),

  // Assam
  createZone('asm-gs-road', 'GS Road Guwahati', 'Assam', 78, [26.1550, 91.7760], 82, 52, 45),
  createZone('asm-paltan-bazar', 'Paltan Bazar Guwahati', 'Assam', 83, [26.1800, 91.7500], 87, 64, 40),
  createZone('asm-silchar-point', 'Central Silchar', 'Assam', 62, [24.8333, 92.8000], 65, 45, 40),

  // Odisha
  createZone('odi-saheed-nagar', 'Saheed Nagar Bhubaneswar', 'Odisha', 68, [20.2920, 85.8450], 72, 44, 40),
  createZone('odi-cuttack-badambadi', 'Badambadi Cuttack', 'Odisha', 79, [20.4500, 85.8700], 84, 58, 45),
  createZone('odi-puri-beach', 'Grand Road Puri', 'Odisha', 65, [19.8050, 85.8250], 68, 42, 45),

  // Jharkhand
  createZone('jhk-main-road', 'Main Road Ranchi', 'Jharkhand', 77, [23.3600, 85.3250], 80, 58, 35),
  createZone('jhk-bistupur', 'Bistupur Jamshedpur', 'Jharkhand', 64, [22.7950, 86.1850], 68, 42, 30),
  createZone('jhk-dhanbad-station', 'Dhanbad Station Zone', 'Jharkhand', 82, [23.7957, 86.4304], 86, 65, 35),

  // Uttarakhand
  createZone('utk-rajpur-road', 'Rajpur Road Dehradun', 'Uttarakhand', 67, [30.3380, 78.0620], 70, 40, 45),
  createZone('utk-har-ki-pauri', 'Har Ki Pauri Haridwar', 'Uttarakhand', 80, [29.9560, 78.1700], 84, 54, 40),
  createZone('utk-mall-road', 'Mall Road Nainital', 'Uttarakhand', 55, [29.3900, 79.4600], 58, 32, 50),

  // Himachal Pradesh
  createZone('hp-mall-shimla', 'The Mall Shimla', 'Himachal Pradesh', 62, [31.1048, 77.1734], 65, 35, 50),
  createZone('hp-mcleodganj', 'Main Square McLeod Ganj', 'Himachal Pradesh', 58, [32.2426, 76.3213], 60, 32, 45),
  createZone('hp-manali-mall', 'Mall Road Manali', 'Himachal Pradesh', 65, [32.2396, 77.1887], 68, 38, 55),

  // Chhattisgarh
  createZone('chg-jaistambh', 'Jaistambh Chowk Raipur', 'Chhattisgarh', 78, [21.2400, 81.6300], 82, 55, 30),
  createZone('chg-telibandha', 'Telibandha Raipur', 'Chhattisgarh', 58, [21.2330, 81.6670], 62, 38, 25),
  createZone('chg-bilaspur-link', 'Link Road Bilaspur', 'Chhattisgarh', 66, [22.0800, 82.1400], 70, 46, 30),

  // Goa
  createZone('goa-panaji-church', 'Panaji Church Square', 'Goa', 52, [15.4989, 73.8278], 55, 34, 40),
  createZone('goa-calangute', 'Calangute Beach Road', 'Goa', 74, [15.5440, 73.7550], 78, 52, 45),
  createZone('goa-margao-market', 'Margao Municipal Market', 'Goa', 63, [15.2736, 73.9580], 66, 44, 35),

  // Chandigarh
  createZone('chd-sec17', 'Sector 17 Plaza Chandigarh', 'Chandigarh', 65, [30.7398, 76.7827], 68, 38, 30),
  createZone('chd-sec35', 'Sector 35 Market Chandigarh', 'Chandigarh', 61, [30.7225, 76.7680], 64, 36, 25),
  createZone('chd-elante', 'Elante Mall Industrial Area', 'Chandigarh', 76, [30.7055, 76.8013], 80, 45, 30),

  // Sikkim
  createZone('sik-mg-marg', 'MG Marg Gangtok', 'Sikkim', 54, [27.3314, 88.6138], 58, 28, 50),
  createZone('sik-deorali', 'Deorali Bazar Gangtok', 'Sikkim', 61, [27.3180, 88.6080], 64, 36, 45),

  // Puducherry
  createZone('pud-white-town', 'White Town Promenade', 'Puducherry', 48, [11.9334, 79.8350], 52, 28, 40),
  createZone('pud-j-n-street', 'Jawaharlal Nehru Street', 'Puducherry', 73, [11.9360, 79.8290], 76, 48, 35),

  // Northeast States
  createZone('tri-agartala-city', 'City Centre Agartala', 'Tripura', 62, [23.8315, 91.2868], 65, 42, 40),
  createZone('man-thangal-bazar', 'Thangal Bazar Imphal', 'Manipur', 68, [24.8170, 93.9368], 70, 52, 40),
  createZone('meg-police-bazar', 'Police Bazar Shillong', 'Meghalaya', 71, [25.5788, 91.8933], 75, 44, 50),
  createZone('miz-bara-bazar', 'Bara Bazar Aizawl', 'Mizoram', 59, [23.7271, 92.7176], 62, 34, 45),
  createZone('nag-kohima-main', 'Main Town Kohima', 'Nagaland', 64, [25.6751, 94.1086], 66, 46, 45),
  createZone('aru-itanagar-ganga', 'Ganga Market Itanagar', 'Arunachal Pradesh', 58, [27.0844, 93.6053], 60, 38, 45),
  createZone('lad-leh-main-bazar', 'Main Bazar Leh', 'Ladakh', 45, [34.1526, 77.5771], 48, 22, 50),
  createZone('and-port-blair-aberdeen', 'Aberdeen Bazar Port Blair', 'Andaman and Nicobar Islands', 52, [11.6650, 92.7420], 55, 30, 45),
  createZone('dnh-silvassa-char', 'Char Rasta Silvassa', 'Dadra and Nagar Haveli and Daman and Diu', 58, [20.2763, 73.0083], 62, 38, 30),
  createZone('lak-kavaratti-hub', 'Kavaratti Jetty Area', 'Lakshadweep', 35, [10.5667, 72.6417], 36, 18, 40)
];

export const MOCK_ALERTS: SafetyAlert[] = [
  {
    id: 'alert-1',
    zoneId: 'blr-electronic-city',
    zoneName: 'Electronic City',
    city: 'Karnataka',
    severity: 'High',
    title: 'Peak Traffic Gridlock Hazard',
    description: 'Predictive model detected vehicle congestion index at 82% on main elevated expressway.',
    timestamp: '2 mins ago',
    acknowledged: false
  },
  {
    id: 'alert-2',
    zoneId: 'del-connaught',
    zoneName: 'Connaught Place',
    city: 'Delhi',
    severity: 'High',
    title: 'High Pedestrian Density & Transit Bottleneck',
    description: 'Radial circle congestion index elevated above threshold. Extra patrol allocated.',
    timestamp: '5 mins ago',
    acknowledged: false
  },
  {
    id: 'alert-3',
    zoneId: 'mah-andheri',
    zoneName: 'Andheri East',
    city: 'Maharashtra',
    severity: 'High',
    title: 'Critical Intersection Risk Spike',
    description: 'Western Express Highway junction reporting heavy traffic and reduced lighting score.',
    timestamp: '11 mins ago',
    acknowledged: false
  },
  {
    id: 'alert-4',
    zoneId: 'up-varanasi-cantt',
    zoneName: 'Varanasi Cantt',
    city: 'Uttar Pradesh',
    severity: 'High',
    title: 'Transit Corridor Congestion Spike',
    description: 'Multi-modal station exit points exhibiting rapid volume accumulation.',
    timestamp: '18 mins ago',
    acknowledged: false
  }
];
