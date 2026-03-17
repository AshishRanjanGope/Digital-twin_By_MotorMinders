// ==========================================
// 0. API CONFIGURATIONS & INTEGRATIONS
// ==========================================
// --- SUPABASE ---
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_ANON_PUBLIC_KEY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- EMAILJS ---
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

emailjs.init(EMAILJS_PUBLIC_KEY);

let lastEmailSent = 0;
const EMAIL_COOLDOWN = 2 * 60 * 1000; // 2 Minutes in milliseconds

// Helper function to send emails safely
function triggerEmail(subject, message) {
    const now = Date.now();
    // Enforce 2-minute global cooldown
    if (now - lastEmailSent < EMAIL_COOLDOWN) {
        console.log("Email cooldown active. Suppressed alert:", subject);
        return;
    }
    
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        subject: subject,
        message: message,
        time: new Date().toLocaleTimeString()
    }).then(() => {
        console.log(`Email Sent: ${subject}`);
    }).catch(err => console.error("EmailJS Error:", err));
    
    lastEmailSent = now;
}

// ==========================================
// 1. VIEW NAVIGATION (SPA LOGIC)
// ==========================================
const navDashboard = document.getElementById('navDashboard');
const navEnergy = document.getElementById('navEnergy');
const navModels = document.getElementById('navModels');
const navAlerts = document.getElementById('navAlerts');

const dashboardView = document.getElementById('dashboardView');
const energyView = document.getElementById('energyView');
const modelsView = document.getElementById('modelsView');
const alertsView = document.getElementById('alertsView');

function switchView(activeNav, activeView) {
    dashboardView.style.display = 'none';
    energyView.style.display = 'none';
    modelsView.style.display = 'none';
    alertsView.style.display = 'none';
    
    navDashboard.classList.remove('active');
    navEnergy.classList.remove('active');
    navModels.classList.remove('active');
    navAlerts.classList.remove('active');
    
    activeView.style.display = 'flex';
    activeNav.classList.add('active');
}

navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchView(navDashboard, dashboardView); });
navEnergy.addEventListener('click', (e) => { e.preventDefault(); switchView(navEnergy, energyView); });
navModels.addEventListener('click', (e) => { e.preventDefault(); switchView(navModels, modelsView); });
navAlerts.addEventListener('click', (e) => { e.preventDefault(); switchView(navAlerts, alertsView); });

// ==========================================
// 2. ECHARTS INITIALIZATION & FACTORIES
// ==========================================
const tempGauge = echarts.init(document.getElementById('tempGauge'));
const humGauge = echarts.init(document.getElementById('humGauge'));
const currGauge = echarts.init(document.getElementById('currGauge'));
const voltGauge = echarts.init(document.getElementById('voltGauge'));
const vibGauge = echarts.init(document.getElementById('vibGauge'));
const tempLine = echarts.init(document.getElementById('tempLine'));
const currLine = echarts.init(document.getElementById('currLine'));
const voltLine = echarts.init(document.getElementById('voltLine'));
const vibLine = echarts.init(document.getElementById('vibLine'));

function getHalfGaugeOption(min, max, unit, name) {
    return {
        series: [{
            type: 'gauge', startAngle: 180, endAngle: 0, min: min, max: max, splitNumber: 4,
            progress: { show: false }, pointer: { show: true, length: '50%', width: 5, itemStyle: { color: 'auto' } },
            axisLine: { lineStyle: { width: 12, color: [ [0.33, '#4ade80'], [0.66, '#fbbf24'], [1, '#ef4444'] ] } },
            axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, title: { show: false },
            detail: { valueAnimation: true, offsetCenter: [0, '45%'], fontSize: 22, fontWeight: 'bold', color: '#fff', formatter: `{value}${unit}` },
            data: [{ value: 0 }]
        }]
    };
}
tempGauge.setOption(getHalfGaugeOption(0, 100, '°c', 'Temp'));
humGauge.setOption(getHalfGaugeOption(0, 100, '%', 'Humidity'));
currGauge.setOption(getHalfGaugeOption(0, 10, ' A', 'Current'));
voltGauge.setOption(getHalfGaugeOption(0, 25, ' V', 'Voltage'));
vibGauge.setOption(getHalfGaugeOption(0, 1, '', 'Vibration')); 

