export const CAR_BRANDS = [
  { name: "Tata",         logo: "https://www.carlogos.org/car-logos/tata-logo.png" },
  { name: "Mahindra",     logo: "https://www.carlogos.org/car-logos/mahindra-logo.png" },
  { name: "MG",           logo: "https://www.carlogos.org/car-logos/mg-logo.png" },
  { name: "Hyundai",      logo: "https://www.carlogos.org/car-logos/hyundai-logo.png" },
  { name: "Kia",          logo: "https://www.carlogos.org/car-logos/kia-logo.png" },
  { name: "BYD",          logo: "https://www.carlogos.org/car-logos/byd-logo.png" },
  { name: "Tesla",        logo: "https://www.carlogos.org/car-logos/tesla-logo.png" },
  { name: "Citroen",      logo: "https://www.carlogos.org/car-logos/citroen-logo.png" },
  { name: "Maruti Suzuki",logo: "https://www.carlogos.org/car-logos/suzuki-logo.png" },
  { name: "BMW",          logo: "https://www.carlogos.org/car-logos/bmw-logo.png" },
  { name: "Mercedes-Benz",logo: "https://www.carlogos.org/car-logos/mercedes-benz-logo.png" },
  { name: "Audi",         logo: "https://www.carlogos.org/car-logos/audi-logo.png" },
  { name: "Volvo",        logo: "https://www.carlogos.org/car-logos/volvo-logo.png" },
  { name: "Porsche",      logo: "https://www.carlogos.org/car-logos/porsche-logo.png" },
  { name: "Jaguar",       logo: "https://www.carlogos.org/car-logos/jaguar-logo.png" },
  { name: "Land Rover",   logo: "https://www.carlogos.org/car-logos/land-rover-logo.png" },
  { name: "Lexus",        logo: "https://www.carlogos.org/car-logos/lexus-logo.png" },
  { name: "Volkswagen",   logo: "https://www.carlogos.org/car-logos/volkswagen-logo.png" },
  { name: "Skoda",        logo: "https://www.carlogos.org/car-logos/skoda-logo.png" },
  { name: "Renault",      logo: "https://www.carlogos.org/car-logos/renault-logo.png" },
  { name: "Nissan",       logo: "https://www.carlogos.org/car-logos/nissan-logo.png" },
  { name: "Ford",         logo: "https://www.carlogos.org/car-logos/ford-logo.png" },
  { name: "Chevrolet",    logo: "https://www.carlogos.org/car-logos/chevrolet-logo.png" },
  { name: "Toyota",       logo: "https://www.carlogos.org/car-logos/toyota-logo.png" },
  { name: "Honda",        logo: "https://www.carlogos.org/car-logos/honda-logo.png" },
  { name: "Rivian",       logo: "https://www.carlogos.org/car-logos/rivian-logo.png" },
  { name: "Lucid",        logo: "https://www.carlogos.org/car-logos/lucid-motors-logo.png" },
];

// All connector types used across the catalog, for the compatibility filter UI.
export const CONNECTOR_TYPES = ["CCS2", "Type 2", "CHAdeMO", "GB/T"];

