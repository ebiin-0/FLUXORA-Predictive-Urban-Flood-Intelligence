/**
 * FLUXORA | Predictive Urban Flood Intelligence
 * Enterprise Unified Reactive State Engine & Municipal SCADA Controller
 */

// ==========================================================================
// 1. CENTRAL REACTIVE STATE MODEL (Point 1 Unified Data Consistency)
// ==========================================================================
const SYSTEM = {
    mode: 'simulation', // 'simulation' | 'live'
    viewMode: 'engineering', // 'operator' | 'engineering'
    activeSensorId: 'S1',
    warningThreshold: 2.20, // Standard municipal warning level (m)
    criticalThreshold: 2.50, // Standard overflow capacity limit (m)
    sensors: {
        S1: { 
            id: 'S1', 
            name: 'S1: Residential Upstream', 
            ward: 'Ward 5', 
            lat: 10.020,
            lng: 76.295,
            depth: 1.22, 
            baseDepth: 1.22, 
            capacity: 2.50, 
            risingRate: 0.12, 
            flow: 1.4, 
            health: 98, 
            status: 'nominal', 
            history: [1.16, 1.17, 1.18, 1.19, 1.20, 1.21, 1.21, 1.22, 1.22, 1.22] 
        },
        S2: { 
            id: 'S2', 
            name: 'S2: Main Interceptor', 
            ward: 'Ward 8', 
            lat: 10.014,
            lng: 76.304,
            depth: 1.05, 
            baseDepth: 1.05, 
            capacity: 2.50, 
            risingRate: 0.18, 
            flow: 3.8, 
            health: 99, 
            status: 'nominal', 
            history: [0.98, 0.99, 1.00, 1.01, 1.02, 1.03, 1.04, 1.04, 1.05, 1.05] 
        },
        S3: { 
            id: 'S3', 
            name: 'S3: Commercial Runoff', 
            ward: 'Ward 5', 
            lat: 10.019,
            lng: 76.315,
            depth: 0.91, 
            baseDepth: 0.91, 
            capacity: 2.50, 
            risingRate: 0.06, 
            flow: 2.1, 
            health: 96, 
            status: 'nominal', 
            history: [0.86, 0.87, 0.88, 0.89, 0.89, 0.90, 0.90, 0.91, 0.91, 0.91] 
        },
        S4: { 
            id: 'S4', 
            name: 'S4: Low-Lying Outlet', 
            ward: 'Ward 12', 
            lat: 10.007,
            lng: 76.304,
            depth: 1.48, 
            baseDepth: 1.48, 
            capacity: 2.50, 
            risingRate: 0.24, 
            flow: 4.5, 
            health: 97, 
            status: 'nominal', 
            history: [1.38, 1.40, 1.41, 1.42, 1.43, 1.45, 1.46, 1.47, 1.47, 1.48] 
        }
    },
    weatherModes: [
        { name: 'Light Drizzle', intensity: 12, desc: 'Steady Trend', icon: 'cloud-drizzle', forecast: 18 },
        { name: 'Moderate Rain', intensity: 38, desc: 'Increasing Inflow', icon: 'cloud-rain', forecast: 55 },
        { name: 'Heavy Monsoon', intensity: 75, desc: 'Storm Front Active', icon: 'cloud-lightning', forecast: 95 },
        { name: 'Cloudburst Crisis', intensity: 140, desc: 'Extreme Catchment Surge', icon: 'cloud-lightning', forecast: 160 }
    ],
    weatherLevel: 0,
    blockagePercent: 0,
    pumps: { pump1: false, pump2: false, mode: 'auto' },
    gates: { gateA: false, mode: 'auto' },
    s3FaultActive: false,
    simSpeed: 1.0,
    freshnessVal: 1.2,
    livePackets: { count: 18492, latency: 38 },
    broadcastLifecycle: 'READY',
    narrative: {
        active: false,
        stage: 1,
        stageSeconds: 0,
        totalSeconds: 0
    }
};

// Global Chart References
let telemetryChart = null;
let chartRainVsLevel = null;
let chartRiskTime = null;
let chartSensorComp = null;
let chartPumpActivity = null;
let simInterval = null;
let packetInterval = null;

// Dynamic Incident Archive (Point 13)
const incidentRecords = [
    { id: 'INC-8092', timestamp: '27 Aug 16:40', ward: 'Ward 12 (Outlet Basin)', peakDepth: '2.68 m', maxRisk: '89% CRITICAL', rainfall: '68 mm/h', blockage: '55%', response: 'Pumps 1 & 2 Auto-Active (42m)', status: 'Recovered' },
    { id: 'INC-8041', timestamp: '19 Aug 11:15', ward: 'Ward 8 (Main Interceptor)', peakDepth: '2.41 m', maxRisk: '74% HIGH', rainfall: '45 mm/h', blockage: '30%', response: 'Sluice Gate A Opened (15m)', status: 'Recovered' },
    { id: 'INC-7994', timestamp: '04 Aug 09:20', ward: 'Ward 12 (Outlet Basin)', peakDepth: '2.54 m', maxRisk: '82% CRITICAL', rainfall: '52 mm/h', blockage: '40%', response: 'Pumps 1 & 2 Auto-Active (28m)', status: 'Recovered' },
    { id: 'INC-7850', timestamp: '28 Jul 14:05', ward: 'Ward 5 (Residential Upstream)', peakDepth: '1.92 m', maxRisk: '48% MODERATE', rainfall: '34 mm/h', blockage: '10%', response: 'Gravity Bypass Standby', status: 'Recovered' }
];

// ==========================================================================
// 2. DOM INITIALIZATION & EVENT WIRING
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Icons
    if (window.lucide) lucide.createIcons();

    // 2. Wire Tab Routing (Points 10, 11, 12, 14)
    document.querySelectorAll('.tab-link').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.tab;
            
            document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(c => {
                c.style.display = 'none';
            });

            const targetTab = document.getElementById(targetId);
            if (targetTab) {
                targetTab.style.display = 'flex';
            }

            // Invalidate map size when returning to main dashboard
            if (targetId === 'tab-live-monitor') {
                setTimeout(() => {
                    if (window.fluxoraMap) window.fluxoraMap.invalidateSize();
                }, 50);
            }

            // If Analytics Hub opened, initialize and resize charts
            if (targetId === 'tab-analytics') {
                initAnalyticsCharts();
            }

            logSystemMessage(`Switched console viewpoint to: ${btn.textContent.trim()}`);
        });
    });

    // 3. Wire Operation Mode Switcher (SIMULATION vs LIVE DATA) (Points 2 & 15)
    const btnModeSim = document.getElementById('mode-sim-tab');
    const btnModeLive = document.getElementById('mode-live-tab');
    const netBadge = document.getElementById('header-live-badge');
    const netText = document.getElementById('header-network-text');
    const netFreshness = document.getElementById('header-freshness');
    const liveBanner = document.getElementById('live-packet-banner');

    if (btnModeSim && btnModeLive) {
        btnModeSim.addEventListener('click', () => {
            SYSTEM.mode = 'simulation';
            btnModeSim.classList.add('active');
            btnModeLive.classList.remove('active');

            netBadge.style.borderColor = 'rgba(6, 182, 212, 0.3)';
            netBadge.style.background = 'rgba(6, 182, 212, 0.06)';
            netBadge.style.color = 'var(--primary-light)';
            netBadge.querySelector('.status-dot').style.background = 'var(--primary-light)';
            netText.textContent = 'SIMULATED';
            netFreshness.textContent = '● Simulation Feed';
            
            if (liveBanner) liveBanner.style.display = 'none';
            logSystemMessage("System context switched to LOCAL DIGITAL TWIN SIMULATION feed.");
        });

        btnModeLive.addEventListener('click', () => {
            SYSTEM.mode = 'live';
            btnModeLive.classList.add('active');
            btnModeSim.classList.remove('active');

            netBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            netBadge.style.background = 'rgba(16, 185, 129, 0.06)';
            netBadge.style.color = 'var(--state-normal)';
            netBadge.querySelector('.status-dot').style.background = 'var(--state-normal)';
            netText.textContent = 'LIVE';
            netFreshness.textContent = '● Connected';

            if (liveBanner) liveBanner.style.display = 'flex';
            logSystemMessage("Connected to MQTT Node Gateway: Ingesting live physical sensor packets.", "warning");
        });
    }

    // 4. Wire View Mode Switcher (OPERATOR vs ENGINEERING) (Point 19)
    const btnViewOp = document.getElementById('btn-view-op');
    const btnViewEng = document.getElementById('btn-view-eng');
    if (btnViewOp && btnViewEng) {
        btnViewOp.addEventListener('click', () => {
            document.body.classList.add('mode-operator');
            document.body.classList.remove('mode-engineering');
            btnViewOp.classList.add('active');
            btnViewEng.classList.remove('active');
            logSystemMessage("Console switched to OPERATOR VIEW (Essential decision KPIs only).");
        });
        btnViewEng.addEventListener('click', () => {
            document.body.classList.remove('mode-operator');
            document.body.classList.add('mode-engineering');
            btnViewEng.classList.add('active');
            btnViewOp.classList.remove('active');
            logSystemMessage("Console switched to ENGINEERING VIEW (Full mathematical diagnostics).");
        });
    }

    // 5. Interactive Map Node Selection
    document.querySelectorAll('.sensor-node').forEach(node => {
        node.addEventListener('click', () => {
            selectSensor(node.dataset.sensor);
        });
    });

    // 6. Digital Twin Slider Controls
    const weatherSlider = document.getElementById('sim-weather');
    if (weatherSlider) {
        weatherSlider.addEventListener('input', (e) => {
            SYSTEM.weatherLevel = parseInt(e.target.value);
            updateWeatherState();
            simTick();
        });
    }

    const blockageSlider = document.getElementById('sim-blockage');
    if (blockageSlider) {
        blockageSlider.addEventListener('input', (e) => {
            SYSTEM.blockagePercent = parseInt(e.target.value);
            document.getElementById('sim-blockage-value').textContent = 
                `${SYSTEM.blockagePercent}% (${SYSTEM.blockagePercent > 70 ? 'Severe Blockage' : SYSTEM.blockagePercent > 30 ? 'Moderate' : 'Clear'})`;
            simTick();
        });
    }

    // 7. Sump Pumps & Gate Toggle Buttons
    document.querySelectorAll('#pump-mode-group .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#pump-mode-group .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SYSTEM.pumps.mode = btn.dataset.val;
            logSystemMessage(`Sump drainage mode changed manually to: ${SYSTEM.pumps.mode.toUpperCase()}`);
            simTick();
        });
    });

    document.querySelectorAll('#gate-mode-group .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#gate-mode-group .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SYSTEM.gates.mode = btn.dataset.val;
            logSystemMessage(`Sluice gate release mode set manually to: ${SYSTEM.gates.mode.toUpperCase()}`);
            simTick();
        });
    });

    // 8. S3 Telemetry Fault Toggle (Point 16)
    const toggleFault = document.getElementById('toggle-s3-fault');
    if (toggleFault) {
        toggleFault.addEventListener('change', (e) => {
            SYSTEM.s3FaultActive = e.target.checked;
            const banner = document.getElementById('redundancy-banner');
            const sh3 = document.getElementById('sh-s3-status');
            const valEl = document.getElementById('sim-fault-value');
            
            if (SYSTEM.s3FaultActive) {
                if (banner) banner.style.display = 'block';
                if (sh3) sh3.innerHTML = '<span class="sh-dot dot-red"></span> OFFLINE <span class="sh-pct">0%</span>';
                if (valEl) valEl.textContent = 'S3 OFFLINE ⚠️';
                logSystemMessage("⚠️ TELEMETRY FAULT: Sensor S3 signal degraded. Activating spatial covariance redundancy.", "warning");
            } else {
                if (banner) banner.style.display = 'none';
                if (sh3) sh3.innerHTML = '<span class="sh-dot dot-green"></span> ONLINE <span class="sh-pct">96%</span>';
                if (valEl) valEl.textContent = 'Normal Feeds';
                logSystemMessage("Sensor S3 connection re-established. Diagnostic state restored.");
            }
            simTick();
        });
    }

    // 9. Presets Selector Dropdown
    const presetSelect = document.getElementById('sim-preset');
    if (presetSelect) {
        presetSelect.addEventListener('change', (e) => {
            applyPreset(e.target.value);
        });
    }

    // 10. Simulation Speed Buttons
    document.querySelectorAll('#sim-speed-group .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#sim-speed-group .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SYSTEM.simSpeed = parseFloat(btn.dataset.val);
            document.getElementById('sim-speed-value').textContent = 
                `${SYSTEM.simSpeed}x ${SYSTEM.simSpeed === 1 ? '(Normal)' : SYSTEM.simSpeed === 0.5 ? '(Slow)' : '(Fast)'}`;
            restartSimInterval();
        });
    });

    // 11. Narrative Stress Test Controls (Point 8)
    const btnDemo = document.getElementById('btn-trigger-demo');
    if (btnDemo) {
        btnDemo.addEventListener('click', triggerNarrativeStressTest);
    }
    const btnCancelNarrative = document.getElementById('btn-cancel-narrative');
    if (btnCancelNarrative) {
        btnCancelNarrative.addEventListener('click', stopNarrativeStressTest);
    }

    // 12. Reset Button
    const btnReset = document.getElementById('btn-reset-sim');
    if (btnReset) {
        btnReset.addEventListener('click', resetSimulation);
    }

    // 13. Analytics Range Buttons (Point 12)
    document.querySelectorAll('#analytics-range-group .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#analytics-range-group .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateAnalyticsCharts(btn.dataset.range);
        });
    });

    // 14. Initialize Leaflet Map and Primary Telemetry Chart
    initFluxoraMap();
    initTelemetryChart();

    // 15. Render Initial Incident Records Table
    renderIncidentTable();

    // 16. Start Core Engine Ticks
    selectSensor('S1');
    restartSimInterval();
    startLivePacketCounter();
});

