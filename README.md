# Shop Floor Lite - Full Stack Mobile App

## 📱 App Overview
A full-stack cross-platform mobile application built for manufacturing environments. The system includes:
- **Frontend:** React Native (Expo) mobile app
- **Backend:** Node.js/Express API with MongoDB
- Enables **Operators** to capture downtime events and complete maintenance tasks
- Allows **Supervisors** to review and acknowledge alerts
- Designed for offline-first operation in low-connectivity environments

**Tech Stack:**
- Frontend: React Native (Expo)
- Backend: Node.js, Express, MongoDB, Mongoose
- Target Platform: Android (APK provided)

---

## 🎥 Video Demo 

https://github.com/user-attachments/assets/a85d9567-a3e8-4788-96bb-198f2826dc33



## 🏗️ Project Structure

```
LimeLight/
├── shop-floor-backend/     # Node.js/Express backend with MongoDB
│   ├── .env               # Environment variables
│   ├── package.json
│   ├── server.js
│   └── ... (other backend files)
│
└── shop-floor-lite/       # React Native frontend
    ├── .env               # Environment variables
    ├── package.json
    ├── app.json
    └── ... (other frontend files)
```

---

## ⚙️ Environment Setup

### Backend Setup (shop-floor-backend)
1. Navigate to the backend directory:
```bash
cd shop-floor-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory with:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

**Important:** Replace `your_mongodb_connection_string_here` with your actual MongoDB connection string. For local development:
```env
MONGODB_URI=mongodb://localhost:27017/shopfloor
```

4. Start the backend server:
```bash
# Development mode
npm run dev

# OR production mode
npm start
```
Backend will run at: `http://localhost:5000`

### Frontend Setup (shop-floor-lite)
1. Navigate to the frontend directory:
```bash
cd shop-floor-lite
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory with:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_BACKEND_URL=http://localhost:5000
```

**Important:** Make sure the backend URL matches your backend server address and port.

4. Start the frontend development server:
```bash
npx expo start
```

5. Run on Android:
- Scan QR code with **Expo Go** app
- Or press `a` to run on Android emulator
- Or: `npx expo start --android`

---

## 🗄️ Database Setup

### Option 1: MongoDB Atlas (Cloud)
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Add to backend `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shopfloor
```

### Option 2: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service:
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

3. Use connection string in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/shopfloor
```

---

## 🔄 API Endpoints

Backend provides these key endpoints:
```
POST    /api/auth/login     - User authentication
GET     /api/machines       - Get machine list
POST    /api/downtime       - Log downtime event
GET     /api/downtime       - Get downtime records
POST    /api/maintenance    - Update checklist
GET     /api/alerts         - Get alerts
PUT     /api/alerts/:id     - Update alert status
GET     /api/kpi/shift      - Get KPI summary
POST    /api/sync           - Sync offline data
```

---

## 🔄 Offline & Sync Strategy

### Architecture
- **AsyncStorage** for local persistence
- **Redux Persist** for state management
- **Queue System** for pending sync operations
- **NetInfo API** for connectivity monitoring



## 📊 KPI Logic & Summary Report

### Selected Metrics & Rationale

| KPI | Why Important | Calculation |
|-----|--------------|-------------|
| **Overall Equipment Effectiveness (OEE)** | Industry standard for manufacturing efficiency | `(Availability × Performance × Quality) × 100` |
| **Total Downtime** | Direct productivity loss indicator | Sum of all downtime minutes |
| **Maintenance Completion Rate** | Preventive maintenance adherence | `(Completed / Total Due) × 100` |
| **Mean Time To Repair (MTTR)** | Average repair speed | `Total Downtime / Number of Stops` |
| **Alert Response Time** | Supervisor responsiveness | `Avg(Acknowledged Time - Created Time)` |


## 🎯 Features Implemented

### Backend (Node.js/Express)
- ✅ RESTful API with proper error handling
- ✅ MongoDB models for all entities
- ✅ JWT authentication middleware
- ✅ CORS configuration for mobile access
- ✅ Data validation with Joi
- ✅ Seed data population endpoint

### Frontend (React Native)
- ✅ Role-based authentication (Operator/Supervisor)
- ✅ Machine dashboard with real-time status
- ✅ Downtime capture with photo attachment
- ✅ Maintenance checklist management
- ✅ Alert workflow system
- ✅ KPI dashboard with shift summary
- ✅ Offline-first with auto-sync
- ✅ Sync status indicator

---

## 🚀 Running the Complete System


### Manual Steps:
1. **First Terminal:** Start MongoDB service
2. **Second Terminal:** Start backend
```bash
cd shop-floor-backend
npm run dev
```
3. **Third Terminal:** Start frontend
```bash
cd shop-floor-lite
npx expo start
```

---


## 📦 Building for Production

### Backend Deployment:
```bash
cd shop-floor-backend
npm run build
# Deploy to your preferred hosting (Heroku, AWS, etc.)
```

### Frontend APK Build:
```bash
cd shop-floor-lite
eas build --platform android --profile production
```

### Environment Variables for Production:
**Backend (.env.production):**
```env
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=strong_production_secret
PORT=5000
CLIENT_URL=https://your-app-url.com
```

**Frontend (.env.production):**
```env
EXPO_PUBLIC_API_URL=https://your-backend-api.com/api
```

---

## 🎥 Video Demo Content
*(90-second walkthrough would cover:)*
1. Operator login and role selection
2. Capturing downtime with photo (offline)
3. Completing maintenance checklist
4. Switching to Supervisor role
5. Acknowledging alerts
6. Viewing KPI dashboard
7. Demonstrating auto-sync when coming online

---



