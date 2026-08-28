# ShowMyFleet — React Dashboard

## Tech Stack
- React 18 + Vite
- Tailwind CSS v3
- Leaflet + react-leaflet (OpenStreetMap)
- React Router v6
- Lucide React icons
- date-fns

## Folder Structure

```
frontend/
├── index.html
├── vite.config.js       ← Proxies /api → FastAPI, /ws → WebSocket
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx         ← React + Router entry point
    ├── App.jsx          ← Root: owns WS + vehicle state, layout
    ├── index.css        ← Global styles + dark Leaflet theme
    ├── api/
    │   └── fleetApi.js  ← fetch() wrappers for REST endpoints
    ├── hooks/
    │   ├── useWebSocket.js  ← WS connection + auto-reconnect
    │   └── useVehicles.js   ← REST load + live WS merge
    ├── components/
    │   ├── Sidebar.jsx      ← Nav + connection status
    │   ├── TopBar.jsx       ← Header + last update time
    │   ├── FleetMap.jsx     ← Leaflet map + custom markers
    │   ├── VehicleList.jsx  ← Right panel + search
    │   └── VehicleCard.jsx  ← Single vehicle card
    └── pages/
        ├── Dashboard.jsx    ← Map + vehicle list layout
        └── Vehicles.jsx     ← Table view of all vehicles
```

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173

## Requirements
- Node.js 18+ (LTS)
- FastAPI backend running on port 8000
```
