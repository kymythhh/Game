/* ==========================================================================
   1. APP STATE & DEFAULT AVATARS
   ========================================================================== */
let currentScreen = 'avatar';
let selectedMenuIndex = 0;
let targetScore = 3;
let cameraStream = null;

// Default SVG Fallback Head Images
let p1HeadSrc = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%233b82f6'/><circle cx='35' cy='40' r='8' fill='%23fff'/><circle cx='65' cy='40' r='8' fill='%23fff'/><circle cx='35' cy='40' r='4' fill='%23000'/><circle cx='65' cy='40' r='4' fill='%23000'/><path d='M 30 70 Q 50 85 70 70' stroke='%23fff' stroke-width='6' fill='none'/></svg>";
let p2HeadSrc = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23ef4444'/><circle cx='35' cy='40' r='8' fill='%23fff'/><circle cx='65' cy='40' r='8' fill='%23fff'/><circle cx='35' cy='40' r='4' fill='%23000'/><circle cx='65' cy='40' r='4' fill='%23000'/><path d='M 30 70 Q 50 85 70 70' stroke='%23fff' stroke-width='6' fill='none'/></svg>";

let p1Score = 0;
let p2Score = 0;
let roundActive = false;
let currentMode = null;
let countdownTimerObj = null;

// Mini-game states
let isGreenLightReady = false;
let greenLightTimer = null;

let tugPosition = 50; // 0 = P1 Wins, 100 = P2 Wins

const directionKeysP1 = ['w', 'a', 's', 'd'];
const directionKeysP2 = ['arrowup', 'arrowleft', 'arrowdown', 'arrowright'];
const arrowSymbols = { w: 'W', a: 'A', s: 'S', d: 'D', arrowup: '▲', arrowleft: '◄', arrowdown: '▼', arrowright: '►' };
let p1Pattern = [];
let p2Pattern = [];
let p1Index = 0;
let p2Index = 0;

/* ==========================================================================
   2. DOM REFERENCES
   ========================================================================== */
const avatarScreen = document.getElementById('avatarScreen');
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const menuBtns = document.querySelectorAll('.menu-btn');

const p1Video = document.getElementById('p1Video');
const p2Video = document.getElementById('p2Video');
const p1Canvas = document.getElementById('p1Canvas');
const p2Canvas = document.getElementById('p2Canvas');
const p1SnapBtn = document.getElementById('p1SnapBtn');
const p2SnapBtn = document.getElementById('p2SnapBtn');
const confirmAvatarsBtn = document.getElementById('confirmAvatarsBtn');

const countdownOverlay = document.getElementById('countdownOverlay');
const countdownTimer = document.getElementById('countdownTimer');
const countdownLabel = document.getElementById('countdownLabel');

const playfieldContent = document.getElementById('playfieldContent');
const statusText = document.getElementById('status');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const p1KeyBadge = document.getElementById('p1KeyBadge');
const p2KeyBadge = document.getElementById('p2KeyBadge');

/* ==========================================================================
   3. RELIABLE SVG HEAD & STICKMAN GENERATION (SVG IMAGE + CLIPPATH)
   ========================================================================== */
let clipIdCounter = 0;

function getHeadOnlySVG(player) {
    const isP1 = player === 1;
    const strokeColor = isP1 ? '#3b82f6' : '#ef4444';
    const headUrl = isP1 ? p1HeadSrc : p2HeadSrc;
    const clipId = `head-clip-card-${player}-${clipIdCounter++}`;

    return `
    <svg viewBox="0 0 100 100" style="width:100%; height:100%;">
        <defs>
            <clipPath id="${clipId}">
                <circle cx="50" cy="50" r="45" />
            </clipPath>
        </defs>
        <circle cx="50" cy="50" r="48" fill="none" stroke="${strokeColor}" stroke-width="4" />
        <image href="${headUrl}" x="5" y="5" width="90" height="90" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />
    </svg>`;
}