// ==========================================================================
// 3. SENSOR SELECTION & UNIFIED PRESENTATION (Point 1)
// ==========================================================================
function selectSensor(sensorId) {
    if (!SYSTEM.sensors[sensorId]) return;
    SYSTEM.activeSensorId = sensorId;

    // Update active highlight on Leaflet markers
    ['S1', 'S2', 'S3', 'S4'].forEach(id => {
        const marker = mapMarkers.sensors && mapMarkers.sensors[id];
        if (marker) {
            marker.setIcon(getSensorDivIcon(SYSTEM.sensors[id], id === sensorId));
        }
    });

    // Fly map smoothly to sensor position if fluxoraMap is initialized
    if (fluxoraMap && SYSTEM.sensors[sensorId]) {
        const s = SYSTEM.sensors[sensorId];
        fluxoraMap.flyTo([s.lat, s.lng], 15, { duration: 0.8 });
    }

    // Update active highlight on Sensor Data Table rows
    const tbody = document.getElementById('sensor-table-body');
    if (tbody) {
        Array.from(tbody.children).forEach((row, idx) => {
            const ids = ['S1', 'S2', 'S3', 'S4'];
            if (ids[idx] === sensorId) {
                row.classList.add('selected-row');
            } else {
                row.classList.remove('selected-row');
            }
        });
    }

    simTick();
}

// ==========================================================================
// 4. CORE SIMULATION ENGINE TICK & MATHEMATICAL MODEL (Points 4, 5, 6, 9)
// ==========================================================================
function simTick() {
    const s = SYSTEM.sensors[SYSTEM.activeSensorId];
    const w = SYSTEM.weatherModes[SYSTEM.weatherLevel];

    // 1. Compute Hydrodynamic Rise Rates & Depths
    // Base inflow proportional to rain intensity
    const rainFactor = w.intensity / 100;
    const blockageFactor = 1 + (SYSTEM.blockagePercent / 80);

    // Dynamic Sump Pump Action
    let pumpsActive = false;
    if (SYSTEM.pumps.mode === 'on') {
        pumpsActive = true;
    } else if (SYSTEM.pumps.mode === 'auto') {
        // Auto SCADA: pumps turn ON if S4 level crosses warning threshold (2.20 m) or risk > 70%
        if (SYSTEM.sensors.S4.depth >= SYSTEM.warningThreshold || w.intensity >= 70) {
            pumpsActive = true;
        }
    }
    SYSTEM.pumps.pump1 = pumpsActive;
    SYSTEM.pumps.pump2 = pumpsActive;

    // Sluice Gate A Action
    let gateOpen = false;
    if (SYSTEM.gates.mode === 'open') {
        gateOpen = true;
    } else if (SYSTEM.gates.mode === 'auto') {
        if (SYSTEM.sensors.S2.depth >= 1.60 || SYSTEM.blockagePercent >= 50) {
            gateOpen = true;
        }
    }
    SYSTEM.gates.gateA = gateOpen;

    // Discharge mitigation capacity
    const pumpMitigation = pumpsActive ? 0.35 : 0.0;
    const gateMitigation = gateOpen ? 0.20 : 0.0;

    // Update each sensor in network
    Object.keys(SYSTEM.sensors).forEach(id => {
        const node = SYSTEM.sensors[id];
        let localRise = (rainFactor * 0.28 * blockageFactor) - (id === 'S4' ? pumpMitigation : id === 'S2' ? gateMitigation : 0.05);
        if (localRise < -0.40) localRise = -0.40;
        node.risingRate = Math.max(-0.40, localRise);

        // Advance simulated depth slightly with dampening
        node.depth = Math.max(0.60, Math.min(3.20, node.depth + (node.risingRate * 0.012)));

        // Update history array
        node.history.push(node.depth);
        if (node.history.length > 10) node.history.shift();

        // Update node status
        if (node.depth >= SYSTEM.criticalThreshold) {
            node.status = 'danger';
        } else if (node.depth >= SYSTEM.warningThreshold) {
            node.status = 'warning';
        } else {
            node.status = 'nominal';
        }
    });

    // Handle S3 fault override
    if (SYSTEM.s3FaultActive) {
        SYSTEM.sensors.S3.status = 'danger';
    }

    // Update UI Components with Unified Data
    updateHeaderUI();
    updateMetricsCards(s, w);
    updateTelemetryPanel(s);
    updateHorizontalFloodTimeline(s);
    updateRiskScoringBreakdown(s, w);
    updateActionCenter(s, pumpsActive, gateOpen);
    updateSensorTableUI();
    updateMapVisuals();
    updateTelemetryChartData(s);
    updateConfidenceScore();
}

// ==========================================================================
// 5. COMPONENT-SPECIFIC UI UPDATE FUNCTIONS
// ==========================================================================

// Header & Weather UI
function updateHeaderUI() {
    const w = SYSTEM.weatherModes[SYSTEM.weatherLevel];
    const weatherVal = document.getElementById('sim-weather-value');
    if (weatherVal) weatherVal.textContent = `${w.name} (${w.intensity} mm/h)`;

    const weatherDesc = document.getElementById('weather-desc');
    if (weatherDesc) {
        weatherDesc.textContent = `${SYSTEM.mode.toUpperCase()} MODE · ${w.name.toUpperCase()}`;
    }

    const weatherIcon = document.getElementById('weather-icon');
    if (weatherIcon && window.lucide) {
        weatherIcon.setAttribute('data-lucide', w.icon);
        window.lucide.createIcons();
    }
}

// Top 4 Metrics Row (Point 1 & 20)
function updateMetricsCards(s, w) {
    // 1. Rainfall
    const valRain = document.getElementById('val-rainfall');
    const subRain = document.getElementById('sub-rainfall');
    if (valRain) valRain.textContent = `${w.intensity} mm/h`;
    if (subRain) subRain.textContent = w.desc;

    // 2. System Water Level (UNIFIED with active sensor & explicit warning/critical thresholds)
    const valLevel = document.getElementById('val-avg-level');
    const subLevel = document.getElementById('sub-avg-level');
    if (valLevel) valLevel.textContent = `${s.depth.toFixed(2)} m`;
    if (subLevel) subLevel.textContent = `Warning: ${SYSTEM.warningThreshold.toFixed(2)} m · Critical: ${SYSTEM.criticalThreshold.toFixed(2)} m`;

    // 3. Flood Risk Score
    const risk = computeHybridRisk(s, w);
    const valRisk = document.getElementById('val-risk');
    const subRisk = document.getElementById('sub-risk');
    if (valRisk) {
        valRisk.textContent = `${risk.score}%`;
        valRisk.className = `metric-value ${risk.score >= 80 ? 'text-red' : risk.score >= 60 ? 'text-yellow' : 'text-green'}`;
    }
    if (subRisk) {
        subRisk.textContent = `${risk.rating} · Outfall Threshold: ${s.capacity.toFixed(2)} m`;
    }

    // 4. Time to Critical
    const valEta = document.getElementById('val-time-to-critical');
    const subEta = document.getElementById('sub-time-to-critical');
    if (valEta && subEta) {
        const remainingCap = s.capacity - s.depth;
        if (remainingCap <= 0) {
            valEta.textContent = 'CAPACITY BREACHED';
            valEta.className = 'metric-value text-red';
            subEta.textContent = 'OVERFLOW ACTIVE AT NODE';
        } else if (s.risingRate <= 0.01) {
            valEta.textContent = 'NO IMMEDIATE THREAT';
            valEta.className = 'metric-value text-green';
            subEta.textContent = 'Level Stable or Receding';
        } else {
            // Rising rate in m/h -> convert to mins
            const minsToCritical = Math.round((remainingCap / s.risingRate) * 60);
            valEta.textContent = `${minsToCritical} min`;
            valEta.className = `metric-value ${minsToCritical <= 15 ? 'text-red' : 'text-yellow'}`;
            subEta.textContent = `Estimated advance warning horizon`;
        }
    }
}