function getLineOption(title, lineColor, areaColorStart) {
    return {
        title: { text: title, textStyle: { color: '#fff', fontSize: 13, fontWeight: 'normal' }, top: 0 },
        grid: { left: '8%', right: '2%', top: '25%', bottom: '15%' },
        xAxis: { type: 'category', show: false, data: [] },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: '#2a3441', type: 'dashed' } }, axisLabel: { color: '#8b95a5', fontSize: 10 } },
        series: [{
            type: 'line', smooth: true, symbol: 'none', itemStyle: { color: lineColor },
            areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [ { offset: 0, color: areaColorStart }, { offset: 1, color: 'rgba(0,0,0,0)' } ]) },
            data: []
        }]
    };
}
tempLine.setOption(getLineOption('Temperature (°C)', '#f97316', 'rgba(249, 115, 22, 0.4)'));
currLine.setOption(getLineOption('Current (A)', '#fbbf24', 'rgba(251, 191, 36, 0.4)'));
voltLine.setOption(getLineOption('Voltage (V)', '#a855f7', 'rgba(168, 85, 247, 0.4)'));
vibLine.setOption(getLineOption('Vibration (Normalized)', '#ef4444', 'rgba(239, 68, 68, 0.4)'));

window.addEventListener('resize', () => {
    tempGauge.resize(); humGauge.resize(); currGauge.resize(); voltGauge.resize(); vibGauge.resize();
    tempLine.resize(); currLine.resize(); voltLine.resize(); vibLine.resize();
});

// ==========================================
// 3. UI CONTROLS & ODOMETER
// ==========================================
let tempLimit = 40; let humLimit = 55; let currLimit = 6.0; let voltLimit = 15.0; let vibLimit = 0.66; let isMuted = false;
document.getElementById('tempSlider').addEventListener('input', (e) => { tempLimit = parseFloat(e.target.value); document.getElementById('tempLimitVal').innerText = tempLimit; });
document.getElementById('humSlider').addEventListener('input', (e) => { humLimit = parseFloat(e.target.value); document.getElementById('humLimitVal').innerText = humLimit; });
document.getElementById('currSlider').addEventListener('input', (e) => { currLimit = parseFloat(e.target.value); document.getElementById('currLimitVal').innerText = currLimit.toFixed(1); });
document.getElementById('voltSlider').addEventListener('input', (e) => { voltLimit = parseFloat(e.target.value); document.getElementById('voltLimitVal').innerText = voltLimit.toFixed(1); });
document.getElementById('vibSlider').addEventListener('input', (e) => { vibLimit = parseFloat(e.target.value); document.getElementById('vibLimitVal').innerText = vibLimit.toFixed(2); });
document.getElementById('muteToggle').addEventListener('change', (e) => { isMuted = e.target.checked; });

class OdometerRoller {
    constructor(elementId) {
        this.container = document.getElementById(elementId); this.container.innerHTML = ''; 
        this.container.style.display = 'inline-flex'; this.container.style.alignItems = 'center'; this.strips = [];
        for(let i = 0; i < 7; i++) {
            if(i === 4) { let dot = document.createElement('div'); dot.innerText = '.'; dot.style.padding = '0 2px'; this.container.appendChild(dot); continue; }
            let digitWin = document.createElement('div'); digitWin.style.height = '1.2em'; digitWin.style.width = '0.65em'; digitWin.style.overflow = 'hidden'; digitWin.style.position = 'relative';
            let strip = document.createElement('div'); strip.style.display = 'flex'; strip.style.flexDirection = 'column'; strip.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
            let initialDigit = document.createElement('div'); initialDigit.innerText = '0'; initialDigit.style.height = '1.2em'; initialDigit.style.display = 'flex'; initialDigit.style.justifyContent = 'center'; initialDigit.style.alignItems = 'center';
            strip.appendChild(initialDigit); digitWin.appendChild(strip); this.container.appendChild(digitWin);
            this.strips.push({ element: strip, currentDigit: '0' });
        }
    }
    update(value) {
        const strVal = value.toFixed(2).padStart(7, '0').replace('.', '');
        for(let i = 0; i < 6; i++) {
            let targetDigit = strVal[i]; let stripObj = this.strips[i];
            if (targetDigit !== stripObj.currentDigit) {
                let newDiv = document.createElement('div'); newDiv.innerText = targetDigit; newDiv.style.height = '1.2em'; newDiv.style.display = 'flex'; newDiv.style.justifyContent = 'center'; newDiv.style.alignItems = 'center';
                stripObj.element.appendChild(newDiv); stripObj.element.style.transform = `translateY(-1.2em)`; stripObj.currentDigit = targetDigit;
                setTimeout(() => {
                    if (stripObj.element.children.length > 1) {
                        stripObj.element.removeChild(stripObj.element.firstElementChild); stripObj.element.style.transition = 'none'; stripObj.element.style.transform = `translateY(0)`; void stripObj.element.offsetHeight; stripObj.element.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                    }
                }, 400); 
            }
        }
    }
}
const energyOdometer = new OdometerRoller('energyOdo');

