const FUEL_DATA = {
  "cities": [
    {
      "name": "Thiruvananthapuram",
      "state": "Kerala",
      "p": 103.54,
      "d": 90.03,
      "la": 8.52,
      "lo": 76.93,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-thiruvananthapuram.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-thiruvananthapuram.html"
    },
    {
      "name": "Kollam",
      "state": "Kerala",
      "p": 103.54,
      "d": 95.44,
      "la": 8.89,
      "lo": 76.61,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-kollam.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kollam.html"
    },
    {
      "name": "Pathanamthitta",
      "state": "Kerala",
      "p": 103.54,
      "d": 90.03,
      "la": 9.26,
      "lo": 76.78,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-pathanamthitta.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-pathanamthitta.html"
    },
    {
      "name": "Alappuzha",
      "state": "Kerala",
      "p": 103.54,
      "d": 103.54,
      "la": 9.49,
      "lo": 76.33,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-alappuzha.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-alappuzha.html"
    },
    {
      "name": "Kottayam",
      "state": "Kerala",
      "p": 103.54,
      "d": 103.54,
      "la": 9.59,
      "lo": 76.52,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-kottayam.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kottayam.html"
    },
    {
      "name": "Idukki",
      "state": "Kerala",
      "p": 103.54,
      "d": 96.22,
      "la": 9.85,
      "lo": 76.94,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-idukki.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-idukki.html"
    },
    {
      "name": "Ernakulam (Kochi)",
      "state": "Kerala",
      "p": 103.54,
      "d": 90.03,
      "la": 9.93,
      "lo": 76.26,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-kochi.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kochi.html"
    },
    {
      "name": "Thrissur",
      "state": "Kerala",
      "p": 103.54,
      "d": 103.54,
      "la": 10.52,
      "lo": 76.21,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-thrissur.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-thrissur.html"
    },
    {
      "name": "Palakkad",
      "state": "Kerala",
      "p": 103.54,
      "d": 103.54,
      "la": 10.78,
      "lo": 76.65,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-palakkad.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-palakkad.html"
    },
    {
      "name": "Malappuram",
      "state": "Kerala",
      "p": 103.54,
      "d": 103.54,
      "la": 11.07,
      "lo": 76.07,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-malappuram.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-malappuram.html"
    },
    {
      "name": "Kozhikode",
      "state": "Kerala",
      "p": 103.54,
      "d": 103.54,
      "la": 11.25,
      "lo": 75.77,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-kozhikode.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kozhikode.html"
    },
    {
      "name": "Wayanad",
      "state": "Kerala",
      "p": 103.54,
      "d": 96.02,
      "la": 11.68,
      "lo": 76.13,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-wayanad.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-wayanad.html"
    },
    {
      "name": "Kannur",
      "state": "Kerala",
      "p": 103.54,
      "d": 103.54,
      "la": 11.87,
      "lo": 75.37,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-kannur.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kannur.html"
    },
    {
      "name": "Kasaragod",
      "state": "Kerala",
      "p": 103.54,
      "d": 90.03,
      "la": 12.5,
      "lo": 74.98,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-kasargod.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kasargod.html"
    },
    {
      "name": "Mahe",
      "state": "Puducherry",
      "p": 103.54,
      "d": 83.91,
      "la": 11.7,
      "lo": 75.53,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-mahe.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-mahe.html"
    },
    {
      "name": "Mangaluru",
      "state": "Karnataka",
      "p": 103.54,
      "d": 90.03,
      "la": 12.87,
      "lo": 74.84,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-mangalore.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-mangalore.html"
    },
    {
      "name": "Coimbatore",
      "state": "Tamil Nadu",
      "p": 103.54,
      "d": 103.54,
      "la": 11.01,
      "lo": 76.97,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-coimbatore.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-coimbatore.html"
    },
    {
      "name": "Bengaluru",
      "state": "Karnataka",
      "p": 103.54,
      "d": 90.03,
      "la": 12.97,
      "lo": 77.59,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-bengaluru.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-bengaluru.html"
    },
    {
      "name": "Chennai",
      "state": "Tamil Nadu",
      "p": 103.54,
      "d": 103.54,
      "la": 13.08,
      "lo": 80.27,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-chennai.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-chennai.html"
    },
    {
      "name": "Delhi",
      "state": "Delhi",
      "p": 103.54,
      "d": 87.67,
      "la": 28.61,
      "lo": 77.2,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-new-delhi.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-new-delhi.html"
    },
    {
      "name": "Mumbai",
      "state": "Maharashtra",
      "p": 103.54,
      "d": 90.03,
      "la": 19.07,
      "lo": 72.87,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-mumbai.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-mumbai.html"
    },
    {
      "name": "Kolkata",
      "state": "West Bengal",
      "p": 103.54,
      "d": 103.54,
      "la": 22.57,
      "lo": 88.36,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-kolkata.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kolkata.html"
    },
    {
      "name": "Hyderabad",
      "state": "Telangana",
      "p": 103.54,
      "d": 95.7,
      "la": 17.38,
      "lo": 78.47,
      "goodreturns_url": "https://www.goodreturns.in/petrol-price-in-hyderabad.html",
      "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-hyderabad.html"
    }
  ],
  "history": {
    "p": [
      104.82,
      104.88,
      104.9,
      104.91,
      104.92,
      104.94,
      103.54
    ],
    "d": [
      91.14,
      91.18,
      91.2,
      91.22,
      91.24,
      91.26,
      90.03
    ],
    "days": [
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
      "Tue"
    ]
  },
  "updatedAt": "2026-04-07T18:05:31.520Z"
};