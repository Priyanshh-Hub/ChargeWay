const demoData = {
  cars: [
    {
      id: 1,
      brand: "Tata",
      model: "Nexon EV",
      image:
        "https://images.unsplash.com/photo-1593941707882-a5bac6861d75?w=1200&h=800&fit=crop",
      batteryCapacity: "30.2 kWh",
      range: "312 km",
      color: "#1e40af"
    },
    {
      id: 2,
      brand: "Tesla",
      model: "Model 3",
      image:
        "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&h=800&fit=crop",
      batteryCapacity: "75 kWh",
      range: "448 km",
      color: "#dc2626"
    },
    {
      id: 3,
      brand: "Hyundai",
      model: "Kona EV",
      image:
        "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&h=800&fit=crop",
      batteryCapacity: "39.2 kWh",
      range: "345 km",
      color: "#059669"
    }
  ],
  stations: [
    {
      id: 1,
      name: "Central Mall Charging Hub",
      lat: 51.505,
      lng: -0.09,
      chargers: 8,
      available: 5,
      price: "₹12/kWh",
      amenities: ["Cafe", "WiFi", "Restroom"]
    },
    {
      id: 2,
      name: "Tech Park Station",
      lat: 51.51,
      lng: -0.1,
      chargers: 6,
      available: 2,
      price: "₹10/kWh",
      amenities: ["Food Court", "Shopping"]
    },
    {
      id: 3,
      name: "Highway Fast Charge",
      lat: 51.49,
      lng: -0.08,
      chargers: 12,
      available: 8,
      price: "₹15/kWh",
      amenities: ["24/7", "Security"]
    }
  ],
  bookings: [
    {
      id: 1,
      station: "Central Mall Charging Hub",
      date: "2024-03-15",
      time: "10:00 AM",
      duration: 45,
      cost: 240,
      status: "completed"
    },
    {
      id: 2,
      station: "Tech Park Station",
      date: "2024-03-20",
      time: "2:30 PM",
      duration: 60,
      cost: 320,
      status: "completed"
    },
    {
      id: 3,
      station: "Highway Fast Charge",
      date: "2024-03-25",
      time: "11:15 AM",
      duration: 30,
      cost: 180,
      status: "upcoming"
    }
  ],
  reviews: [
    {
      id: 1,
      stationId: 1,
      name: "Amit Sharma",
      rating: 5,
      comment: "Fast charging and clean facilities."
    },
    {
      id: 2,
      stationId: 2,
      name: "Priya Mehta",
      rating: 4,
      comment: "Good location, moderate speed."
    }
  ],
  rewards: [
    { id: 1, title: "₹50 Charging Credit", points: 500, available: true },
    { id: 2, title: "Free Coffee Voucher", points: 200, available: true }
  ]
};

export default demoData;