function getStickmanSVG(player, pose = 'idle') {
    const isP1 = player === 1;
    const strokeColor = isP1 ? '#3b82f6' : '#ef4444';
    const headUrl = isP1 ? p1HeadSrc : p2HeadSrc;
    const clipId = `head-clip-stick-${player}-${clipIdCounter++}`;

    let armLeft = "x2='20' y2='65'";
    let armRight = "x2='80' y2='65'";
    let legs = "<line x1='50' y1='75' x2='30' y2='110' class='stick-line'/><line x1='50' y1='75' x2='70' y2='110' class='stick-line'/>";

    if (pose === 'pull') {
        armLeft = "x2='10' y2='50'";
        armRight = "x2='30' y2='55'";
        legs = "<line x1='50' y1='75' x2='20' y2='115' class='stick-line'/><line x1='50' y1='75' x2='60' y2='110' class='stick-line'/>";
    } else if (pose === 'cheer') {
        armLeft = "x2='20' y2='25'";
        armRight = "x2='80' y2='25'";
    } else if (pose === 'ready') {
        armLeft = "x2='30' y2='75'";
        armRight = "x2='70' y2='75'";
    }

    return `
    <svg style="width:100%; height:100%;" viewBox="0 0 100 120">
        <defs>
            <clipPath id="${clipId}">
                <circle cx="50" cy="25" r="22" />
            </clipPath>
        </defs>
        
        <!-- Stickman Body -->
        <line x1="50" y1="48" x2="50" y2="75" class="stick-line" stroke="${strokeColor}" stroke-width="6" />
        <line x1="50" y1="55" ${armLeft} class="stick-line" stroke="${strokeColor}" stroke-width="6" />
        <line x1="50" y1="55" ${armRight} class="stick-line" stroke="${strokeColor}" stroke-width="6" />
        <g stroke="${strokeColor}" stroke-width="6">
            ${legs}
        </g>

        <!-- Head Frame & Image -->
        <circle cx="50" cy="25" r="24" fill="#0f172a" stroke="${strokeColor}" stroke-width="3" />
        <image href="${headUrl}" x="28" y="3" width="44" height="44" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />
    </svg>`;
}

/* ==========================================================================
   4. CAMERA & AVATAR CAPTURE
   ========================================================================== */
async function initWebcam() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 300 }, height: { ideal: 300 }, facingMode: "user" }, 
            audio: false 
        });
        p1Video.srcObject = cameraStream;
        p2Video.srcObject = cameraStream;
    } catch (err) {
        console.error("Webcam error:", err);
        statusText.textContent = "Camera access unavailable. Default heads assigned!";
    }
}

function captureSnapshot(videoEl, canvasEl) {
    if (!videoEl.srcObject) return null;
    const ctx = canvasEl.getContext('2d');
    const size = Math.min(videoEl.videoWidth || 200, videoEl.videoHeight || 200);
    
    canvasEl.width = size;
    canvasEl.height = size;
    
    const startX = ((videoEl.videoWidth || size) - size) / 2;
    const startY = ((videoEl.videoHeight || size) - size) / 2;
    
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, startX, startY, size, size, 0, 0, size, size);
    
    return canvasEl.toDataURL('image/png');
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

p1SnapBtn.addEventListener('click', () => {
    const snap = captureSnapshot(p1Video, p1Canvas);
    if (snap) {
        p1HeadSrc = snap;
        updateAvatarDisplays();
        statusText.textContent = "Player 1 photo snapped!";
    }
});

p2SnapBtn.addEventListener('click', () => {
    const snap = captureSnapshot(p2Video, p2Canvas);
    if (snap) {
        p2HeadSrc = snap;
        updateAvatarDisplays();
        statusText.textContent = "Player 2 photo snapped!";
    }
});

function updateAvatarDisplays() {
    document.getElementById('p1PreviewSvg').innerHTML = getStickmanSVG(1, 'idle');
    document.getElementById('p2PreviewSvg').innerHTML = getStickmanSVG(2, 'idle');
    document.getElementById('p1CardSvg').innerHTML = getHeadOnlySVG(1);
    document.getElementById('p2CardSvg').innerHTML = getHeadOnlySVG(2);
}

confirmAvatarsBtn.addEventListener('click', () => {
    confirmAvatarSelection();
});