// Active Sensor Telemetry
function updateTelemetryPanel(s) {
    const focusName = document.getElementById('focus-sensor-name');
    const focusStatus = document.getElementById('focus-sensor-status');
    if (focusName) focusName.textContent = s.name;
    if (focusStatus) {
        focusStatus.textContent = s.status.toUpperCase();
        focusStatus.className = `sensor-status-badge ${s.status === 'danger' ? 'state-danger' : s.status === 'warning' ? 'state-warning' : 'state-normal'}`;
    }

    const telDepth = document.getElementById('tel-depth');
    const telProgress = document.getElementById('tel-depth-progress');
    if (telDepth) telDepth.textContent = `${s.depth.toFixed(2)} m`;
    if (telProgress) {
        const pct = Math.min(100, Math.round((s.depth / s.capacity) * 100));
        telProgress.style.width = `${pct}%`;
        telProgress.className = `progress-bar-fill ${pct >= 85 ? 'progress-red' : pct >= 70 ? 'progress-yellow' : 'progress-green'}`;
    }

    const telRise = document.getElementById('tel-rise-rate');
    const telRiseSub = document.getElementById('tel-rise-sub');
    if (telRise) {
        telRise.textContent = `${s.risingRate >= 0 ? '+' : ''}${s.risingRate.toFixed(2)} m/h`;
        telRise.className = `tel-value ${s.risingRate > 0.25 ? 'text-red' : s.risingRate > 0.05 ? 'text-yellow' : 'text-green'}`;
    }
    if (telRiseSub) {
        telRiseSub.textContent = s.risingRate > 0.20 ? 'Rapid Ascent' : s.risingRate > 0 ? 'Gradual Ascent' : 'Drawdown Active';
        telRiseSub.className = `tel-delta ${s.risingRate > 0.20 ? 'text-red' : s.risingRate > 0 ? 'text-yellow' : 'text-green'}`;
    }

    const telWarn = document.getElementById('tel-warning-thresh');
    const telCap = document.getElementById('tel-capacity');
    if (telWarn) telWarn.textContent = `${SYSTEM.warningThreshold.toFixed(2)} m`;
    if (telCap) telCap.textContent = `${s.capacity.toFixed(2)} m`;
}

// Horizontal Flood Horizon Timeline (Requirement 8)
function updateHorizontalFloodTimeline(s) {
    const now = s.depth;
    const rate = s.risingRate; // m/h

    // 45-min forecast lookaheads matching chart data
    const d10 = Math.max(0.50, Math.min(3.20, now + (rate * (10 / 60))));
    const d20 = Math.max(0.50, Math.min(3.20, now + (rate * (20 / 60))));
    const d30 = Math.max(0.50, Math.min(3.20, now + (rate * (30 / 60))));
    const d45 = Math.max(0.50, Math.min(3.20, now + (rate * (45 / 60))));

    const depths = [now, d10, d20, d30, d45];
    const ids = ['now', '10', '20', '30', '45'];

    depths.forEach((d, idx) => {
        const nodeEl = document.getElementById(`fht-node-${ids[idx]}`);
        const depthEl = document.getElementById(`fht-depth-${ids[idx]}`);
        if (depthEl) depthEl.textContent = `${d.toFixed(2)}m`;
        if (nodeEl) {
            nodeEl.classList.remove('state-danger', 'state-warning', 'state-normal');
            if (d >= SYSTEM.criticalThreshold) {
                nodeEl.classList.add('state-danger');
            } else if (d >= SYSTEM.warningThreshold) {
                nodeEl.classList.add('state-warning');
            } else {
                nodeEl.classList.add('state-normal');
            }
        }
    });

    // Alert Box below timeline (Fix: Only alert when breach is predicted within forecast window)
    const alertBox = document.getElementById('telemetry-chart-forecast-alert');
    if (alertBox) {
        if (now >= SYSTEM.criticalThreshold) {
            alertBox.textContent = 'CRITICAL OVERFLOW ACTIVE AT THIS STATION';
            alertBox.style.color = 'var(--danger)';
            alertBox.style.background = 'rgba(201, 76, 76, 0.15)';
            alertBox.style.borderColor = 'rgba(201, 76, 76, 0.35)';
        } else if (d45 >= SYSTEM.criticalThreshold && rate > 0) {
            const mins = Math.max(1, Math.round(((SYSTEM.criticalThreshold - now) / rate) * 60));
            alertBox.textContent = `ALERT: Critical threshold breach predicted in ${mins} minutes`;
            alertBox.style.color = 'var(--danger)';
            alertBox.style.background = 'rgba(201, 76, 76, 0.12)';
            alertBox.style.borderColor = 'rgba(201, 76, 76, 0.3)';
        } else if (d45 >= SYSTEM.warningThreshold && rate > 0) {
            const mins = Math.max(1, Math.round(((SYSTEM.warningThreshold - now) / rate) * 60));
            alertBox.textContent = `WARNING: Warning threshold crossing predicted in ${mins} minutes`;
            alertBox.style.color = 'var(--warning)';
            alertBox.style.background = 'rgba(217, 154, 43, 0.12)';
            alertBox.style.borderColor = 'rgba(217, 154, 43, 0.3)';
        } else {
            alertBox.textContent = 'Predicted critical level: NO IMMEDIATE THREAT (CHANNELS STABLE)';
            alertBox.style.color = 'var(--state-normal)';
            alertBox.style.background = 'rgba(79, 157, 105, 0.08)';
            alertBox.style.borderColor = 'rgba(79, 157, 105, 0.25)';
        }
    }

    // Sync active sensor title in the timeline header
    const titleEl = document.getElementById('active-sensor-title');
    if (titleEl) {
        titleEl.textContent = `${s.id}: ${s.name.includes(':') ? s.name.split(':')[1].trim() : s.name}`;
    }
}

// Hybrid Flood Risk Scoring Model & Breakdown Table (Points 4, 5, 9)
function computeHybridRisk(s, w) {
    const cW = Math.min(50, Math.max(0, (s.depth / s.capacity) * 50));
    const cR = Math.min(15, Math.max(0, (w.intensity / 150) * 15));
    const cV = Math.min(15, Math.max(0, (Math.max(0, s.risingRate) / 1.0) * 15));
    const cB = Math.min(20, Math.max(0, (SYSTEM.blockagePercent / 100) * 20));
    const total = Math.min(100, Math.round(cW + cR + cV + cB));

    let rating = 'LOW';
    if (total >= 80) rating = 'CRITICAL';
    else if (total >= 60) rating = 'HIGH';
    else if (total >= 40) rating = 'MODERATE';

    return { cW, cR, cV, cB, score: total, rating };
}

function updateRiskScoringBreakdown(s, w) {
    const risk = computeHybridRisk(s, w);

    // Update Drivers (Point 9)
    const dPrimary = document.getElementById('driver-primary');
    const dSecondary = document.getElementById('driver-secondary');
    const dImpact = document.getElementById('driver-impact');
    const dTime = document.getElementById('driver-time');

    if (dPrimary) {
        dPrimary.textContent = s.depth >= SYSTEM.warningThreshold ? 'Critical Hydraulic Inflow' : 
            SYSTEM.blockagePercent >= 50 ? 'Severe Catch Basin Obstruction' : 'Water Level Inflow';
    }
    if (dSecondary) {
        dSecondary.textContent = w.intensity >= 60 ? `Monsoon Precipitation (${w.intensity} mm/h)` : 
            SYSTEM.blockagePercent > 0 ? `${SYSTEM.blockagePercent}% Debris Blockage` : 'Nominal Basin Drainage';
    }
    if (dImpact) {
        dImpact.textContent = risk.score >= 80 ? 'Ward 12 Low-Lying Inundation Risk' :
            risk.score >= 60 ? 'Downstream Interceptor Chokepoint' : 'Discharge Channels Clear';
    }
    if (dTime) {
        const rem = s.capacity - s.depth;
        dTime.textContent = rem <= 0 ? 'OVERFLOW ACTIVE' : s.risingRate > 0.05 ? `${Math.round((rem / s.risingRate) * 60)} min` : 'NO THREAT';
        dTime.style.color = rem <= 0 || s.risingRate > 0.25 ? 'var(--state-danger)' : 'var(--state-normal)';
    }

    // Update Breakdown Table (Point 5)
    document.getElementById('rb-in-level').textContent = `${s.depth.toFixed(2)} m (${Math.round((s.depth / s.capacity) * 100)}% Cap)`;
    document.getElementById('rb-comp-level').textContent = `(${s.depth.toFixed(2)} / ${s.capacity.toFixed(2)}) × 50`;
    document.getElementById('rb-score-level').textContent = `${risk.cW.toFixed(1)}%`;

    document.getElementById('rb-in-rain').textContent = `${w.intensity} mm/h`;
    document.getElementById('rb-comp-rain').textContent = `(${w.intensity} / 150) × 15`;
    document.getElementById('rb-score-rain').textContent = `${risk.cR.toFixed(1)}%`;

    document.getElementById('rb-in-rise').textContent = `${s.risingRate >= 0 ? '+' : ''}${s.risingRate.toFixed(2)} m/h`;
    document.getElementById('rb-comp-rise').textContent = `(${Math.max(0, s.risingRate).toFixed(2)} / 1.0) × 15`;
    document.getElementById('rb-score-rise').textContent = `${risk.cV.toFixed(1)}%`;

    document.getElementById('rb-in-block').textContent = `${SYSTEM.blockagePercent}%`;
    document.getElementById('rb-comp-block').textContent = `(${SYSTEM.blockagePercent} / 100) × 20`;
    document.getElementById('rb-score-block').textContent = `${risk.cB.toFixed(1)}%`;

    const totalEl = document.getElementById('rb-score-total');
    if (totalEl) {
        totalEl.textContent = `${risk.score}% [${risk.rating}]`;
        totalEl.style.color = risk.score >= 80 ? 'var(--state-danger)' : risk.score >= 60 ? 'var(--state-warning)' : 'var(--primary-light)';
    }

    // If critical, auto-log incident (Point 13)
    if (risk.score >= 85 && !SYSTEM.narrative.active) {
        logIncidentEvent(s, w, risk);
    }
}

