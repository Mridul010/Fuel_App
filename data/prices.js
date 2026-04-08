const FUEL_DATA = {
  "cities": [
    {"name":"Thiruvananthapuram","state":"Kerala", "p":107.48, "d":96.38, "la":8.52, "lo":76.93, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-thiruvananthapuram.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-thiruvananthapuram.html"},
    {"name":"Kollam","state":"Kerala", "p":106.01, "d":96.02, "la":8.89, "lo":76.61, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-kollam.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kollam.html"},
    {"name":"Pathanamthitta","state":"Kerala", "p":106.43, "d":95.37, "la":9.26, "lo":76.78, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-pathanamthitta.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-pathanamthitta.html"},
    {"name":"Alappuzha","state":"Kerala", "p":105.75, "d":94.73, "la":9.49, "lo":76.33, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-alappuzha.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-alappuzha.html"},
    {"name":"Kottayam","state":"Kerala", "p":105.74, "d":94.76, "la":9.59, "lo":76.52, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-kottayam.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kottayam.html"},
    {"name":"Idukki","state":"Kerala", "p":105.91, "d":94.87, "la":9.85, "lo":76.94, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-idukki.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-idukki.html"},
    {"name":"Ernakulam (Kochi)", "state":"Kerala", "p":105.71, "d":94.69, "la":9.93, "lo":76.26, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-kochi.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kochi.html"},
    {"name":"Thrissur", "state":"Kerala", "p":105.98, "d":94.95, "la":10.52, "lo":76.21, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-thrissur.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-thrissur.html"},
    {"name":"Palakkad", "state":"Kerala", "p":106.33, "d":95.43, "la":10.78, "lo":76.65, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-palakkad.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-palakkad.html"},
    {"name":"Malappuram", "state":"Kerala", "p":106.02, "d":95.47, "la":11.07, "lo":76.07, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-malappuram.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-malappuram.html"},
    {"name":"Kozhikode", "state":"Kerala", "p":105.79, "d":94.80, "la":11.25, "lo":75.77, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-kozhikode.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kozhikode.html"},
    {"name":"Wayanad", "state":"Kerala", "p":106.53, "d":95.49, "la":11.68, "lo":76.13, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-wayanad.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-wayanad.html"},
    {"name":"Kannur", "state":"Kerala", "p":105.78, "d":94.78, "la":11.87, "lo":75.37, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-kannur.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kannur.html"},
    {"name":"Kasaragod", "state":"Kerala", "p":106.53, "d":95.49, "la":12.50, "lo":74.98, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-kasargod.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kasargod.html"},
    
    {"name":"Mahe", "state":"Puducherry", "p":93.93, "d":83.91, "la":11.70, "lo":75.53, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-mahe.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-mahe.html"},
    
    {"name":"Mangaluru", "state":"Karnataka", "p":102.09, "d":90.18, "la":12.87, "lo":74.84, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-mangalore.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-mangalore.html"},
    {"name":"Coimbatore", "state":"Tamil Nadu", "p":101.73, "d":93.32, "la":11.01, "lo":76.97, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-coimbatore.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-coimbatore.html"},
    {"name":"Bengaluru", "state":"Karnataka", "p":102.99, "d":91.06, "la":12.97, "lo":77.59, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-bengaluru.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-bengaluru.html"},
    {"name":"Chennai", "state":"Tamil Nadu", "p":100.80, "d":92.39, "la":13.08, "lo":80.27, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-chennai.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-chennai.html"},
    
    {"name":"Delhi", "state":"Delhi", "p":94.77, "d":87.67, "la":28.61, "lo":77.20, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-new-delhi.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-new-delhi.html"},
    {"name":"Mumbai", "state":"Maharashtra", "p":103.54, "d":90.03, "la":19.07, "lo":72.87, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-mumbai.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-mumbai.html"},
    {"name":"Kolkata", "state":"West Bengal", "p":105.41, "d":92.02, "la":22.57, "lo":88.36, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-kolkata.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-kolkata.html"},
    {"name":"Hyderabad", "state":"Telangana", "p":107.46, "d":95.70, "la":17.38, "lo":78.47, "goodreturns_url":"https://www.goodreturns.in/petrol-price-in-hyderabad.html", "d_goodreturns_url": "https://www.goodreturns.in/diesel-price-in-hyderabad.html"}
  ],
  "history": {
    "p": [105.49, 105.49, 105.55, 105.57, 105.59, 105.60, 105.71],
    "d": [94.48, 94.48, 94.52, 94.54, 94.56, 94.58, 94.69],
    "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  },
  "updatedAt": "2026-04-08T06:00:00+05:30"
};