function confirmAvatarSelection() {
    stopCamera();
    avatarScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    currentScreen = 'menu';
    statusText.textContent = 'Use [W / S] or Controller D-Pad to navigate • Press [Enter] or [A] to select';
}

/* ==========================================================================
   5. CONTROLLER / GAMEPAD API SUPPORT
   ========================================================================== */
let prevPadState = {
    p1: { up: false, down: false, left: false, right: false, action: false, start: false },
    p2: { up: false, down: false, left: false, right: false, action: false, start: false }
};

function pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    if (gamepads[0]) processGamepadInput(gamepads[0], 1);
    if (gamepads[1]) processGamepadInput(gamepads[1], 2);

    requestAnimationFrame(pollGamepads);
}

function processGamepadInput(gp, playerNum) {
    if (!gp) return;

    // Standard Gamepad Button Mapping:
    // 0 = A/Cross, 12 = D-Pad Up, 13 = D-Pad Down, 14 = D-Pad Left, 15 = D-Pad Right, 9 = Start
    const up = (gp.buttons[12] && gp.buttons[12].pressed) || (gp.axes[1] < -0.5);
    const down = (gp.buttons[13] && gp.buttons[13].pressed) || (gp.axes[1] > 0.5);
    const left = (gp.buttons[14] && gp.buttons[14].pressed) || (gp.axes[0] < -0.5);
    const right = (gp.buttons[15] && gp.buttons[15].pressed) || (gp.axes[0] > 0.5);
    const action = gp.buttons[0] && gp.buttons[0].pressed;
    const start = gp.buttons[9] && gp.buttons[9].pressed;

    const pKey = playerNum === 1 ? 'p1' : 'p2';
    const prev = prevPadState[pKey];

    // Avatar Selection Screen via Controller
    if (currentScreen === 'avatar') {
        if (action && !prev.action) {
            if (playerNum === 1) p1SnapBtn.click();
            if (playerNum === 2) p2SnapBtn.click();
        }
        if (start && !prev.start) {
            confirmAvatarSelection();
        }
    }

    // Menu Navigation via Controller
    if (currentScreen === 'menu') {
        if (up && !prev.up) handleMenuNavigation('w');
        if (down && !prev.down) handleMenuNavigation('s');
        if ((action && !prev.action) || (start && !prev.start)) handleMenuNavigation('enter');
    }

    // Gameplay Control via Controller
    if (currentScreen === 'game' && roundActive) {
        if (playerNum === 1) {
            if (currentMode === 'green' && action && !prev.action) handleGreenInput('a');
            if (currentMode === 'tug' && action && !prev.action) handleTugInput('a');
            if (currentMode === 'pattern') {
                if (up && !prev.up) handlePatternInput('w');
                if (left && !prev.left) handlePatternInput('a');
                if (down && !prev.down) handlePatternInput('s');
                if (right && !prev.right) handlePatternInput('d');
            }
        } else if (playerNum === 2) {
            if (currentMode === 'green' && action && !prev.action) handleGreenInput('arrowleft');
            if (currentMode === 'tug' && action && !prev.action) handleTugInput('arrowleft');
            if (currentMode === 'pattern') {
                if (up && !prev.up) handlePatternInput('arrowup');
                if (left && !prev.left) handlePatternInput('arrowleft');
                if (down && !prev.down) handlePatternInput('arrowdown');
                if (right && !prev.right) handlePatternInput('arrowright');
            }
        }
    }

    // Cache input states for edge-detection on next frame
    prevPadState[pKey] = { up, down, left, right, action, start };
}

window.addEventListener('gamepadconnected', (e) => {
    statusText.textContent = `Controller Connected: ${e.gamepad.id}`;
});

requestAnimationFrame(pollGamepads);

/* ==========================================================================
   6. KEYBOARD ROUTING & MENU NAVIGATION
   ========================================================================== */
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
    }

    if (currentScreen === 'menu') {
        handleMenuNavigation(key);
    } else if (currentScreen === 'game') {
        handleGameInput(key);
    }
});

menuBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        selectedMenuIndex = idx;
        updateMenuSelection();
        targetScore = parseInt(btn.dataset.value);
        startGame();
    });
});