// Action Center (Point 10)
function updateActionCenter(s, pumpsActive, gateOpen) {
    const card = document.getElementById('action-center-card');
    const tag = document.getElementById('ac-status-tag');
    const act = document.getElementById('ac-rec-action');
    const reason = document.getElementById('ac-rec-reason');
    const effect = document.getElementById('ac-rec-effect');

    if (!card || !tag) return;

    // Requirement 11: PREVENTIVE STANDBY (teal), RECOMMENDATION (amber), ACTIVE MITIGATION (teal+amber), EMERGENCY (red)
    if (pumpsActive || gateOpen) {
        card.className = 'action-center-card status-normal';
        tag.textContent = 'ACTIVE MITIGATION';
        tag.style.background = 'rgba(15, 118, 110, 0.25)';
        tag.style.color = 'var(--primary-light)';
        tag.style.border = '1px solid var(--prediction)';
        if (act) {
            act.textContent = 'PUMP 1 & 2 ACTIVE · SLUICE GATE OPEN';
            act.style.color = 'var(--primary-light)';
        }
        if (reason) reason.textContent = 'SCADA automated hydraulic depression active.';
        if (effect) effect.textContent = 'Active drawdown: −0.35 m/h across Ward 12 outfall.';
    } else if (s.depth >= SYSTEM.criticalThreshold || s.risingRate >= 0.35) {
        card.className = 'action-center-card status-critical';
        tag.textContent = 'EMERGENCY';
        tag.style.background = 'rgba(201, 76, 76, 0.25)';
        tag.style.color = 'var(--danger)';
        tag.style.border = '1px solid var(--danger)';
        if (act) {
            act.textContent = 'CRITICAL OVERFLOW: ACTIVATE PUMPS IMMEDIATELY';
            act.style.color = 'var(--danger)';
        }
        if (reason) reason.textContent = 'Downstream capacity limit imminent at Ward 12 outfall.';
        if (effect) effect.textContent = 'Drawdown −0.35 m/h · Rapid crest suppression';
    } else if (s.depth >= SYSTEM.warningThreshold || SYSTEM.blockagePercent >= 50) {
        card.className = 'action-center-card status-warning';
        tag.textContent = 'RECOMMENDATION';
        tag.style.background = 'rgba(214, 168, 79, 0.15)';
        tag.style.color = 'var(--prediction)';
        tag.style.border = '1px solid var(--prediction)';
        if (act) {
            act.textContent = 'ACTIVATE PUMP 1 · PREPARE GATE A DIVERSION';
            act.style.color = 'var(--prediction)';
        }
        if (reason) reason.textContent = 'Upstream hydraulic pressure exceeding nominal gradient.';
        if (effect) effect.textContent = 'Stabilize inflow rise to under +0.05 m/h';
    } else {
        card.className = 'action-center-card status-normal';
        tag.textContent = 'PREVENTIVE STANDBY';
        tag.style.background = 'rgba(15, 118, 110, 0.15)';
        tag.style.color = 'var(--primary-light)';
        tag.style.border = '1px solid var(--border)';
        if (act) {
            act.textContent = 'Maintain gravity drainage. Standby sumps.';
            act.style.color = 'var(--text-secondary)';
        }
        if (reason) reason.textContent = 'All stations within safe hydraulic bounds.';
        if (effect) effect.textContent = 'Stable discharge flow rate (1.4 m³/s).';
    }

    // Update LED indicators in digital twin
    const ledP1 = document.getElementById('led-pump1');
    const ledP2 = document.getElementById('led-pump2');
    const ledGate = document.getElementById('led-gate');
    const pumpLabel = document.getElementById('pump-status-label');
    const gateLabel = document.getElementById('gate-status-label');

    if (ledP1) {
        ledP1.textContent = pumpsActive ? 'Pump 1: ACTIVE (150 L/s)' : 'Pump 1: OFF';
        ledP1.className = `pump-led ${pumpsActive ? 'pump-active' : ''}`;
    }
    if (ledP2) {
        ledP2.textContent = pumpsActive ? 'Pump 2: ACTIVE (150 L/s)' : 'Pump 2: OFF';
        ledP2.className = `pump-led ${pumpsActive ? 'pump-active' : ''}`;
    }
    if (ledGate) {
        ledGate.textContent = gateOpen ? 'Gate A: OPEN (100%)' : 'Gate A: CLOSED';
        ledGate.className = `pump-led ${gateOpen ? 'pump-active' : ''}`;
    }
    if (pumpLabel) pumpLabel.textContent = `${SYSTEM.pumps.mode.toUpperCase()} (${pumpsActive ? 'Running' : 'Standby'})`;
    if (gateLabel) gateLabel.textContent = `${SYSTEM.gates.mode.toUpperCase()} (${gateOpen ? 'Open' : 'Closed'})`;
}

// Sensor Telemetry Table UI (Point 11)
function updateSensorTableUI() {
    ['S1', 'S2', 'S3', 'S4'].forEach(id => {
        const node = SYSTEM.sensors[id];
        const lvlEl = document.getElementById(`tbl-level-${id.toLowerCase()}`);
        const riseEl = document.getElementById(`tbl-rise-${id.toLowerCase()}`);
        const mapDepthEl = document.getElementById(`map-depth-${id.toLowerCase()}`);

        if (lvlEl) lvlEl.textContent = `${node.depth.toFixed(2)} m`;
        if (mapDepthEl) mapDepthEl.textContent = `${node.depth.toFixed(2)} m`;
        if (riseEl) {
            riseEl.textContent = `${node.risingRate >= 0 ? '+' : ''}${node.risingRate.toFixed(2)} m/h`;
            riseEl.className = node.risingRate > 0.20 ? 'text-red' : node.risingRate > 0 ? 'text-yellow' : 'text-green';
        }
    });
}

// ==========================================================================
// 5.B LEAFLET DARK URBAN CATCHMENT MAP CONTROLLER (Requirements 6 & 7)
// ==========================================================================
let fluxoraMap = null;
let mapLayers = {};
let mapMarkers = { sensors: {}, pumps: {}, gate: null };
let mapPolylines = { drainage: [], flow: [], river: null, riverFlow: null };
let mapPolygons = { predicted: null, critical: null, heatRings: [] };

