// Smart Jogger - main.js

let positions = [];
let watchId = null;
let lastDrawnIndex = 0;
let stopTimeout = null;
const STOP_THRESHOLD = 15000; // 15 seconds

const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const networkStatus = document.getElementById('network-status');
const locationStatus = document.getElementById('location-status');
const alerts = document.getElementById('alerts');
const stats = document.getElementById('stats');

function updateNetworkStatus() {
  if ('connection' in navigator) {
    const conn = navigator.connection;
    let status = `Network: ${conn.effectiveType}`;
    if (!conn.downlink || conn.downlink < 0.5) {
      status += ' (Poor connection)';
      alerts.textContent = 'Warning: Poor network connection!';
    } else {
      alerts.textContent = '';
    }
    networkStatus.textContent = status;
    conn.addEventListener('change', updateNetworkStatus);
  } else {
    networkStatus.textContent = 'Network: Unknown';
  }
}

function updateLocationStatus(msg) {
  locationStatus.textContent = `Location: ${msg}`;
}

function drawPath() {
  if (positions.length < 2) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  // Normalize positions to fit canvas
  const lats = positions.map(p => p.latitude);
  const lngs = positions.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 0.0005;
  const scaleX = canvas.width / (maxLng - minLng + pad);
  const scaleY = canvas.height / (maxLat - minLat + pad);
  positions.forEach((pos, i) => {
    const x = (pos.longitude - minLng) * scaleX;
    const y = canvas.height - (pos.latitude - minLat) * scaleY;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#2196f3';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Draw current position
  const last = positions[positions.length - 1];
  const x = (last.longitude - minLng) * scaleX;
  const y = canvas.height - (last.latitude - minLat) * scaleY;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#d32f2f';
  ctx.fill();
}

function updateStats() {
  if (positions.length < 2) {
    stats.innerHTML = 'Distance: 0.00 km<br>Time: 0m 0s<br>Avg Speed: 0.00 km/h<br>Current Speed: 0.00 km/h';
    return;
  }
  let dist = 0;
  for (let i = 1; i < positions.length; i++) {
    dist += haversine(positions[i-1], positions[i]);
  }
  const time = (positions[positions.length-1].timestamp - positions[0].timestamp) / 1000;
  const speed = dist / (time / 3600); // km/h
  let currentSpeed = 0;
  if (positions.length > 1) {
    const last = positions[positions.length-1];
    const prev = positions[positions.length-2];
    const d = haversine(prev, last);
    const t = (last.timestamp - prev.timestamp) / 3600 / 1000; // hours
    if (t > 0) currentSpeed = d / t;
  }
  stats.innerHTML = `Distance: ${dist.toFixed(2)} km<br>Time: ${Math.floor(time/60)}m ${Math.floor(time%60)}s<br>Avg Speed: ${speed.toFixed(2)} km/h<br>Current Speed: ${currentSpeed.toFixed(2)} km/h`;
}

function haversine(p1, p2) {
  // Returns distance in km
  const R = 6371;
  const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
  const dLng = (p2.longitude - p1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(p1.latitude*Math.PI/180) * Math.cos(p2.latitude*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function onPosition(pos) {
  const { latitude, longitude } = pos.coords;
  positions.push({ latitude, longitude, timestamp: Date.now() });
  updateLocationStatus('Tracking...');
  drawPath();
  updateStats();
  resetStopDetection();
}

function onError(err) {
  updateLocationStatus('Error: ' + err.message);
  alerts.textContent = 'Location error: ' + err.message;
}

function startTracking() {
  if (!('geolocation' in navigator)) {
    updateLocationStatus('Geolocation not supported');
    return;
  }
  watchId = navigator.geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000
  });
  updateLocationStatus('Starting...');
}

function resetStopDetection() {
  if (stopTimeout) clearTimeout(stopTimeout);
  stopTimeout = setTimeout(() => {
    alerts.textContent = 'You have stopped moving!';
  }, STOP_THRESHOLD);
  alerts.textContent = '';
}

function addResetButton() {
  if (document.getElementById('reset-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'reset-btn';
  btn.textContent = 'Reset';
  btn.style.marginTop = '1rem';
  btn.onclick = () => {
    positions = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stats.innerHTML = '';
    alerts.textContent = '';
    updateLocationStatus('Waiting...');
    startTracking();
  };
  stats.parentNode.insertBefore(btn, stats.nextSibling);
}

window.onload = function() {
  updateNetworkStatus();
  startTracking();
  addResetButton();
}; 