// ==========================================
// 3.5 SMART ENERGY DEVICES & MODAL LOGIC
// ==========================================
let currentNrg = 0; 

// Devices now include tracking booleans to ensure emails only fire once per threshold
let devices = [
    { id: 1, name: "Phone charger", limit: 2, image: "img_phone.jpg", isOn: true, baselineEnergy: 0, frozenEnergy: 0, notified50: false, notified90: false, notified100: false },
    { id: 2, name: "Fan", limit: 1000, image: "https://img.icons8.com/color/100/000000/fan.png", isOn: false, baselineEnergy: 0, frozenEnergy: 490, notified50: false, notified90: false, notified100: false }, 
    { id: 3, name: "Cooler", limit: 3000, image: "https://img.icons8.com/color/100/000000/air-conditioner.png", isOn: false, baselineEnergy: 0, frozenEnergy: 1290, notified50: false, notified90: false, notified100: false } 
];
let uploadedImageUrl = null;

const modal = document.getElementById('deviceModal');
const openModalBtn = document.getElementById('openAddDeviceBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveDeviceBtn = document.getElementById('saveDeviceBtn');
const uploadBox = document.getElementById('uploadBox');
const devImageInput = document.getElementById('devImage');

openModalBtn.addEventListener('click', () => modal.style.display = 'flex');
closeModalBtn.addEventListener('click', () => { modal.style.display = 'none'; uploadedImageUrl = null; });

uploadBox.addEventListener('click', () => devImageInput.click());
devImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        uploadedImageUrl = URL.createObjectURL(file);
        uploadBox.innerHTML = `<img src="${uploadedImageUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:16px;">`;
    }
});

saveDeviceBtn.addEventListener('click', () => {
    const name = document.getElementById('devName').value;
    const limit = parseFloat(document.getElementById('devLimit').value);
    
    if(!name || isNaN(limit)) return alert("Please enter valid name and energy limit!");

    devices.push({ 
        id: Date.now(), name: name, limit: limit, image: uploadedImageUrl || 'https://img.icons8.com/color/100/000000/processor.png',
        isOn: true, baselineEnergy: currentNrg, frozenEnergy: 0,
        notified50: false, notified90: false, notified100: false
    });
    
    renderDevices();
    modal.style.display = 'none';
    document.getElementById('devName').value = ''; document.getElementById('devLimit').value = '';
    uploadBox.innerHTML = `<span style="font-size: 2rem;">⬆️</span><p>Upload an Image</p><p style="font-size: 0.7rem; color: #8b95a5;">Add a photo (optional)</p>`;
    uploadedImageUrl = null;
});

document.getElementById('devicesList').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-device-btn')) {
        const deviceId = parseInt(e.target.dataset.id);
        devices = devices.filter(dev => dev.id !== deviceId);
        renderDevices();
    }
    if (e.target.classList.contains('toggle-btn')) {
        const deviceId = parseInt(e.target.dataset.id);
        const dev = devices.find(d => d.id === deviceId);
        if (dev) {
            dev.isOn = !dev.isOn;
            if (dev.isOn) {
                dev.baselineEnergy = currentNrg; 
                dev.frozenEnergy = 0;
                // Reset notification flags when turned back on
                dev.notified50 = false; dev.notified90 = false; dev.notified100 = false;
            } else {
                let consumed = currentNrg - dev.baselineEnergy;
                if (consumed < 0) consumed = 0;
                dev.frozenEnergy = consumed;
            }
            renderDevices();
        }
    }
});

