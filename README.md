# FareWise Zimbabwe 🇿🇼

**Zimbabwe's First Driver-Owned Ride Platform**

> Flat Monthly Fee. Zero Commission. 100% to Drivers. Fair Rides for Zimbabwe.

## Why FareWise Wins

| Platform | Model | Driver Take-Home |
|----------|-------|------------------|
| Bolt | 15–20% commission | ~80% |
| InDrive | Negotiated + hidden fees | ~85% |
| Vaya | Commission-based | ~78% |
| **FareWise** | **Flat $15–25/month** | **100%** |

## Architecture

```
farewise/
├── backend/          # Node.js + Express + PostgreSQL (Supabase)
├── mobile/           # React Native (Expo) — Rider + Driver apps
└── admin/            # React.js Admin Dashboard
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native (Expo) — Android-first |
| Backend API | Node.js + Express |
| Real-time | Socket.IO + Firebase Realtime DB |
| Database | PostgreSQL via Supabase |
| Payments | Paynow Zimbabwe (EcoCash + OneMoney) |
| SMS/OTP | Africa's Talking |
| Push Notifications | Firebase Cloud Messaging |
| Maps | Google Maps / OpenStreetMap |
| Admin Dashboard | React.js + Tailwind CSS |
| Hosting | AWS (Johannesburg region) |

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in your environment variables
npm run dev
```

### Mobile App
```bash
cd mobile
npm install
npx expo start
```

### Admin Dashboard
```bash
cd admin
npm install
npm start
```

## Environment Variables

See `backend/.env.example` for all required environment variables.

## Key Features

### Rider App
- Phone OTP authentication
- Real-time ride booking with map
- Live driver tracking
- Request favourite driver
- EcoCash / OneMoney / Cash payment
- Trip sharing via WhatsApp
- SOS emergency button
- Ride history & receipts

### Driver App
- Subscription management (EcoCash auto-renew)
- Go Online / Offline toggle
- Ride request accept/decline
- Set your own fares
- Weekly/monthly earnings dashboard
- Favourite riders list
- WhatsApp quick messages

### Admin Dashboard
- Driver approval queue
- Subscription & payment tracking
- Dispute resolution center
- Analytics with city heatmap
- Manual ride matching

## Zimbabwe-Specific Features
- EcoCash & OneMoney via Paynow API
- USD + ZiG dual pricing
- Africa's Talking OTP (cheaper than Twilio for ZW)
- WhatsApp Business API integration
- Offline graceful degradation (2G optimised)
- App size under 30MB

## License
Proprietary — FareWise Zimbabwe (Pvt) Ltd