function initFluxoraMap() {
    const mapEl = document.getElementById('fluxora-map');
    if (!mapEl || !window.L) return;

    try {
        fluxoraMap = L.map('fluxora-map', {
            zoomControl: false,
            attributionControl: false,
            minZoom: 12,
            maxZoom: 18
        }).setView([10.0135, 76.305], 14);

        window.fluxoraMap = fluxoraMap;

        // Base Map Layers (Zero Watermarks, 100% Free, Google Maps Integration)
        const baseLayers = {
            'google-dark': L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                subdomains: ['0', '1', '2', '3'],
                maxZoom: 20,
                className: 'google-dark-tiles'
            }),
            'google-sat': L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                subdomains: ['0', '1', '2', '3'],
                maxZoom: 20,
                className: 'google-sat-tiles'
            }),
            'esri-dark': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 16,
                className: 'esri-dark-tiles'
            })
        };

        let activeBaseLayer = baseLayers['google-dark'];
        activeBaseLayer.addTo(fluxoraMap);

        // Map Layer Groups
        mapLayers = {
            river: L.layerGroup().addTo(fluxoraMap),
            drainage: L.layerGroup().addTo(fluxoraMap),
            flow: L.layerGroup().addTo(fluxoraMap),
            heat: L.layerGroup().addTo(fluxoraMap),
            prediction: L.layerGroup().addTo(fluxoraMap),
            inundation: L.layerGroup().addTo(fluxoraMap),
            infra: L.layerGroup().addTo(fluxoraMap),
            sensors: L.layerGroup().addTo(fluxoraMap)
        };

        // 1. River / Discharge Canal (Wide #145E63 base with #2DD4BF animated inner flow)
        const riverCoords = [
            [10.0055, 76.2800],
            [10.0058, 76.2920],
            [10.0054, 76.3040],
            [10.0046, 76.3180],
            [10.0035, 76.3320]
        ];
        mapPolylines.river = L.polyline(riverCoords, {
            color: '#145E63',
            weight: 12,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(mapLayers.river);

        mapPolylines.riverFlow = L.polyline(riverCoords, {
            color: '#2DD4BF',
            weight: 3,
            opacity: 0.9,
            className: 'leaflet-flow-path',
            lineCap: 'round'
        }).addTo(mapLayers.flow);

        // 2. Drainage Network Channels
        const channels = [
            { id: 'D1', from: 'S1', to: 'S2', coords: [[10.020, 76.295], [10.016, 76.300], [10.014, 76.304]] },
            { id: 'D3', from: 'S3', to: 'S2', coords: [[10.019, 76.315], [10.016, 76.309], [10.014, 76.304]] },
            { id: 'D2', from: 'S2', to: 'S4', coords: [[10.014, 76.304], [10.010, 76.304], [10.007, 76.304]] },
            { id: 'D4', from: 'S4', to: 'River', coords: [[10.007, 76.304], [10.0054, 76.304]] }
        ];

        channels.forEach(ch => {
            const basePipe = L.polyline(ch.coords, {
                color: '#0F766E',
                weight: ch.id === 'D2' ? 5 : 4,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(mapLayers.drainage);
            mapPolylines.drainage.push(basePipe);

            const flowLine = L.polyline(ch.coords, {
                color: '#2DD4BF',
                weight: 2.5,
                opacity: 0.95,
                className: 'leaflet-flow-path'
            }).addTo(mapLayers.flow);
            mapPolylines.flow.push(flowLine);
        });

        // 3. Ward 12 Basin Flood Overlays
        // A. Multi-Ring Heat Bloom
        const heatRingOuter = L.circle([10.006, 76.306], {
            radius: 460,
            color: '#D6A84F',
            fillColor: '#D6A84F',
            fillOpacity: 0.07,
            stroke: false
        }).addTo(mapLayers.heat);

        const heatRingMid = L.circle([10.006, 76.306], {
            radius: 280,
            color: '#D6A84F',
            fillColor: '#D6A84F',
            fillOpacity: 0.12,
            stroke: false
        }).addTo(mapLayers.heat);
        mapPolygons.heatRings = [heatRingOuter, heatRingMid];

        // B. Predicted Flood Zone Polygon (Dashed Amber)
        const predictedCoords = [
            [10.0105, 76.2980],
            [10.0120, 76.3120],
            [10.0030, 76.3170],
            [9.9990, 76.3030]
        ];
        mapPolygons.predicted = L.polygon(predictedCoords, {
            color: '#D6A84F',
            weight: 2,
            dashArray: '8 6',
            fillColor: '#D6A84F',
            fillOpacity: 0.16
        }).addTo(mapLayers.prediction);

        // C. Critical Inundation Core Polygon (Red #C94C4C)
        const criticalCoords = [
            [10.0085, 76.3000],
            [10.0095, 76.3080],
            [10.0050, 76.3110],
            [10.0035, 76.3020]
        ];
        mapPolygons.critical = L.polygon(criticalCoords, {
            color: '#C94C4C',
            weight: 2.5,
            fillColor: '#C94C4C',
            fillOpacity: 0.38
        });

        // 4. Infrastructure Units (P1, P2, Sluice Gate A)
        // Pump 1
        const pump1Icon = L.divIcon({
            className: 'infra-leaflet-div',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            html: `<div class="leaflet-infra-marker" id="map-infra-p1" title="Sump Pump 1 (Click to Toggle)">
                <div class="infra-pump-badge ${SYSTEM.pumps.pump1 ? 'active' : ''}">P1</div>
            </div>`
        });
        mapMarkers.pumps.P1 = L.marker([10.0055, 76.301], { icon: pump1Icon }).addTo(mapLayers.infra);
        mapMarkers.pumps.P1.on('click', () => {
            SYSTEM.pumps.mode = 'manual';
            SYSTEM.pumps.pump1 = !SYSTEM.pumps.pump1;
            const pumpLabel = document.getElementById('pump-status-label');
            if (pumpLabel) pumpLabel.textContent = SYSTEM.pumps.pump1 ? 'MANUAL (P1 ON)' : 'MANUAL (P1 OFF)';
            logSystemMessage(`SCADA: Sump Pump 1 toggled on map -> ${SYSTEM.pumps.pump1 ? 'FORCE ON' : 'STANDBY'}`);
            simTick();
        });

        // Pump 2
        const pump2Icon = L.divIcon({
            className: 'infra-leaflet-div',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            html: `<div class="leaflet-infra-marker" id="map-infra-p2" title="Sump Pump 2 (Click to Toggle)">
                <div class="infra-pump-badge ${SYSTEM.pumps.pump2 ? 'active' : ''}">P2</div>
            </div>`
        });
        mapMarkers.pumps.P2 = L.marker([10.0055, 76.307], { icon: pump2Icon }).addTo(mapLayers.infra);
        mapMarkers.pumps.P2.on('click', () => {
            SYSTEM.pumps.mode = 'manual';
            SYSTEM.pumps.pump2 = !SYSTEM.pumps.pump2;
            const pumpLabel = document.getElementById('pump-status-label');
            if (pumpLabel) pumpLabel.textContent = SYSTEM.pumps.pump2 ? 'MANUAL (P2 ON)' : 'MANUAL (P2 OFF)';
            logSystemMessage(`SCADA: Sump Pump 2 toggled on map -> ${SYSTEM.pumps.pump2 ? 'FORCE ON' : 'STANDBY'}`);
            simTick();
        });

        // Sluice Gate A
        const gateIcon = L.divIcon({
            className: 'infra-leaflet-div',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            html: `<div class="leaflet-infra-marker" id="map-infra-gate" title="Sluice Gate A (Click to Toggle)">
                <div class="infra-gate-badge ${SYSTEM.gates.gateA ? 'open' : ''}"><span>G</span></div>
            </div>`
        });
        mapMarkers.gate = L.marker([10.0095, 76.304], { icon: gateIcon }).addTo(mapLayers.infra);
        mapMarkers.gate.on('click', () => {
            SYSTEM.gates.mode = 'manual';
            SYSTEM.gates.gateA = !SYSTEM.gates.gateA;
            const gateLabel = document.getElementById('gate-status-label');
            if (gateLabel) gateLabel.textContent = SYSTEM.gates.gateA ? 'MANUAL (OPEN)' : 'MANUAL (CLOSED)';
            logSystemMessage(`SCADA: Sluice Gate A toggled on map -> ${SYSTEM.gates.gateA ? 'OPEN' : 'CLOSED'}`);
            simTick();
        });

        // 5. Sensors S1–S4
        ['S1', 'S2', 'S3', 'S4'].forEach(id => {
            const s = SYSTEM.sensors[id];
            const icon = getSensorDivIcon(s, id === SYSTEM.activeSensorId);
            const marker = L.marker([s.lat, s.lng], { icon: icon }).addTo(mapLayers.sensors);
            marker.on('click', () => {
                selectSensor(id);
            });
            mapMarkers.sensors[id] = marker;
        });

        // 6. Wire Map Controls
        const btnZoomIn = document.getElementById('btn-map-zoom-in');
        if (btnZoomIn) btnZoomIn.addEventListener('click', () => fluxoraMap.zoomIn());

        const btnZoomOut = document.getElementById('btn-map-zoom-out');
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => fluxoraMap.zoomOut());

        const btnRecenter = document.getElementById('btn-map-recenter');
        if (btnRecenter) btnRecenter.addEventListener('click', () => {
            fluxoraMap.flyTo([10.0135, 76.305], 14, { duration: 0.8 });
        });

        // Layer Dropdown
        const btnLayers = document.getElementById('btn-toggle-layers');
        const layersDropdown = document.getElementById('map-layers-dropdown');
        if (btnLayers && layersDropdown) {
            btnLayers.addEventListener('click', (e) => {
                e.stopPropagation();
                layersDropdown.style.display = layersDropdown.style.display === 'none' ? 'flex' : 'none';
            });
            document.addEventListener('click', (e) => {
                if (!layersDropdown.contains(e.target) && e.target !== btnLayers) {
                    layersDropdown.style.display = 'none';
                }
            });
        }

        wireMapLayerToggle('layer-chk-sensors', mapLayers.sensors);
        wireMapLayerToggle('layer-chk-drainage', mapLayers.drainage);
        wireMapLayerToggle('layer-chk-flow', mapLayers.flow);
        wireMapLayerToggle('layer-chk-prediction', mapLayers.prediction);
        wireMapLayerToggle('layer-chk-inundation', mapLayers.inundation);
        wireMapLayerToggle('layer-chk-infra', mapLayers.infra);

        // Wire Base Layer Radio Buttons (Google Dark, Google Sat, Esri Dark)
        document.querySelectorAll('input[name="map-base-layer"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const sel = radio.value;
                if (baseLayers[sel]) {
                    fluxoraMap.removeLayer(activeBaseLayer);
                    activeBaseLayer = baseLayers[sel];
                    activeBaseLayer.addTo(fluxoraMap);
                    activeBaseLayer.bringToBack();
                    logSystemMessage(`Base map interface switched to: ${radio.parentElement.textContent.trim()}`);
                }
            });
        });

    } catch (err) {
        console.error('Error initializing Leaflet map:', err);
    }
}

function wireMapLayerToggle(chkId, layerGroup) {
    const chk = document.getElementById(chkId);
    if (chk && fluxoraMap && layerGroup) {
        chk.addEventListener('change', () => {
            if (chk.checked) fluxoraMap.addLayer(layerGroup);
            else fluxoraMap.removeLayer(layerGroup);
        });
    }
}

function getSensorDivIcon(s, isSelected) {
    const statusClass = s.status === 'danger' ? 'state-danger' : s.status === 'warning' ? 'state-warning' : 'state-normal';
    const selClass = isSelected ? 'selected' : '';
    return L.divIcon({
        className: 'sensor-leaflet-div',
        iconSize: [36, 48],
        iconAnchor: [18, 18],
        html: `
            <div class="leaflet-sensor-marker ${statusClass} ${selClass}" id="marker-${s.id.toLowerCase()}">
                <div class="sensor-marker-pin">
                    <div class="sensor-marker-pulse"></div>
                    <div class="sensor-marker-core"></div>
                    <span class="sensor-marker-id">${s.id}</span>
                </div>
                <div class="sensor-marker-label">
                    <span>${s.id}</span>
                    <span class="sensor-marker-depth">${s.depth.toFixed(2)}m</span>
                </div>
            </div>
        `
    });
}

function updateMapVisuals() {
    if (!fluxoraMap) return;

    const s4 = SYSTEM.sensors.S4;
    const activeSensor = SYSTEM.sensors[SYSTEM.activeSensorId];
    const risk = computeHybridRisk(activeSensor, SYSTEM.weatherModes[SYSTEM.weatherLevel]);

    // 1. Update Sensor Markers
    ['S1', 'S2', 'S3', 'S4'].forEach(id => {
        const s = SYSTEM.sensors[id];
        const marker = mapMarkers.sensors[id];
        if (marker) {
            marker.setIcon(getSensorDivIcon(s, id === SYSTEM.activeSensorId));
        }
    });

    // 2. Update Flow Polylines based on Debris Blockage & Rain
    const flowClass = SYSTEM.blockagePercent >= 70 ? 'leaflet-flow-path-red' : 
                      SYSTEM.blockagePercent >= 40 ? 'leaflet-flow-path-amber' : 'leaflet-flow-path';
    const flowColor = SYSTEM.blockagePercent >= 70 ? '#C94C4C' : 
                      SYSTEM.blockagePercent >= 40 ? '#D6A84F' : '#2DD4BF';

    mapPolylines.flow.forEach(line => {
        line.setStyle({ color: flowColor, className: flowClass });
    });

    // 3. Update Flood Horizon Prediction Polygon & Heat Bloom
    if (mapPolygons.predicted) {
        const opac = Math.min(0.35, 0.12 + (risk.score / 100) * 0.22);
        mapPolygons.predicted.setStyle({
            fillOpacity: opac,
            color: risk.score >= 75 ? '#C94C4C' : '#D6A84F',
            fillColor: risk.score >= 75 ? '#C94C4C' : '#D6A84F'
        });
    }

    // Dynamic Heat Bloom Rings
    if (mapPolygons.heatRings && mapPolygons.heatRings.length === 2) {
        const outerR = 360 + (risk.score * 2.2);
        const innerR = 200 + (risk.score * 1.4);
        mapPolygons.heatRings[0].setRadius(outerR);
        mapPolygons.heatRings[1].setRadius(innerR);
        const ringColor = risk.score >= 75 ? '#C94C4C' : '#D6A84F';
        mapPolygons.heatRings[0].setStyle({ fillColor: ringColor, color: ringColor });
        mapPolygons.heatRings[1].setStyle({ fillColor: ringColor, color: ringColor });
    }

    // 4. Critical Inundation Layer (Shown on threshold breach or crisis narrative)
    const isCritical = s4.depth >= SYSTEM.criticalThreshold || SYSTEM.narrative.stage >= 4;
    const isWarning = s4.depth >= SYSTEM.warningThreshold || SYSTEM.narrative.stage === 3;

    if (isCritical) {
        if (!mapLayers.inundation.hasLayer(mapPolygons.critical)) {
            mapLayers.inundation.addLayer(mapPolygons.critical);
        }
    } else {
        if (mapLayers.inundation.hasLayer(mapPolygons.critical)) {
            mapLayers.inundation.removeLayer(mapPolygons.critical);
        }
    }

    // 5. Threat Status Pill
    const threatPill = document.getElementById('map-threat-status-pill');
    const threatDot = document.getElementById('map-threat-dot');
    const threatText = document.getElementById('map-threat-text');
    if (threatPill && threatDot && threatText) {
        if (isCritical) {
            threatDot.className = 'threat-dot dot-danger';
            threatText.textContent = 'BASIN THREAT: CRITICAL INUNDATION (WARD 12 BREACH)';
            threatPill.style.borderColor = 'rgba(201, 76, 76, 0.4)';
        } else if (isWarning) {
            threatDot.className = 'threat-dot dot-warning';
            threatText.textContent = 'BASIN THREAT: WARNING (HYDRAULIC SURGE DETECTED)';
            threatPill.style.borderColor = 'rgba(217, 154, 43, 0.4)';
        } else {
            threatDot.className = 'threat-dot dot-normal';
            threatText.textContent = 'BASIN THREAT: NORMAL (CHANNELS NOMINAL)';
            threatPill.style.borderColor = 'var(--border)';
        }
    }

    // 6. Infrastructure Badges (P1, P2, Sluice Gate)
    const p1El = document.querySelector('#map-infra-p1 .infra-pump-badge');
    if (p1El) p1El.classList.toggle('active', !!SYSTEM.pumps.pump1);

    const p2El = document.querySelector('#map-infra-p2 .infra-pump-badge');
    if (p2El) p2El.classList.toggle('active', !!SYSTEM.pumps.pump2);

    const gateEl = document.querySelector('#map-infra-gate .infra-gate-badge');
    if (gateEl) gateEl.classList.toggle('open', !!SYSTEM.gates.gateA);

    // Backward compatibility with legacy IDs
    const floodPoly = document.getElementById('ward12-flood-polygon');
    const floodLabel = document.getElementById('ward12-flood-label');
    if (floodPoly) floodPoly.className = isCritical ? 'critical-hazard' : '';
    if (floodLabel) floodLabel.textContent = isCritical ? 'CRITICAL FLOOD HAZARD' : 'PREDICTED FLOOD ZONE';
}