function handleMenuNavigation(key) {
    if (key === 'w' || key === 'arrowup') {
        selectedMenuIndex = (selectedMenuIndex - 1 + menuBtns.length) % menuBtns.length;
        updateMenuSelection();
    } else if (key === 's' || key === 'arrowdown') {
        selectedMenuIndex = (selectedMenuIndex + 1) % menuBtns.length;
        updateMenuSelection();
    } else if (key === 'enter') {
        targetScore = parseInt(menuBtns[selectedMenuIndex].dataset.value);
        startGame();
    }
}

function updateMenuSelection() {
    menuBtns.forEach((btn, index) => {
        if (index === selectedMenuIndex) {
            btn.className = "menu-btn selected";
        } else {
            btn.className = "menu-btn";
        }
    });
}

/* ==========================================================================
   7. MATCH & ROUND FLOW
   ========================================================================== */
function startGame() {
    p1Score = 0;
    p2Score = 0;
    score1El.textContent = p1Score;
    score2El.textContent = p2Score;

    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    currentScreen = 'game';

    initiateNextRoundCountdown();
}

function initiateNextRoundCountdown() {
    roundActive = false;
    clearTimeout(greenLightTimer);

    const modeList = ['green', 'tug', 'pattern'];
    currentMode = modeList[Math.floor(Math.random() * modeList.length)];

    p1KeyBadge.textContent = 'Keys: ???';
    p2KeyBadge.textContent = 'Keys: ???';

    countdownOverlay.classList.remove('hidden');
    countdownLabel.textContent = "NEXT ROUND IN";

    let val = 3;
    countdownTimer.textContent = val;

    clearInterval(countdownTimerObj);
    countdownTimerObj = setInterval(() => {
        val--;
        if (val > 0) {
            countdownTimer.textContent = val;
        } else if (val === 0) {
            countdownTimer.textContent = "GO!";
        } else {
            clearInterval(countdownTimerObj);
            countdownOverlay.classList.add('hidden');
            setupActiveRoundMode();
        }
    }, 1000);
}

function setupActiveRoundMode() {
    roundActive = true;

    if (currentMode === 'green') {
        p1KeyBadge.textContent = 'Key: [A] / Pad [A]';
        p2KeyBadge.textContent = 'Key: [◄] / Pad [A]';
        setupGreenLight();
    } else if (currentMode === 'tug') {
        p1KeyBadge.textContent = 'Mash: [A] / Pad [A]';
        p2KeyBadge.textContent = 'Mash: [◄] / Pad [A]';
        setupTugOfWar();
    } else if (currentMode === 'pattern') {
        p1KeyBadge.textContent = 'WASD / D-Pad';
        p2KeyBadge.textContent = 'Arrows / D-Pad';
        setupPatternMash();
    }
}

/* ==========================================================================
   8. MODE 1: GREEN LIGHT REFLEX
   ========================================================================== */
