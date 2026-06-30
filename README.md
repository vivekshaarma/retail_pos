# RetailOS — Omnichannel POS & Inventory System
### MERN Stack + Tailwind CSS + Socket.IO

---

## Project Structure
```
retailos/
├── server/                  ← Express + MongoDB backend
│   ├── models/              ← Mongoose schemas
│   ├── routes/              ← API route handlers
│   ├── middleware/          ← JWT auth guard
│   ├── controllers/         ← Business logic
│   └── index.js             ← Entry point
│
└── client/                  ← React + Tailwind frontend
    └── src/
        ├── components/      ← Reusable UI pieces
        ├── pages/           ← Full page views
        ├── context/         ← Global state (Auth, Cart)
        ├── hooks/           ← Custom React hooks
        └── utils/           ← API helper (axios)
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Atlas free tier)

### 2. Backend setup
```bash
cd server
npm install
# Create .env file:
cp .env.example .env
# Fill in your MONGO_URI and JWT_SECRET
npm run dev
```

### 3. Frontend setup
```bash
cd client
npm install
npm run dev
```

### 4. Open in browser
```
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

### Default login (after seeding)
- **Email:** admin@retailos.in
- **Password:** admin123

---

## Tech Stack
| Layer | Technology |
|---|---|
| Database | MongoDB + Mongoose |
| Backend | Node.js + Express |
| Real-time | Socket.IO |
| Auth | JWT + bcrypt |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| HTTP client | Axios |
| Icons | Lucide React |
# retail_pos