// Prediction Confidence Computation (Point 6)
function updateConfidenceScore() {
    const healthyCount = SYSTEM.s3FaultActive ? 3 : 4;
    const healthRatio = healthyCount / 4;
    const freshnessScore = Math.max(0.65, 1.0 - (SYSTEM.freshnessVal / 10));
    const completenessScore = SYSTEM.s3FaultActive ? 0.72 : 1.0;
    const weatherScore = 0.95;

    const confidence = Math.round(((0.4 * healthRatio) + (0.3 * freshnessScore) + (0.2 * completenessScore) + (0.1 * weatherScore)) * 100);

    const valEl = document.getElementById('pe-confidence-val');
    const reasonEl = document.getElementById('pe-confidence-reason');

    if (valEl) valEl.textContent = `${confidence}%`;
    if (reasonEl) {
        reasonEl.textContent = `${healthyCount}/4 sensors healthy · Telemetry ${SYSTEM.freshnessVal.toFixed(1)}s fresh · ${SYSTEM.s3FaultActive ? 'Spatial covariance active' : 'Zero packet drop'}`;
    }
}

// ==========================================================================
// 6. 6-STAGE NARRATIVE FLOOD STRESS TEST (Point 8)
// ==========================================================================
let narrativeTimer = null;

function triggerNarrativeStressTest() {
    SYSTEM.narrative.active = true;
    SYSTEM.narrative.stage = 1;
    SYSTEM.narrative.stageSeconds = 0;
    SYSTEM.narrative.totalSeconds = 0;

    const bar = document.getElementById('narrative-step-bar');
    if (bar) bar.classList.add('active');

    const btn = document.getElementById('btn-trigger-demo');
    if (btn) {
        btn.textContent = '⏸ Test In Progress...';
        btn.disabled = true;
    }

    logSystemMessage("Initiating 6-Stage Narrative Flood Stress Test: Baseline normal inflow calibrated.");
    advanceNarrativeStage();

    if (narrativeTimer) clearInterval(narrativeTimer);
    narrativeTimer = setInterval(() => {
        if (!SYSTEM.narrative.active) return;
        SYSTEM.narrative.stageSeconds++;
        SYSTEM.narrative.totalSeconds++;

        const fill = document.getElementById('nsb-progress-fill');
        const rem = document.getElementById('nsb-time-remaining');
        if (fill) fill.style.width = `${(SYSTEM.narrative.totalSeconds / 90) * 100}%`;
        if (rem) rem.textContent = `Elapsed: ${SYSTEM.narrative.totalSeconds}s / 90s`;

        // Check stage progression
        if (SYSTEM.narrative.totalSeconds === 15) {
            SYSTEM.narrative.stage = 2;
            advanceNarrativeStage();
        } else if (SYSTEM.narrative.totalSeconds === 30) {
            SYSTEM.narrative.stage = 3;
            advanceNarrativeStage();
        } else if (SYSTEM.narrative.totalSeconds === 45) {
            SYSTEM.narrative.stage = 4;
            advanceNarrativeStage();
        } else if (SYSTEM.narrative.totalSeconds === 60) {
            SYSTEM.narrative.stage = 5;
            advanceNarrativeStage();
        } else if (SYSTEM.narrative.totalSeconds === 75) {
            SYSTEM.narrative.stage = 6;
            advanceNarrativeStage();
        } else if (SYSTEM.narrative.totalSeconds >= 90) {
            stopNarrativeStressTest();
        }

        simTick();
    }, 1000);
}

function advanceNarrativeStage() {
    const label = document.getElementById('nsb-stage-label');
    const fill = document.getElementById('nsb-progress-fill');
    const stage = SYSTEM.narrative.stage;

    // Requirement 15: Stage 1-2 teal, Stage 3-4 amber, Stage 5 red, Stage 6 teal recovery
    if (fill) {
        if (stage <= 2) {
            fill.style.backgroundColor = 'var(--primary-light)';
        } else if (stage <= 4) {
            fill.style.backgroundColor = 'var(--prediction)';
        } else if (stage === 5) {
            fill.style.backgroundColor = 'var(--danger)';
        } else {
            fill.style.backgroundColor = 'var(--state-normal)';
        }
    }

    if (stage === 1) {
        if (label) label.innerHTML = '<i data-lucide="play-circle"></i> Stage 1 of 6: Baseline Normal Inflow (Drizzle 12 mm/h)';
        SYSTEM.weatherLevel = 0;
        SYSTEM.blockagePercent = 0;
        SYSTEM.pumps.mode = 'auto';
        SYSTEM.sensors.S4.depth = 1.25;
        logSystemMessage("Stage 1: Normal monsoon baseline. All stations within nominal bounds.");
    } else if (stage === 2) {
        if (label) label.innerHTML = '<i data-lucide="cloud-rain"></i> Stage 2 of 6: Heavy Monsoon Storm Inflow (Rain 75 mm/h)';
        SYSTEM.weatherLevel = 2;
        SYSTEM.blockagePercent = 15;
        SYSTEM.sensors.S1.depth = 1.65;
        SYSTEM.sensors.S3.depth = 1.45;
        logSystemMessage("Stage 2: Heavy storm inflow front advancing across Ward 5 & Ward 8.", "warning");
    } else if (stage === 3) {
        if (label) label.innerHTML = '<i data-lucide="ban"></i> Stage 3 of 6: Catch Basin Debris Blockage (70% Obstruction)';
        SYSTEM.weatherLevel = 2;
        SYSTEM.blockagePercent = 70;
        SYSTEM.sensors.S2.depth = 1.95;
        SYSTEM.sensors.S4.depth = 2.15;
        logSystemMessage("Stage 3: Catch basin debris blockage detected at S2 Interceptor. Flow restricted.", "warning");
    } else if (stage === 4) {
        if (label) label.innerHTML = '<i data-lucide="alert-triangle"></i> Stage 4 of 6: Critical Warning Threshold Breached at Ward 12';
        SYSTEM.weatherLevel = 3;
        SYSTEM.blockagePercent = 80;
        SYSTEM.sensors.S4.depth = 2.38; // Breaches 2.20m warning
        logSystemMessage("🚨 Stage 4: Critical threshold breach at Ward 12 outfall! Predicted overflow in 8 min.", "danger");
    } else if (stage === 5) {
        if (label) label.innerHTML = '<i data-lucide="zap"></i> Stage 5 of 6: Automated SCADA Mitigation (Dual Pumps & Sluice Gate A)';
        SYSTEM.pumps.mode = 'on';
        SYSTEM.gates.mode = 'open';
        SYSTEM.sensors.S4.risingRate = -0.38;
        logSystemMessage("Stage 5: SCADA Automated Mitigation engaged. Sump Pumps 1 & 2 active at 300 L/s. Sluice Gate A open.");
    } else if (stage === 6) {
        if (label) label.innerHTML = '<i data-lucide="shield-check"></i> Stage 6 of 6: Recession, Drawdown & System Recovery';
        SYSTEM.weatherLevel = 0;
        SYSTEM.blockagePercent = 5;
        SYSTEM.sensors.S4.depth = 1.35;
        SYSTEM.pumps.mode = 'auto';
        SYSTEM.gates.mode = 'auto';
        logSystemMessage("Stage 6: Safe basin drawdown complete. Flood hazard cleared. Returning to nominal standby.");
    }

    if (window.lucide) lucide.createIcons();
}

function stopNarrativeStressTest() {
    SYSTEM.narrative.active = false;
    if (narrativeTimer) clearInterval(narrativeTimer);

    const bar = document.getElementById('narrative-step-bar');
    if (bar) bar.classList.remove('active');

    const btn = document.getElementById('btn-trigger-demo');
    if (btn) {
        btn.textContent = '▶ Run 6-Stage Flood Stress Test';
        btn.disabled = false;
    }

    logSystemMessage("Narrative Flood Stress Test complete. Scenario reset to nominal monitoring.");
    resetSimulation();
}