function setupGreenLight() {
    isGreenLightReady = false;
    statusText.textContent = `MODE: Green Light Reflex • First to ${targetScore}!`;

    playfieldContent.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:16px;">
        <div style="width:80px; height:96px; flex-shrink:0;">${getStickmanSVG(1, 'ready')}</div>
        <div id="greenBox" style="flex:1; height:128px; border-radius:12px; background-color:#1e293b; border:2px solid #334155; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.25rem; color:#94a3b8; transition:all 0.15s ease;">
            WAIT FOR GREEN...
        </div>
        <div style="width:80px; height:96px; flex-shrink:0;">${getStickmanSVG(2, 'ready')}</div>
    </div>`;

    const delay = Math.floor(Math.random() * 2500) + 2000;
    greenLightTimer = setTimeout(() => {
        if (!roundActive || currentMode !== 'green') return;
        isGreenLightReady = true;

        const box = document.getElementById('greenBox');
        if (box) {
            box.className = "green-box-ready";
            box.style.fontSize = "1.5rem";
            box.textContent = "PRESS NOW!";
        }
    }, delay);
}

function handleGreenInput(key) {
    let pressedPlayer = null;

    if (key === 'a') pressedPlayer = 1;
    if (key === 'arrowleft') pressedPlayer = 2;

    if (pressedPlayer !== null) {
        clearTimeout(greenLightTimer);
        if (isGreenLightReady) {
            awardPoint(pressedPlayer, `Player ${pressedPlayer} struck first on GREEN!`);
        } else {
            const recipient = pressedPlayer === 1 ? 2 : 1;
            awardPoint(recipient, `Player ${pressedPlayer} jumped early! Point to Player ${recipient}.`);
        }
    }
}

/* ==========================================================================
   9. MODE 2: TUG-OF-WAR CLASH (SIMPLIFIED PURE BUTTON MASHING - NO PARRY)
   ========================================================================== */
function setupTugOfWar() {
    tugPosition = 50;
    statusText.textContent = `MODE: Tug-of-War Clash • Pure Button Mashing!`;
    renderTugUI();
}

function renderTugUI() {
    playfieldContent.innerHTML = `
    <div style="width:100%; display:flex; flex-direction:column; align-items:center; gap:12px;">
        <div style="display:flex; align-items:center; justify-content:center; width:100%; gap:8px;">
            <!-- Player 1 Puller -->
            <div style="width:80px; height:96px; flex-shrink:0; transform: translateX(${(50 - tugPosition) * 1.2}px)">
                ${getStickmanSVG(1, 'pull')}
            </div>

            <!-- Tug Track -->
            <div style="flex:1; height:32px; background-color:#020617; border-radius:9999px; border:2px solid #334155; position:relative; overflow:hidden; display:flex; align-items:center;">
                <div style="position:absolute; inset:0; background:linear-gradient(to right, #2563eb, #dc2626); opacity:0.2;"></div>
                <div class="tug-progress" style="height:100%; background-color:#3b82f6; border-top-left-radius:9999px; border-bottom-left-radius:9999px; width: ${100 - tugPosition}%"></div>
                <div style="position:absolute; top:0; bottom:0; width:8px; background-color:#f59e0b; z-index:10; transform:translateX(-50%); left: ${100 - tugPosition}%"></div>
            </div>

            <!-- Player 2 Puller -->
            <div style="width:80px; height:96px; flex-shrink:0; transform: translateX(${(50 - tugPosition) * 1.2}px) scaleX(-1)">
                ${getStickmanSVG(2, 'pull')}
            </div>
        </div>

        <p style="font-size:0.75rem; color:#94a3b8; font-weight:600;">
            Player 1: Mash <span style="color:#3b82f6; font-weight:700;">[A] / Controller [A]</span> | Player 2: Mash <span style="color:#ef4444; font-weight:700;">[◄ Left] / Controller [A]</span>
        </p>
    </div>`;
}

function handleTugInput(key) {
    if (key === 'a') {
        tugPosition = Math.max(0, tugPosition - 4);
    } else if (key === 'arrowleft') {
        tugPosition = Math.min(100, tugPosition + 4);
    }

    renderTugUI();

    if (tugPosition <= 0) {
        awardPoint(1, "Player 1 pulled the rope all the way!");
    } else if (tugPosition >= 100) {
        awardPoint(2, "Player 2 pulled the rope all the way!");
    }
}

/* ==========================================================================
   10. MODE 3: PATTERN MASH
   ========================================================================== */
function setupPatternMash() {
    p1Index = 0;
    p2Index = 0;

    p1Pattern = [];
    p2Pattern = [];
    for (let i = 0; i < 5; i++) {
        p1Pattern.push(directionKeysP1[Math.floor(Math.random() * 4)]);
        p2Pattern.push(directionKeysP2[Math.floor(Math.random() * 4)]);
    }

    statusText.textContent = `MODE: Pattern Mash • Match the sequence fast!`;
    renderPatternUI();
}

function renderPatternUI() {
    playfieldContent.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%;">
        <!-- P1 Sequence -->
        <div style="background-color:rgba(2,6,23,0.6); padding:12px; border-radius:12px; border:1px solid rgba(59,130,246,0.3); display:flex; flex-direction:column; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="width:32px; height:40px;">${getStickmanSVG(1, p1Index > 0 ? 'cheer' : 'idle')}</div>
                <span style="font-size:0.75rem; font-weight:700; color:#3b82f6;">P1 Sequence</span>
            </div>
            <div style="display:flex; gap:6px;">
                ${p1Pattern.map((k, idx) => `
                    <div style="width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.875rem; border:2px solid ${idx < p1Index ? '#34d399; background-color:#10b981; color:#020617;' : '#334155; background-color:#1e293b; color:#f8fafc;'}">
                        ${arrowSymbols[k]}
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- P2 Sequence -->
        <div style="background-color:rgba(2,6,23,0.6); padding:12px; border-radius:12px; border:1px solid rgba(239,68,68,0.3); display:flex; flex-direction:column; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="width:32px; height:40px;">${getStickmanSVG(2, p2Index > 0 ? 'cheer' : 'idle')}</div>
                <span style="font-size:0.75rem; font-weight:700; color:#ef4444;">P2 Sequence</span>
            </div>
            <div style="display:flex; gap:6px;">
                ${p2Pattern.map((k, idx) => `
                    <div style="width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.875rem; border:2px solid ${idx < p2Index ? '#34d399; background-color:#10b981; color:#020617;' : '#334155; background-color:#1e293b; color:#f8fafc;'}">
                        ${arrowSymbols[k]}
                    </div>
                `).join('')}
            </div>
        </div>
    </div>`;
}

function handlePatternInput(key) {
    if (directionKeysP1.includes(key)) {
        if (key === p1Pattern[p1Index]) {
            p1Index++;
            if (p1Index >= p1Pattern.length) {
                awardPoint(1, "Player 1 completed their sequence first!");
            }
        } else {
            p1Index = 0;
            statusText.textContent = "Player 1 miskeyed! Sequence reset!";
        }
        renderPatternUI();
    }

    if (directionKeysP2.includes(key)) {
        if (key === p2Pattern[p2Index]) {
            p2Index++;
            if (p2Index >= p2Pattern.length) {
                awardPoint(2, "Player 2 completed their sequence first!");
            }
        } else {
            p2Index = 0;
            statusText.textContent = "Player 2 miskeyed! Sequence reset!";
        }
        renderPatternUI();
    }
}

/* ==========================================================================
   11. IN-GAME INPUT ROUTING & SCORING
   ========================================================================== */
function handleGameInput(key) {
    if (key === 'escape') {
        clearInterval(countdownTimerObj);
        clearTimeout(greenLightTimer);
        gameScreen.classList.add('hidden');
        menuScreen.classList.remove('hidden');
        currentScreen = 'menu';
        statusText.textContent = 'Use [W / S] or Controller D-Pad to navigate • Press [Enter] or [A] to select';
        return;
    }

    if (!roundActive) return;

    if (currentMode === 'green') {
        handleGreenInput(key);
    } else if (currentMode === 'tug') {
        handleTugInput(key);
    } else if (currentMode === 'pattern') {
        handlePatternInput(key);
    }
}

function awardPoint(winner, message) {
    roundActive = false;

    if (winner === 1) p1Score++;
    else p2Score++;

    score1El.textContent = p1Score;
    score2El.textContent = p2Score;
    statusText.textContent = message;

    if (p1Score >= targetScore || p2Score >= targetScore) {
        const winnerName = p1Score >= targetScore ? 'PLAYER 1' : 'PLAYER 2';
        const winnerNum = p1Score >= targetScore ? 1 : 2;
        
        playfieldContent.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                <div style="width:96px; height:112px;">${getStickmanSVG(winnerNum, 'cheer')}</div>
                <div style="font-size:1.5rem; font-weight:900; color:#f59e0b;">${winnerName} WINS THE MATCH!</div>
            </div>`;
        statusText.textContent = 'Match Complete! Returning to menu...';

        setTimeout(() => {
            gameScreen.classList.add('hidden');
            menuScreen.classList.remove('hidden');
            currentScreen = 'menu';
            statusText.textContent = 'Use [W / S] or Controller D-Pad to navigate • Press [Enter] or [A] to select';
        }, 3500);
    } else {
        setTimeout(() => {
            initiateNextRoundCountdown();
        }, 2000);
    }
}

// Start webcam and setup avatar previews
initWebcam();
updateAvatarDisplays();