// Vehicle illustrations are rendered with the VehicleVisual component (SVG,
// colored per `color`) — no image URLs needed here anymore.
export const CAR_MODELS = [
  // ── Tata ──
  { brand: "Tata", model: "Nexon EV",     battery_kwh: 40.5, range_km: 453, color: "Teal",  efficiency: 11.1, connectorType: "CCS2" },
  { brand: "Tata", model: "Tiago EV",     battery_kwh: 24,   range_km: 315, color: "Gray",  efficiency: 13.1, connectorType: "CCS2" },
  { brand: "Tata", model: "Punch EV",     battery_kwh: 35,   range_km: 421, color: "Blue",  efficiency: 12.0, connectorType: "CCS2" },
  { brand: "Tata", model: "Curvv EV",     battery_kwh: 45,   range_km: 502, color: "Black", efficiency: 11.2, connectorType: "CCS2" },

  // ── Mahindra ──
  { brand: "Mahindra", model: "XUV400",   battery_kwh: 39.4, range_km: 456, color: "Blue",  efficiency: 11.5, connectorType: "CCS2" },
  { brand: "Mahindra", model: "BE 6",     battery_kwh: 79,   range_km: 683, color: "Red",   efficiency: 8.6,  connectorType: "CCS2" },
  { brand: "Mahindra", model: "XEV 9e",   battery_kwh: 79,   range_km: 656, color: "White", efficiency: 8.3,  connectorType: "CCS2" },

  // ── MG ──
  { brand: "MG", model: "ZS EV",          battery_kwh: 50.3, range_km: 461, color: "White", efficiency: 9.2,  connectorType: "CCS2" },
  { brand: "MG", model: "Comet EV",       battery_kwh: 17.3, range_km: 230, color: "Yellow",efficiency: 13.3, connectorType: "CCS2" },
  { brand: "MG", model: "Windsor EV",     battery_kwh: 38,   range_km: 449, color: "Gray",  efficiency: 11.8, connectorType: "CCS2" },

  // ── Hyundai ──
  { brand: "Hyundai", model: "Ioniq 5",   battery_kwh: 77.4, range_km: 488, color: "Gray",  efficiency: 6.3,  connectorType: "CCS2" },
  { brand: "Hyundai", model: "Kona Electric", battery_kwh: 39.2, range_km: 452, color: "White", efficiency: 8.7, connectorType: "CCS2" },
  { brand: "Hyundai", model: "Ioniq 6",   battery_kwh: 77.4, range_km: 614, color: "Blue",  efficiency: 5.9,  connectorType: "CCS2" },

  // ── Kia ──
  { brand: "Kia", model: "EV6",           battery_kwh: 77.4, range_km: 499, color: "Gray",  efficiency: 6.4,  connectorType: "CCS2" },
  { brand: "Kia", model: "EV9",           battery_kwh: 99.8, range_km: 561, color: "Black", efficiency: 5.6,  connectorType: "CCS2" },

  // ── BYD ──
  { brand: "BYD", model: "Atto 3",        battery_kwh: 60.5, range_km: 420, color: "White", efficiency: 7.1,  connectorType: "CCS2" },
  { brand: "BYD", model: "Seal",          battery_kwh: 82.5, range_km: 650, color: "Blue",  efficiency: 6.7,  connectorType: "CCS2" },
  { brand: "BYD", model: "e6",            battery_kwh: 71.7, range_km: 415, color: "Gray",  efficiency: 5.9,  connectorType: "GB/T" },

  // ── Tesla ──
  { brand: "Tesla", model: "Model 3",     battery_kwh: 75,   range_km: 560, color: "White", efficiency: 7.5,  connectorType: "CCS2" },
  { brand: "Tesla", model: "Model Y",     battery_kwh: 75,   range_km: 533, color: "Black", efficiency: 7.0,  connectorType: "CCS2" },
  { brand: "Tesla", model: "Model S",     battery_kwh: 100,  range_km: 634, color: "Red",   efficiency: 6.3,  connectorType: "CCS2" },

  // ── Citroen ──
  { brand: "Citroen", model: "eC3",       battery_kwh: 29.2, range_km: 320, color: "Yellow",efficiency: 11.0, connectorType: "CCS2" },

  // ── Maruti Suzuki ──
  { brand: "Maruti Suzuki", model: "eVX", battery_kwh: 60,   range_km: 500, color: "Blue",  efficiency: 8.3,  connectorType: "CCS2" },

  // ── BMW ──
  { brand: "BMW", model: "iX1",           battery_kwh: 66.4, range_km: 440, color: "Gray",  efficiency: 6.6,  connectorType: "CCS2" },
  { brand: "BMW", model: "i4",            battery_kwh: 83.9, range_km: 590, color: "Black", efficiency: 5.9,  connectorType: "CCS2" },
  { brand: "BMW", model: "iX",            battery_kwh: 111.5,range_km: 635, color: "White", efficiency: 5.7,  connectorType: "CCS2" },

  // ── Mercedes-Benz ──
  { brand: "Mercedes-Benz", model: "EQB", battery_kwh: 66.5, range_km: 423, color: "Silver",efficiency: 6.4,  connectorType: "CCS2" },
  { brand: "Mercedes-Benz", model: "EQS", battery_kwh: 107.8,range_km: 857, color: "Black", efficiency: 8.0,  connectorType: "CCS2" },

  // ── Audi ──
  { brand: "Audi", model: "e-tron GT",    battery_kwh: 93.4, range_km: 488, color: "Gray",  efficiency: 5.2,  connectorType: "CCS2" },
  { brand: "Audi", model: "Q8 e-tron",    battery_kwh: 106,  range_km: 505, color: "White", efficiency: 4.8,  connectorType: "CCS2" },

  // ── Volvo ──
  { brand: "Volvo", model: "XC40 Recharge", battery_kwh: 78, range_km: 418, color: "Blue",  efficiency: 5.4,  connectorType: "CCS2" },
  { brand: "Volvo", model: "C40 Recharge",  battery_kwh: 78, range_km: 530, color: "Black", efficiency: 6.8,  connectorType: "CCS2" },

  // ── Porsche ──
  { brand: "Porsche", model: "Taycan",    battery_kwh: 93.4, range_km: 484, color: "Blue",  efficiency: 5.2,  connectorType: "CCS2" },
  { brand: "Porsche", model: "Macan Electric", battery_kwh: 100, range_km: 613, color: "Gray", efficiency: 6.1, connectorType: "CCS2" },

  // ── Jaguar ──
  { brand: "Jaguar", model: "I-Pace",     battery_kwh: 90,   range_km: 470, color: "White", efficiency: 5.2,  connectorType: "CCS2" },

  // ── Land Rover ──
  { brand: "Land Rover", model: "Range Rover Electric", battery_kwh: 118, range_km: 480, color: "Black", efficiency: 4.1, connectorType: "CCS2" },

  // ── Lexus ──
  { brand: "Lexus", model: "RZ 450e",     battery_kwh: 71.4, range_km: 440, color: "Silver",efficiency: 6.2,  connectorType: "CCS2" },

  // ── Volkswagen ──
  { brand: "Volkswagen", model: "ID.4",   battery_kwh: 82,   range_km: 520, color: "Blue",  efficiency: 6.3,  connectorType: "CCS2" },
  { brand: "Volkswagen", model: "ID.3",   battery_kwh: 58,   range_km: 426, color: "Red",   efficiency: 7.3,  connectorType: "CCS2" },

  // ── Skoda ──
  { brand: "Skoda", model: "Enyaq iV",    battery_kwh: 82,   range_km: 536, color: "Gray",  efficiency: 6.5,  connectorType: "CCS2" },

  // ── Renault ──
  { brand: "Renault", model: "Megane E-Tech", battery_kwh: 60, range_km: 450, color: "Yellow", efficiency: 7.5, connectorType: "CCS2" },
  { brand: "Renault", model: "Kwid EV",   battery_kwh: 26.8, range_km: 271, color: "White", efficiency: 10.1, connectorType: "CCS2" },

  // ── Nissan ──
  { brand: "Nissan", model: "Leaf",       battery_kwh: 40,   range_km: 270, color: "White", efficiency: 6.8,  connectorType: "CHAdeMO" },
  { brand: "Nissan", model: "Ariya",      battery_kwh: 87,   range_km: 533, color: "Gray",  efficiency: 6.1,  connectorType: "CCS2" },

  // ── Ford ──
  { brand: "Ford", model: "Mustang Mach-E", battery_kwh: 91, range_km: 600, color: "Red",   efficiency: 6.6,  connectorType: "CCS2" },

  // ── Chevrolet ──
  { brand: "Chevrolet", model: "Bolt EV", battery_kwh: 65,   range_km: 417, color: "Blue",  efficiency: 6.4,  connectorType: "CCS2" },

  // ── Toyota ──
  { brand: "Toyota", model: "bZ4X",       battery_kwh: 71.4, range_km: 516, color: "White", efficiency: 7.2,  connectorType: "CCS2" },

  // ── Honda ──
  { brand: "Honda", model: "e:Ny1",       battery_kwh: 68.8, range_km: 412, color: "Black", efficiency: 6.0,  connectorType: "CCS2" },

  // ── Rivian ──
  { brand: "Rivian", model: "R1T",        battery_kwh: 135,  range_km: 644, color: "Green", efficiency: 4.8,  connectorType: "CCS2" },
  { brand: "Rivian", model: "R1S",        battery_kwh: 135,  range_km: 626, color: "Blue",  efficiency: 4.6,  connectorType: "CCS2" },

  // ── Lucid ──
  { brand: "Lucid", model: "Air",         battery_kwh: 118,  range_km: 837, color: "Silver",efficiency: 7.1,  connectorType: "CCS2" },
];