// Reset Simulation to Nominal
function resetSimulation() {
    SYSTEM.weatherLevel = 0;
    SYSTEM.blockagePercent = 0;
    SYSTEM.pumps.mode = 'auto';
    SYSTEM.gates.mode = 'auto';
    SYSTEM.s3FaultActive = false;
    SYSTEM.simSpeed = 1.0;
    SYSTEM.broadcastLifecycle = 'READY';

    const wSlider = document.getElementById('sim-weather');
    if (wSlider) wSlider.value = 0;
    const bSlider = document.getElementById('sim-blockage');
    if (bSlider) bSlider.value = 0;
    const faultToggle = document.getElementById('toggle-s3-fault');
    if (faultToggle) faultToggle.checked = false;

    document.querySelectorAll('#pump-mode-group .toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#pump-mode-group [data-val="auto"]').classList.add('active');

    document.querySelectorAll('#gate-mode-group .toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#gate-mode-group [data-val="auto"]').classList.add('active');

    document.querySelectorAll('#sim-speed-group .toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#sim-speed-group [data-val="1"]').classList.add('active');

    // Reset base depths
    Object.keys(SYSTEM.sensors).forEach(id => {
        const node = SYSTEM.sensors[id];
        node.depth = node.baseDepth;
        node.risingRate = 0.05;
        node.status = 'nominal';
        node.history = Array.from({ length: 10 }, () => node.baseDepth);
    });

    const ebBadge = document.getElementById('eb-lifecycle-badge');
    const ebBtn = document.getElementById('btn-trigger-broadcast');
    if (ebBadge) {
        ebBadge.textContent = 'READY';
        ebBadge.style.color = 'var(--state-normal)';
    }
    if (ebBtn) {
        ebBtn.textContent = 'AUTHORIZE BROADCAST';
        ebBtn.disabled = false;
        ebBtn.style.background = 'var(--state-danger)';
    }

    logSystemMessage("Simulation environment reset to nominal baseline state.");
    simTick();
}

// Scenario Presets
function applyPreset(val) {
    if (val === 'custom') return;

    if (val === 'normal') {
        SYSTEM.weatherLevel = 0;
        SYSTEM.blockagePercent = 0;
        SYSTEM.s3FaultActive = false;
        logSystemMessage("Preset applied: Normal Monsoon Baseline (12 mm/h, Clear Channels)");
    } else if (val === 'heavy') {
        SYSTEM.weatherLevel = 2;
        SYSTEM.blockagePercent = 25;
        SYSTEM.s3FaultActive = false;
        logSystemMessage("Preset applied: Heavy Rainfall Storm Surge (75 mm/h, 25% Blockage)", "warning");
    } else if (val === 'extreme') {
        SYSTEM.weatherLevel = 3;
        SYSTEM.blockagePercent = 50;
        SYSTEM.s3FaultActive = false;
        logSystemMessage("Preset applied: Extreme Rainfall Crisis (140 mm/h, 50% Blockage)", "danger");
    } else if (val === 'blockage') {
        SYSTEM.weatherLevel = 1;
        SYSTEM.blockagePercent = 85;
        SYSTEM.s3FaultActive = false;
        logSystemMessage("Preset applied: Severe Catch Basin Debris Blockage (85% Chokepoint)", "warning");
    } else if (val === 'pump-fail') {
        SYSTEM.weatherLevel = 2;
        SYSTEM.blockagePercent = 30;
        SYSTEM.pumps.mode = 'off';
        SYSTEM.s3FaultActive = false;
        logSystemMessage("Preset applied: Sump Pump Mechanical Failure (Pumps Forced OFF)", "danger");
    } else if (val === 'sensor-fail') {
        SYSTEM.weatherLevel = 1;
        SYSTEM.blockagePercent = 10;
        SYSTEM.s3FaultActive = true;
        const toggle = document.getElementById('toggle-s3-fault');
        if (toggle) toggle.checked = true;
        logSystemMessage("Preset applied: S3 Telemetry Offline Failure (Redundancy Active)", "warning");
    } else if (val === 'flash') {
        SYSTEM.weatherLevel = 3;
        SYSTEM.blockagePercent = 90;
        SYSTEM.sensors.S4.depth = 2.42;
        logSystemMessage("Preset applied: Flash Flood Compound Event (Cloudburst + Severe Blockage)", "danger");
    }

    const wSlider = document.getElementById('sim-weather');
    if (wSlider) wSlider.value = SYSTEM.weatherLevel;
    const bSlider = document.getElementById('sim-blockage');
    if (bSlider) bSlider.value = SYSTEM.blockagePercent;

    document.getElementById('sim-blockage-value').textContent = `${SYSTEM.blockagePercent}%`;
    updateWeatherState();
    simTick();
}

function updateWeatherState() {
    const w = SYSTEM.weatherModes[SYSTEM.weatherLevel];
    document.getElementById('sim-weather-value').textContent = `${w.name} (${w.intensity} mm/h)`;
}

// ==========================================================================
// 7. CHART.JS ENGINES (Points 5 & 12)
// ==========================================================================

// Primary Forecast Timeline Chart (Requirement 8: Solid Teal Observed, Dashed Amber Predicted)
function initTelemetryChart() {
    const ctx = document.getElementById('telemetryChart');
    if (!ctx) return;

    telemetryChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['-25m', '-20m', '-15m', '-10m', '-5m', 'NOW', '+10m', '+20m', '+30m', '+45m'],
            datasets: [
                {
                    label: 'Observed Depth (m)',
                    data: [1.18, 1.19, 1.20, 1.21, 1.21, 1.22, null, null, null, null],
                    borderColor: '#2DD4BF',
                    backgroundColor: 'rgba(45, 212, 191, 0.08)',
                    borderWidth: 2,
                    fill: 'origin',
                    tension: 0.3,
                    pointRadius: [0, 0, 0, 0, 0, 3.5, 0, 0, 0, 0],
                    pointBackgroundColor: '#2DD4BF'
                },
                {
                    label: 'Predicted Horizon (m)',
                    data: [null, null, null, null, null, 1.22, 1.34, 1.46, 1.58, 1.76],
                    borderColor: '#D6A84F',
                    backgroundColor: 'rgba(214, 168, 79, 0.08)',
                    borderWidth: 2,
                    borderDash: [4, 4],
                    fill: 'origin',
                    tension: 0.3,
                    pointRadius: [0, 0, 0, 0, 0, 3.5, 2, 2, 2, 2.5],
                    pointBackgroundColor: '#D6A84F'
                },
                {
                    label: 'Critical (2.50m)',
                    data: [2.50, 2.50, 2.50, 2.50, 2.50, 2.50, 2.50, 2.50, 2.50, 2.50],
                    borderColor: '#C94C4C',
                    borderWidth: 1.2,
                    borderDash: [3, 3],
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Warning (2.20m)',
                    data: [2.20, 2.20, 2.20, 2.20, 2.20, 2.20, 2.20, 2.20, 2.20, 2.20],
                    borderColor: '#D99A2B',
                    borderWidth: 1.2,
                    borderDash: [2, 2],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#A8B9B2',
                        font: { size: 8, family: 'Manrope, Outfit, sans-serif' },
                        boxWidth: 8,
                        boxHeight: 2,
                        padding: 4
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#71857D', font: { size: 8.5 }, maxRotation: 0, padding: 1 }
                },
                y: {
                    min: 0.5,
                    max: 3.0,
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#71857D', font: { size: 8.5 }, stepSize: 1.0, padding: 2 }
                }
            }
        }
    });
}

function updateTelemetryChartData(s) {
    if (!telemetryChart) return;

    const hist = s.history;
    const now = s.depth;
    const rate = s.risingRate; // m/h

    // 45-min forecast lookaheads based on current hydrodynamic rise rate
    const d10 = Math.max(0.50, Math.min(3.20, now + (rate * (10 / 60))));
    const d20 = Math.max(0.50, Math.min(3.20, now + (rate * (20 / 60))));
    const d30 = Math.max(0.50, Math.min(3.20, now + (rate * (30 / 60))));
    const d45 = Math.max(0.50, Math.min(3.20, now + (rate * (45 / 60))));

    // Dataset 0: Observed Water Level (Past -> NOW, solid teal)
    telemetryChart.data.datasets[0].data = [
        hist[0] !== undefined ? hist[0] : (now - 0.05),
        hist[2] !== undefined ? hist[2] : (now - 0.04),
        hist[4] !== undefined ? hist[4] : (now - 0.03),
        hist[6] !== undefined ? hist[6] : (now - 0.02),
        hist[8] !== undefined ? hist[8] : (now - 0.01),
        now,
        null, null, null, null
    ];

    // Dataset 1: Predicted Horizon (NOW -> +45m, dashed amber)
    telemetryChart.data.datasets[1].data = [
        null, null, null, null, null,
        now,
        parseFloat(d10.toFixed(2)),
        parseFloat(d20.toFixed(2)),
        parseFloat(d30.toFixed(2)),
        parseFloat(d45.toFixed(2))
    ];

    telemetryChart.update('none');
}