function updateDeviceProgress(nrg) {
    devices.forEach(dev => {
        let consumed = 0;
        if (dev.isOn) {
            consumed = nrg - dev.baselineEnergy;
            if (consumed < 0) consumed = 0;
        } else {
            consumed = dev.frozenEnergy;
        }

        let percent = (consumed / dev.limit) * 100;
        if (percent > 100) percent = 100;
        
        // Check Thresholds for Emails
        if (percent >= 100 && !dev.notified100) {
            triggerEmail("Device Energy Critical", `${dev.name} has reached 100% of its energy limit (${dev.limit} Wh).`);
            dev.notified100 = true;
        } else if (percent >= 90 && !dev.notified90) {
            triggerEmail("Device Energy Warning", `${dev.name} has reached ${percent.toFixed(1)}% of its energy limit.`);
            dev.notified90 = true;
        } else if (percent >= 50 && !dev.notified50) {
            triggerEmail("Device Energy Notice", `${dev.name} has reached 50% of its energy limit.`);
            dev.notified50 = true;
        }
        
        const barElement = document.getElementById(`bar-${dev.id}`);
        const textElement = document.getElementById(`text-${dev.id}`);
        
        if(barElement && textElement) {
            barElement.style.width = `${percent}%`;
            textElement.innerText = percent.toFixed(1);
            if(percent >= 90) barElement.style.background = '#ef4444'; else barElement.style.background = '#a3e635';
        }
    });
}

