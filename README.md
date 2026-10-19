# FLUXORA | Predictive Urban Flood Intelligence

> **Predict. Warn. Act.**  
> *Transforming urban drainage telemetry into proactive municipal flood forecasting and autonomous mitigation.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20ES6%2B-0F766E)](index.html)
[![GIS Engine](https://img.shields.io/badge/GIS%20Map-Leaflet%201.9.4%20%2B%20Google%20Maps-2DD4BF)](assets/js/app.js)
[![Chart Engine](https://img.shields.io/badge/Charts-Chart.js%203.9-D6A84F)](assets/js/app.js)

---

## 📁 Repository Directory Structure

```
FLUXORA/
├── .vscode/                               # VS Code workspace configuration
│   ├── extensions.json                    # Recommended extensions (Live Server, Prettier)
│   └── settings.json                      # Workspace formatting & live server defaults
├── assets/                                # Frontend application assets
│   ├── css/
│   │   └── style.css                      # Municipal Dark Design System (Mineral Teal & Amber)
│   ├── images/
│   │   └── logo.png                       # Official FLUXORA brand logo & favicon
│   └── js/
│       └── app.js                         # State engine, GIS Leaflet map, forecast & physics model
├── docs/                                  # Project documentation & pitch materials
│   ├── Fluxora_Hackathon_Pitch.pptx       # Presentation pitch deck
│   └── SIH_Guide_and_Problem_Statements.pdf # Hackathon problem guide
├── .gitignore                             # Git ignore rules for IDEs, OS, and caches
├── index.html                             # Main application entry point (GitHub Pages compatible)
├── LICENSE                                # MIT Open Source License
└── README.md                              # Complete architecture & developer documentation
```

---

## 🚀 Quick Start Guide

FLUXORA is built as a zero-dependency, offline-first client application. It requires no complex build pipelines, node modules, or database configurations to run.

### Option 1: VS Code (Recommended)
1. Open this repository folder in **VS Code**:
   ```bash
   code .
   ```
2. When prompted, install the recommended **Live Server** extension (`ritwickdey.liveserver`).
3. Right-click [`index.html`](index.html) and select **"Open with Live Server"** (or click **"Go Live"** on the bottom status bar).
4. The dashboard will launch instantly at `http://127.0.0.1:5500/`.

### Option 2: Python Local Dev Server
1. Open a terminal in the project directory:
   ```bash
   python -m http.server 8000
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

### Option 3: Direct File Launch
Double-click [`index.html`](index.html) to open directly in any modern browser (Chrome, Edge, Firefox, Safari). The deterministic simulation engine initializes automatically.

---

## 🏛️ System Architecture

```
                    ┌─────────────────────────┐
                    │    SIMULATION ENGINE    │ (Replaces physical IoT sensors)
                    └────────────┬────────────┘
                                 │ Telemetry Feed (1.0 Hz)
                                 ▼
                    ┌─────────────────────────┐
                    │    PHYSICS RISK MODEL   │ (Multi-parameter deterministic scoring)
                    └────────────┬────────────┘
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
    [ RISK SCORE ]       [ TIME TO CRITICAL ]     [ 45-MIN DUAL FORECAST ]
    (0 - 100%)           (Polynomial Horizon)     (Observed vs Predicted)
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │ Decision Matrix
                                 ▼
                    ┌─────────────────────────┐
                    │    ACTION CONTROLLER    │
                    └────────────┬────────────┘
                                 │ Autonomous Triggers
                                 ▼
                    ┌─────────────────────────┐
                    │   ACTIVE MITIGATION     │ (Pumps 1-2 & Sluice Gates)
                    └────────────┬────────────┘
                                 │ Increased Drainage Capacity
                                 ▼
                    ┌─────────────────────────┐
                    │     RECOVERY STATE      │ (Telemetry stabilizes to Safe Teal)
                    └─────────────────────────┘
```

---

## 🧩 Key Modules & Features

### 1. Leaflet Interactive GIS Catchment Map
* **Multi-Layer Base Maps**: Seamless switching between **Google Maps Dark Roads**, **Google Satellite**, and **Esri Dark Canvas** with zero API key watermarks.
* **Geospatial Nodes (S1 - S4)**: Real-time sensor markers with live radar pulse rings and dynamic severity state transitions (Teal ➔ Amber ➔ Red).
* **Drainage & Discharge Canals**: Dynamic flow vector lines showing flow direction and canal health.
* **Dual-Zone Flood Polygons**:
  * **Observed Inundation**: Red fill for active critical flood zones.
  * **Predicted Flood Horizon**: Dashed Amber boundary indicating anticipated overflow areas.
* **Interactive Sump Stations**: Visual statuses for Pump 1, Pump 2, and Sluice Gate A.

### 2. Water Level Forecast Timeline (Signature Feature)
* Dual-series timeline comparing **Observed Telemetry** (solid teal line) against **Predictive Forecast** (dashed amber line) across `NOW ➔ +10m ➔ +20m ➔ +30m ➔ +45m`.
* Dynamic critical threshold marker ($2.50\,\text{m}$) indicating time-to-breach.

### 3. Physics-Based Deterministic Risk Engine
Risk evaluates in real-time via the deterministic formula:
$$\text{Risk} = (W_{\text{ratio}} \cdot 50) + (R_{\text{ratio}} \cdot 15) + (B_{\text{ratio}} \cdot 20) + (V_{\text{ratio}} \cdot 15)$$

Where:
* **$W$**: Water level normalized to maximum drain capacity ($3.0\,\text{m}$).
* **$R$**: Rainfall intensity normalized to $150\,\text{mm/h}$ cloudburst peak.
* **$B$**: Drainage basin debris blockage percentage ($0-100\%$).
* **$V$**: Rate of rise normalized to $1.0\,\text{m/h}$ peak surge.

### 4. Alert Engine Thresholds
* **NOMINAL** ($0-29\%$): Safe conditions, routine monitoring.
* **WATCH** ($30-59\%$): Early advisory, debris alerts.
* **WARNING** ($60-79\%$): High flood risk, pumps primed on standby.
* **CRITICAL** ($80-100\%$): Imminent overflow, automated mitigation activated.

### 5. Smart Mitigation & Recovery Model
* **Standby**: Risk $< 60\%$.
* **Armed**: Risk $\ge 60\%$.
* **Pumps Ready**: Risk $\ge 80\%$.
* **Full Active Mitigation**: Risk $\ge 90\%$ (Pumps 1 & 2 engage, Sluice Gate A opens).
* **System Recovery**: Outflow rate increases, rate of rise reverses negative, returning nodes safely to Nominal Green/Teal.

### 6. Digital Twin Scenario Sandbox
Test edge cases on demand with single-click scenarios:
* **Baseline Dry**: Standard urban baseline flow.
* **Sudden Cloudburst**: High rainfall surge testing early warning lead time.
* **Severe Drain Blockage**: Rapid localized bottleneck stress test.
* **Combined Flash Flood**: Maximum stress scenario triggering automatic emergency protocols.

---

## 🎨 Design System Palette (Municipal Teal & Amber)

| Variable | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| `--bg` | `#071411` | Deep municipal dark backdrop |
| `--surface` | `#0D1C18` | Primary panel containers |
| `--surface-2` | `#12241F` | Elevated cards and inputs |
| `--primary` | `#0F766E` | Mineral Teal: Infrastructure, drainage, normal telemetry |
| `--primary-light` | `#2DD4BF` | Active flow, pulse rings, live feeds |
| `--prediction` | `#D6A84F` | Prediction Amber: Forecast models, risk trajectories |
| `--warning` | `#D99A2B` | Watch advisories, elevated sensor levels |
| `--danger` | `#C94C4C` | Critical alarm, emergency pumps, active overflow |
| `--state-normal` | `#4F9D69` | Safe operational state |

---

## 🔌 Hardware Deployment Roadmap (ESP32 / LoRaWAN)

To transition from client-side simulation to municipal production hardware:

```
[ Ultrasonic & Flow Sensors ] 
             │
             ▼
      [ ESP32 Node ] ──(LoRaWAN / 4G LTE)──▶ [ MQTT Gateway ] ──▶ [ TimescaleDB + WebSockets ] ──▶ [ FLUXORA UI ]
```

1. **Hardware Nodes**: ESP32 microcontrollers paired with JSN-SR04T waterproof ultrasonic level sensors and optical turbidity/flow meters.
2. **Uplink Payload (JSON / MQTT)**:
   ```json
   {
     "node_id": "S4",
     "timestamp": "2026-10-20T01:30:00Z",
     "water_level_m": 2.18,
     "rainfall_rate_mmh": 72.0,
     "rise_rate_mh": 0.31,
     "blockage_pct": 55.0,
     "battery_v": 3.82
   }
   ```
3. **Frontend Ingestion**: Switch the header toggle from **SIMULATION** to **LIVE DATA** to bind `app.js` to a live WebSocket streaming feed.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