// 4 Real Chart.js Charts for Analytics Hub (Point 12)
function initAnalyticsCharts() {
    // Chart 1: Rain vs Level (Dual Axis) (Requirement 17: Muted teal rainfall, light teal water)
    const ctx1 = document.getElementById('chart-rain-vs-level');
    if (ctx1 && !chartRainVsLevel) {
        chartRainVsLevel = new Chart(ctx1.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
                datasets: [
                    {
                        label: 'Rainfall (mm/h)',
                        data: [15, 28, 65, 82, 45, 20],
                        borderColor: '#0F766E',
                        backgroundColor: 'rgba(15, 118, 110, 0.45)',
                        fill: true,
                        yAxisID: 'yRain',
                        tension: 0.4
                    },
                    {
                        label: 'Water Level (m)',
                        data: [0.95, 1.10, 1.55, 2.18, 1.75, 1.40],
                        borderColor: '#2DD4BF',
                        backgroundColor: 'rgba(45, 212, 191, 0.08)',
                        borderWidth: 2.5,
                        fill: false,
                        yAxisID: 'yLevel',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    yRain: { type: 'linear', position: 'left', min: 0, max: 150, ticks: { color: '#0F766E' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    yLevel: { type: 'linear', position: 'right', min: 0, max: 3.0, ticks: { color: '#2DD4BF' }, grid: { display: false } },
                    x: { ticks: { color: '#71857D' }, grid: { color: 'rgba(255,255,255,0.04)' } }
                }
            }
        });
    }

    // Chart 2: Risk Over Time (Requirement 17: Amber curve, warning amber, danger red)
    const ctx2 = document.getElementById('chart-risk-time');
    if (ctx2 && !chartRiskTime) {
        chartRiskTime = new Chart(ctx2.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['-50m', '-40m', '-30m', '-20m', '-10m', 'NOW'],
                datasets: [
                    {
                        label: 'Ward 12 Risk Score (%)',
                        data: [22, 28, 45, 62, 78, 27],
                        borderColor: '#D6A84F',
                        backgroundColor: 'rgba(214, 168, 79, 0.12)',
                        fill: true,
                        tension: 0.35
                    },
                    {
                        label: 'High Risk Alarm Threshold (60%)',
                        data: [60, 60, 60, 60, 60, 60],
                        borderColor: '#D99A2B',
                        borderDash: [4, 4],
                        pointRadius: 0
                    },
                    {
                        label: 'Critical Threshold (80%)',
                        data: [80, 80, 80, 80, 80, 80],
                        borderColor: '#C94C4C',
                        borderDash: [5, 5],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0, max: 100, ticks: { color: '#71857D' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    x: { ticks: { color: '#71857D' }, grid: { color: 'rgba(255,255,255,0.04)' } }
                }
            }
        });
    }

    // Chart 3: 4-Sensor Comparison (Requirement 17: 4 Subdued variations of teal)
    const ctx3 = document.getElementById('chart-sensor-comp');
    if (ctx3 && !chartSensorComp) {
        chartSensorComp = new Chart(ctx3.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['-25m', '-20m', '-15m', '-10m', '-5m', 'NOW'],
                datasets: [
                    { label: 'S1 Residential', data: [1.16, 1.18, 1.19, 1.20, 1.21, 1.22], borderColor: '#2DD4BF', borderWidth: 2 },
                    { label: 'S2 Interceptor', data: [0.98, 1.00, 1.02, 1.03, 1.04, 1.05], borderColor: '#14B8A6', borderWidth: 2 },
                    { label: 'S3 Comm Runoff', data: [0.86, 0.88, 0.89, 0.90, 0.91, 0.91], borderColor: '#0D9488', borderWidth: 2 },
                    { label: 'S4 Outlet Basin', data: [1.38, 1.41, 1.43, 1.45, 1.47, 1.48], borderColor: '#0F766E', borderWidth: 2.5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0.5, max: 2.5, ticks: { color: '#71857D' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    x: { ticks: { color: '#71857D' }, grid: { color: 'rgba(255,255,255,0.04)' } }
                }
            }
        });
    }

    // Chart 4: Pump & Gate Activity (Requirement 17: Muted teal pumps, amber gate)
    const ctx4 = document.getElementById('chart-pump-activity');
    if (ctx4 && !chartPumpActivity) {
        chartPumpActivity = new Chart(ctx4.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30'],
                datasets: [
                    {
                        label: 'Pump Discharge (m³/s)',
                        data: [0, 0.8, 1.4, 1.4, 0.6, 0],
                        backgroundColor: 'rgba(15, 118, 110, 0.85)',
                        borderColor: '#0F766E',
                        borderWidth: 1
                    },
                    {
                        label: 'Gate A Opening (%)',
                        data: [0, 40, 100, 100, 50, 0],
                        backgroundColor: 'rgba(214, 168, 79, 0.85)',
                        borderColor: '#D6A84F',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0, ticks: { color: '#71857D' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    x: { ticks: { color: '#71857D' }, grid: { color: 'rgba(255,255,255,0.04)' } }
                }
            }
        });
    }
}

function updateAnalyticsCharts(range) {
    logSystemMessage(`Resampling analytics datasets across window: ${range.toUpperCase()}`);
    // Regenerate smooth sample variations based on time range
    if (chartRainVsLevel) {
        if (range === '1h') chartRainVsLevel.data.labels = ['14:00', '14:12', '14:24', '14:36', '14:48', '15:00'];
        else if (range === '24h') chartRainVsLevel.data.labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
        chartRainVsLevel.update();
    }
}

// ==========================================================================
// 8. DYNAMIC INCIDENT ARCHIVE & EMERGENCY BROADCAST (Points 13 & 18)
// ==========================================================================
function renderIncidentTable() {
    const tbody = document.getElementById('dynamic-incident-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    incidentRecords.forEach(inc => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255, 255, 255, 0.04)';
        tr.style.cursor = 'pointer';
        tr.onclick = () => {
            logSystemMessage(`Loaded Incident Audit: ${inc.id} (${inc.ward}) - Peak: ${inc.peakDepth}, Response: ${inc.response}`);
        };

        tr.innerHTML = `
            <td style="padding: 12px 14px; font-family: var(--font-mono); color: var(--primary-light); font-weight: 700;">${inc.id}</td>
            <td style="padding: 12px 14px; color: #cbd5e1;">${inc.timestamp}</td>
            <td style="padding: 12px 14px; font-weight: 600; color: #ffffff;">${inc.ward}</td>
            <td style="padding: 12px 14px; font-family: var(--font-mono);">${inc.peakDepth}</td>
            <td style="padding: 12px 14px;"><span class="status-badge ${inc.maxRisk.includes('CRITICAL') ? 'state-danger' : 'state-warning'}" style="font-size: 9px; padding: 2px 6px;">${inc.maxRisk}</span></td>
            <td style="padding: 12px 14px; color: var(--primary-light);">${inc.rainfall}</td>
            <td style="padding: 12px 14px; color: #f59e0b;">${inc.blockage}</td>
            <td style="padding: 12px 14px; color: var(--state-normal);">${inc.response}</td>
            <td style="padding: 12px 14px; color: var(--text-muted);">${inc.status}</td>
        `;
        tbody.appendChild(tr);
    });
}

function logIncidentEvent(s, w, risk) {
    // Avoid spamming duplicates within 20s
    if (SYSTEM.lastLoggedIncident && Date.now() - SYSTEM.lastLoggedIncident < 20000) return;
    SYSTEM.lastLoggedIncident = Date.now();

    const newId = `INC-${Math.floor(8100 + Math.random() * 900)}`;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    incidentRecords.unshift({
        id: newId,
        timestamp: `Today ${nowStr}`,
        ward: `${s.ward} (${s.name.split(':')[1].trim()})`,
        peakDepth: `${s.depth.toFixed(2)} m`,
        maxRisk: `${risk.score}% ${risk.rating}`,
        rainfall: `${w.intensity} mm/h`,
        blockage: `${SYSTEM.blockagePercent}%`,
        response: SYSTEM.pumps.pump1 ? 'Dual Pumps SCADA Active' : 'Automated Alarm Triggered',
        status: 'Investigating'
    });

    renderIncidentTable();
    logSystemMessage(`📁 Auto-Archived Flood Incident: ${newId} logged to Incident History database.`, 'danger');
}

// Emergency Broadcast Lifecycle (Point 18)
function progressBroadcastLifecycle() {
    const badge = document.getElementById('eb-lifecycle-badge');
    const btn = document.getElementById('btn-trigger-broadcast');
    const dir = document.getElementById('eb-directive-text');

    if (SYSTEM.broadcastLifecycle === 'READY') {
        SYSTEM.broadcastLifecycle = 'PENDING';
        if (badge) {
            badge.textContent = 'PENDING OPERATOR APPROVAL';
            badge.style.color = 'var(--state-warning)';
            badge.style.background = 'rgba(245, 158, 11, 0.15)';
        }
        if (btn) btn.textContent = 'CONFIRM AUTHORIZATION';
        logSystemMessage("BROADCAST STAGE 1: Warning dispatch authorization requested by Civil Defense.", "warning");
    } else if (SYSTEM.broadcastLifecycle === 'PENDING') {
        SYSTEM.broadcastLifecycle = 'BROADCASTING';
        if (badge) {
            badge.textContent = 'TRANSMITTING CELL BROADCAST...';
            badge.style.color = 'var(--primary-light)';
            badge.style.background = 'rgba(6, 182, 212, 0.15)';
        }
        if (btn) {
            btn.textContent = 'TRANSMITTING...';
            btn.disabled = true;
        }
        logSystemMessage("BROADCAST STAGE 2: Transmitting Common Alerting Protocol (CAP) frames to local cellular base stations.", "danger");

        setTimeout(() => {
            SYSTEM.broadcastLifecycle = 'DELIVERED';
            if (badge) {
                badge.textContent = 'DELIVERED & ACKNOWLEDGED ✓';
                badge.style.color = 'var(--state-normal)';
                badge.style.background = 'rgba(16, 185, 129, 0.15)';
            }
            if (btn) {
                btn.textContent = 'DELIVERED (14,200 REACHED)';
                btn.style.background = 'var(--state-normal)';
            }
            if (dir) dir.textContent = 'Evacuation directive confirmed delivered to Ward 12 residents.';
            logSystemMessage("BROADCAST STAGE 3: Successfully reached 14,200 mobile subscribers in Ward 12.");
        }, 1800);
    }
}

// Action Center Button Callbacks
function triggerManualAction() {
    SYSTEM.pumps.mode = 'on';
    SYSTEM.gates.mode = 'open';
    document.querySelectorAll('#pump-mode-group .toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#pump-mode-group [data-val="on"]').classList.add('active');
    document.querySelectorAll('#gate-mode-group .toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#gate-mode-group [data-val="open"]').classList.add('active');
    logSystemMessage("ACTION CENTER: Manual SCADA Override executed. Sump pumps forced ON, Sluice Gate A opened.");
    simTick();
}

function acknowledgeAlert() {
    logSystemMessage("ACTION CENTER: Operational warning acknowledged by Command Console supervisor.");
}

function toggleScadaOverride() {
    logSystemMessage("ACTION CENTER: SCADA Supervisory control toggled between AUTO and OPERATOR MANUAL.");
}

// ==========================================================================
// 9. HELPERS, TIMERS & PACKET EMULATOR (Point 15)
// ==========================================================================
function restartSimInterval() {
    if (simInterval) clearInterval(simInterval);
    const period = 3000 / SYSTEM.simSpeed;
    simInterval = setInterval(() => {
        SYSTEM.freshnessVal = 0.8 + (Math.random() * 0.6);
        simTick();
    }, period);
}

function startLivePacketCounter() {
    if (packetInterval) clearInterval(packetInterval);
    packetInterval = setInterval(() => {
        if (SYSTEM.mode === 'live') {
            SYSTEM.livePackets.count += Math.floor(1 + Math.random() * 3);
            SYSTEM.livePackets.latency = Math.floor(34 + Math.random() * 8);

            const countEl = document.getElementById('live-packet-count');
            const latEl = document.getElementById('live-latency-val');
            if (countEl) countEl.textContent = SYSTEM.livePackets.count.toLocaleString();
            if (latEl) latEl.textContent = `${SYSTEM.livePackets.latency}ms`;
        }
    }, 1500);
}

function logSystemMessage(msg, type = 'system') {
    const feed = document.getElementById('alert-feed-log');
    if (!feed) return;

    const timeStr = new Date().toLocaleTimeString();
    const item = document.createElement('div');
    item.className = 'alert-system-msg';
    item.innerHTML = `<span class="msg-time">[${timeStr}]</span> ${msg}`;

    if (type === 'danger') {
        item.style.borderLeft = '3px solid var(--state-danger)';
        item.style.color = '#fca5a5';
    } else if (type === 'warning') {
        item.style.borderLeft = '3px solid var(--state-warning)';
        item.style.color = '#fde68a';
    }

    feed.prepend(item);
    if (feed.children.length > 25) feed.removeChild(feed.lastChild);
}