function renderDevices() {
    const list = document.getElementById('devicesList');
    list.innerHTML = '';
    devices.forEach(dev => {
        const card = document.createElement('div'); card.className = 'device-card';
        const toggleClass = dev.isOn ? 'toggle-on' : 'toggle-off';
        const toggleText = dev.isOn ? 'Turn OFF' : 'Turn ON';
        const statusColor = dev.isOn ? '#4ade80' : '#8b95a5';
        
        card.innerHTML = `
            <button class="remove-device-btn" data-id="${dev.id}">X</button>
            <div class="device-img-box"><img src="${dev.image}"></div>
            <div class="device-info">
                <div class="device-header"><span>Device Name : ${dev.name}</span><span>Energy Limit : ${dev.limit} Wh</span></div>
                <div class="progress-container">
                    <div class="progress-text"><span id="text-${dev.id}">0</span>% of Energy limit used</div>
                    <div class="progress-track"><div class="progress-fill" id="bar-${dev.id}"></div></div>
                </div>
                <div class="device-status">
                    Status : <span style="color: ${statusColor}; font-weight: bold; margin-right: 15px;">${dev.isOn ? 'ON' : 'OFF'}</span>
                    <button class="toggle-btn ${toggleClass}" data-id="${dev.id}">${toggleText}</button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
    updateDeviceProgress(currentNrg);
}
renderDevices();

// ==========================================
// 4. AUDIO ALERT SYSTEM
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isCurrentlyCritical = false;

function playTone(freq, type, duration, startTimeOffset = 0) {
    if (isMuted) return; 
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq; osc.connect(gain); gain.connect(audioCtx.destination);
    const startTime = audioCtx.currentTime + startTimeOffset;
    gain.gain.setValueAtTime(0.1, startTime); gain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
    osc.start(startTime); osc.stop(startTime + duration);
}
function playCriticalAlert() { if (audioCtx.state === 'suspended') audioCtx.resume(); playTone(800, 'square', 0.2, 0); playTone(800, 'square', 0.2, 0.3); playTone(800, 'square', 0.2, 0.6); }
function playNormalAlert() { if (audioCtx.state === 'suspended') audioCtx.resume(); playTone(523.25, 'sine', 0.3, 0); playTone(659.25, 'sine', 0.5, 0.2); }

// ==========================================
// 5. WEB SERIAL API & DB LOGGING LOGIC
// ==========================================
let port; let reader; let closedPromise; let inputBuffer = ''; let isConnected = false;
let seconds = 0; let uptimeInterval; 

const maxDataPoints = 30;
let timeData = []; let tempDataArr = []; let currDataArr = []; let voltDataArr = []; let vibDataArr = [];

document.getElementById('connectBtn').addEventListener('click', async () => {
    if (isConnected) await disconnectDevice(); else await connectDevice();
});

async function connectDevice() {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        port = await navigator.serial.requestPort(); await port.open({ baudRate: 9600 });
        isConnected = true;
        
        const btn = document.getElementById('connectBtn');
        btn.innerText = 'Stop Monitoring'; btn.style.background = '#ef4444'; btn.style.borderColor = '#dc2626'; btn.style.color = '#ffffff';
        document.getElementById('dbStatus').innerText = 'Database: Syncing Live...';
        document.getElementById('dbStatus').classList.add('connected');
        
        startUptime();
        const decoder = new TextDecoderStream(); closedPromise = port.readable.pipeTo(decoder.writable);
        reader = decoder.readable.getReader(); readLoop();
    } catch (err) { console.error('Connection error:', err); }
}

async function readLoop() {
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break; 
            if (value) {
                inputBuffer += value;
                let lines = inputBuffer.split('\n'); inputBuffer = lines.pop(); 
                for (let line of lines) processData(line.trim());
            }
        }
    } catch (error) { console.error("Read error:", error); } finally { reader.releaseLock(); }
}

async function disconnectDevice() {
    try {
        isConnected = false; clearInterval(uptimeInterval);
        if (reader) await reader.cancel();
        if (closedPromise) await closedPromise.catch(() => {});
        if (port) await port.close();

        const btn = document.getElementById('connectBtn');
        btn.innerText = 'Start Monitoring'; btn.style.background = 'linear-gradient(90deg, #1b4332, #2d6a4f)'; btn.style.borderColor = '#4ade80'; btn.style.color = '#ffffff';
        
        document.getElementById('statusBanner').innerHTML = 'MONITORING STOPPED <span class="arrow">⏹</span>';
        document.getElementById('statusBanner').style.background = '#131a2b'; document.getElementById('statusBanner').style.color = '#8b95a5'; document.getElementById('statusBanner').style.border = '1px solid #2a3441';
        
        document.getElementById('dbStatus').innerText = 'Database: Disconnected';
        document.getElementById('dbStatus').classList.remove('connected');
        isCurrentlyCritical = false;
    } catch (error) { console.error("Disconnect error:", error); }
}

function startUptime() {
    clearInterval(uptimeInterval);
    uptimeInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        document.getElementById('uptime').innerText = `${m}:${s}`;
    }, 1000);
}

// THIS IS THE CORE ENGINE WHERE DATA IS LOGGED
async function processData(line) {
    if (!line) return;
    const [temp, hum, curr, volt, nrg, vib] = line.split(' ').map(Number);
    if (isNaN(temp) || isNaN(hum) || isNaN(curr) || isNaN(volt) || isNaN(nrg) || isNaN(vib)) return;
    
    currentNrg = nrg;

    // 1. SPECIFIC WARNING LOGIC
    let activeWarnings = [];
    if (curr >= currLimit) activeWarnings.push("Over-current");
    if (volt >= voltLimit) activeWarnings.push("Over-voltage");
    if (temp >= tempLimit) activeWarnings.push("Thermal overload");
    if (vib >= vibLimit) activeWarnings.push("Mechanical Imbalance");
    if (hum >= humLimit) activeWarnings.push("High insulation degradation Risk");

    const limitExceeded = activeWarnings.length > 0;
    const currentStatus = limitExceeded ? activeWarnings.join(', ') : 'NORMAL';
    
    
    // TRIGGER SENSOR EMAIL ALERTS
    if (limitExceeded) {
        const formattedMessage = `
            <strong style="color: #ef4444;">⚠️ Limits Breached:</strong> ${currentStatus}<br><br>
            <strong>📊 Current Readings:</strong><br>
            <span style="color: #4ade80;">•</span> Temp: ${temp.toFixed(1)} °C<br>
            <span style="color: #4ade80;">•</span> Hum: ${hum.toFixed(1)} %<br>
            <span style="color: #4ade80;">•</span> Curr: ${curr.toFixed(2)} A<br>
            <span style="color: #4ade80;">•</span> Volt: ${volt.toFixed(1)} V<br>
            <span style="color: #4ade80;">•</span> Vib: ${vib.toFixed(2)}
        `;
        triggerEmail("Critical Sensor Limit Exceeded", formattedMessage);
    }

    // 2. SUPABASE LOGGING
    supabaseClient.from('motor_logs').insert([{
        temperature: temp, humidity: hum, current: curr, voltage: volt, vibration: vib, energy: nrg, runtime_seconds: seconds, status: currentStatus 
    }]).then(({ error }) => { if (error) console.error("Supabase Insert Error:", error); });

    // 3. UPDATE ALERTS TABLE UI
    const tbody = document.getElementById('logsTableBody');
    const newRow = document.createElement('tr');
    if (limitExceeded) newRow.classList.add('row-critical');
    
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const badgeClass = limitExceeded ? 'status-badge-critical' : 'status-badge-normal';
    
    newRow.innerHTML = `
        <td>${timeString}</td><td>${temp.toFixed(1)}</td><td>${hum.toFixed(1)}</td><td>${curr.toFixed(2)}</td>
        <td>${volt.toFixed(1)}</td><td>${vib.toFixed(2)}</td><td>${nrg.toFixed(4)}</td><td>${seconds}</td>
        <td><span class="${badgeClass}">${currentStatus}</span></td>
    `;
    tbody.prepend(newRow); 
    if (tbody.children.length > 100) tbody.lastElementChild.remove(); 

    // 4. Update Gauges, Odometer, and Smart Devices
    tempGauge.setOption({ series: [{ data: [{ value: temp }] }] });
    humGauge.setOption({ series: [{ data: [{ value: hum }] }] });
    currGauge.setOption({ series: [{ data: [{ value: curr.toFixed(2) }] }] });
    voltGauge.setOption({ series: [{ data: [{ value: volt.toFixed(1) }] }] });
    
    let vibText = 'LOW'; let vibColor = '#4ade80'; 
    if (vib >= vibLimit) { vibText = 'HIGH'; vibColor = '#ef4444'; } else if (vib >= (vibLimit * 0.8)) { vibText = 'MED'; vibColor = '#fbbf24'; }
    vibGauge.setOption({ series: [{ data: [{ value: vib.toFixed(2) }], detail: { formatter: vibText, color: vibColor } }] });
    
    energyOdometer.update(nrg);
    updateDeviceProgress(currentNrg); 

    // 5. Trigger Alarms and Banners
    const banner = document.getElementById('statusBanner');
    if (limitExceeded) {
        if (!isCurrentlyCritical) { isCurrentlyCritical = true; playCriticalAlert(); }
        banner.innerHTML = `⚠️ ${activeWarnings.join(' | ')} <span class="arrow">!</span>`;
        banner.style.background = 'linear-gradient(90deg, #7f1d1d, #450a0a)'; banner.style.color = '#f87171'; banner.style.border = '1px solid #ef4444';
    } else {
        if (isCurrentlyCritical) { isCurrentlyCritical = false; playNormalAlert(); }
        banner.innerHTML = 'STATUS NORMAL <span class="arrow">▶</span>';
        banner.style.background = 'linear-gradient(90deg, #1b4332, #0f291e)'; banner.style.color = '#4ade80'; banner.style.border = '1px solid #2a3441';
    }

    // 6. Update Line Charts
    timeData.push(`${now.getMinutes()}:${now.getSeconds()}`);
    tempDataArr.push(temp); currDataArr.push(curr); voltDataArr.push(volt); vibDataArr.push(vib);
    if (timeData.length > maxDataPoints) { timeData.shift(); tempDataArr.shift(); currDataArr.shift(); voltDataArr.shift(); vibDataArr.shift(); }
    tempLine.setOption({ xAxis: { data: timeData }, series: [{ data: tempDataArr }] });
    currLine.setOption({ xAxis: { data: timeData }, series: [{ data: currDataArr }] });
    voltLine.setOption({ xAxis: { data: timeData }, series: [{ data: voltDataArr }] });
    vibLine.setOption({ xAxis: { data: timeData }, series: [{ data: vibDataArr }] });
}