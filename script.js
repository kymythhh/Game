/* ==========================================================================
   1. GAME STATE MANAGEMENT & CAMERA STREAM
   ========================================================================== */
let currentScreen = 'avatar'; 
let selectedMenuIndex = 0;   
let targetScore = 3;         
let cameraStream = null;

// Default avatar head SVGs (as Data URLs)
let p1HeadSrc = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%233b82f6'/><circle cx='35' cy='40' r='8' fill='%23fff'/><circle cx='65' cy='40' r='8' fill='%23fff'/><circle cx='35' cy='40' r='4' fill='%23000'/><circle cx='65' cy='40' r='4' fill='%23000'/><path d='M 30 70 Q 50 85 70 70' stroke='%23fff' stroke-width='6' fill='none'/></svg>";
let p2HeadSrc = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23ef4444'/><circle cx='35' cy='40' r='8' fill='%23fff'/><circle cx='65' cy='40' r='8' fill='%23fff'/><circle cx='35' cy='40' r='4' fill='%23000'/><circle cx='65' cy='40' r='4' fill='%23000'/><path d='M 30 70 Q 50 85 70 70' stroke='%23fff' stroke-width='6' fill='none'/></svg>";

let p1Score = 0;
let p2Score = 0;
let roundActive = false;     
let currentMode = null;      
let countdownTimerObj = null;

// Green Light State
let isGreenLightReady = false;
let greenLightTimer = null;

// Tug-of-War State
let tugPosition = 50;        

// Pattern Mash State
const directionKeysP1 = ['w', 'a', 's', 'd'];
const directionKeysP2 = ['arrowup', 'arrowleft', 'arrowdown', 'arrowright'];
const arrowSymbols = { w: 'w', a: 'a', s: 's', d: 'd', arrowup: '▲', arrowleft: '◄', arrowdown: '▼', arrowright: '►' };

let p1Pattern = [];
let p2Pattern = [];
let p1Index = 0;
let p2Index = 0;

/* ==========================================================================
   2. DOM ELEMENT REFERENCES
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
const p1PreviewContainer = document.getElementById('p1PreviewContainer');
const p2PreviewContainer = document.getElementById('p2PreviewContainer');
const p1CardHead = document.getElementById('p1CardHead');
const p2CardHead = document.getElementById('p2CardHead');

/* ==========================================================================
   3. WEBCAM INITIALIZATION & SNAPSHOT CAPTURE
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
        console.error("Webcam access error:", err);
        statusText.textContent = "Camera access unavailable. Using default avatars.";
    }
}

function captureSnapshot(videoEl, canvasEl) {
    if (!videoEl.srcObject) return null;
    const ctx = canvasEl.getContext('2d');
    const size = Math.min(videoEl.videoWidth || 200, videoEl.videoHeight || 200);
    
    canvasEl.width = size;
    canvasEl.height = size;
    
    // Center crop to square
    const startX = ((videoEl.videoWidth || size) - size) / 2;
    const startY = ((videoEl.videoHeight || size) - size) / 2;
    
    // Draw mirrored image for video selfie feel
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
        statusText.textContent = "Player 1 photo captured!";
    }
});

p2SnapBtn.addEventListener('click', () => {
    const snap = captureSnapshot(p2Video, p2Canvas);
    if (snap) {
        p2HeadSrc = snap;
        updateAvatarDisplays();
        statusText.textContent = "Player 2 photo captured!";
    }
});

function updateAvatarDisplays() {
    if (p1PreviewContainer) p1PreviewContainer.innerHTML = getStickmanSVG(1, 'idle');
    if (p2PreviewContainer) p2PreviewContainer.innerHTML = getStickmanSVG(2, 'idle');
    if (p1CardHead) p1CardHead.innerHTML = getHeadOnlySVG(1);
    if (p2CardHead) p2CardHead.innerHTML = getHeadOnlySVG(2);
}

confirmAvatarsBtn.addEventListener('click', () => {
    stopCamera();
    avatarScreen.classList.remove('active');
    menuScreen.classList.add('active');
    currentScreen = 'menu';
    statusText.textContent = 'Use [W / S] or [▲ / ▼] to navigate, [Enter] to select target score';
});

/* ==========================================================================
   4. KEYBOARD EVENT LISTENER & MENU NAVIGATION
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
        btn.classList.toggle('selected', index === selectedMenuIndex);
    });
}

/* ==========================================================================
   5. MATCH & ROUND FLOW
   ========================================================================== */
function startGame() {
    p1Score = 0;
    p2Score = 0;
    score1El.textContent = p1Score;
    score2El.textContent = p2Score;

    menuScreen.classList.remove('active');
    gameScreen.classList.add('active');
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
        p1KeyBadge.textContent = 'Key: [A]';
        p2KeyBadge.textContent = 'Key: [Left Arrow]';
        setupGreenLight();
    } else if (currentMode === 'tug') {
        p1KeyBadge.textContent = 'Mash [A]';
        p2KeyBadge.textContent = 'Mash [Left Arrow]';
        setupTugOfWar();
    } else if (currentMode === 'pattern') {
        p1KeyBadge.textContent = 'WASD Keys';
        p2KeyBadge.textContent = 'Arrow Keys';
        setupPatternMash();
    }
}

/* ==========================================================================
   6. SVG RENDER HELPERS (NATIVE SVG CLIPPING FOR HEAD IMAGES)
   ========================================================================== */
function getHeadOnlySVG(player) {
    const headUrl = player === 1 ? p1HeadSrc : p2HeadSrc;
    const clipId = `head-clip-mini-${player}-${Math.random().toString(36).substr(2, 5)}`;
    const borderColor = player === 1 ? '#3b82f6' : '#ef4444';

    return `
    <svg viewBox="0 0 50 50" class="stickman-svg">
        <defs>
            <clipPath id="${clipId}">
                <circle cx="25" cy="25" r="22" />
            </clipPath>
        </defs>
        <circle cx="25" cy="25" r="24" fill="none" stroke="${borderColor}" stroke-width="2"/>
        <image href="${headUrl}" x="3" y="3" width="44" height="44" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice" />
    </svg>`;
}

function getStickmanSVG(player, pose = 'idle') {
    const isP1 = player === 1;
    const strokeColor = isP1 ? '#3b82f6' : '#ef4444';
    const headUrl = isP1 ? p1HeadSrc : p2HeadSrc;
    const clipId = `head-clip-${player}-${Math.random().toString(36).substr(2, 5)}`;

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
    <svg class="stickman-svg" viewBox="0 0 100 120" style="stroke: ${strokeColor}">
        <defs>
            <clipPath id="${clipId}">
                <circle cx="50" cy="25" r="20" />
            </clipPath>
        </defs>
        
        <!-- Head Image -->
        <image href="${headUrl}" x="30" y="5" width="40" height="40" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice" />
        <circle cx="50" cy="25" r="20" fill="none" stroke="${strokeColor}" stroke-width="3" />

        <!-- Stickman Body Lines -->
        <line x1="50" y1="45" x2="50" y2="75" class="stick-line" />
        <line x1="50" y1="55" ${armLeft} class="stick-line" />
        <line x1="50" y1="55" ${armRight} class="stick-line" />
        ${legs}
    </svg>`;
}

/* ==========================================================================
   7. MODE 1: GREEN LIGHT REFLEX
   ========================================================================== */
function setupGreenLight() {
    isGreenLightReady = false;
    statusText.textContent = `MODE: Green Light Reflex | First to ${targetScore} Points!`;

    playfieldContent.innerHTML = `
    <div class="green-light-arena">
        <div class="stickman-container p1-stick">${getStickmanSVG(1, 'ready')}</div>
        <div id="greenBox" class="green-light-box">WAIT FOR GREEN...</div>
        <div class="stickman-container p2-stick">${getStickmanSVG(2, 'ready')}</div>
    </div>
  `;

    const delay = Math.floor(Math.random() * 2500) + 2000;
    greenLightTimer = setTimeout(() => {
        if (!roundActive || currentMode !== 'green') return;
        isGreenLightReady = true;

        const box = document.getElementById('greenBox');
        if (box) {
            box.classList.add('ready');
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
            awardPoint(pressedPlayer, `Player ${pressedPlayer} hit first on GREEN!`);
        } else {
            const recipient = pressedPlayer === 1 ? 2 : 1;
            awardPoint(recipient, `Player ${pressedPlayer} hit early! Point to Player ${recipient}.`);
        }
    }
}

/* ==========================================================================
   8. MODE 2: TUG-OF-WAR CLASH (SIMPLIFIED - NO PARRY)
   ========================================================================== */
function setupTugOfWar() {
    tugPosition = 50;
    statusText.textContent = `MODE: Tug-of-War | Mash Key to Push! First to ${targetScore} Points!`;
    renderTugUI();
}

function renderTugUI() {
    playfieldContent.innerHTML = `
    <div class="tug-wrapper">
      <div class="tug-stage">
        <div class="stickman-container p1-pull" style="transform: translateX(${ (50 - tugPosition) * 1.5 }px)">
            ${getStickmanSVG(1, 'pull')}
        </div>

        <div class="tug-track">
          <div class="rope-line"></div>
          <div class="tug-marker" style="left: ${100 - tugPosition}%"></div>
          <div class="tug-fill-p1" style="width: ${100 - tugPosition}%"></div>
        </div>

        <div class="stickman-container p2-pull" style="transform: translateX(${ (50 - tugPosition) * 1.5 }px) scaleX(-1)">
            ${getStickmanSVG(2, 'pull')}
        </div>
      </div>

      <p style="font-size: 0.85rem; color: #bdae9d;">P1 [A] Push ← | → Push [Left Arrow] P2</p>
    </div>
  `;
}

function handleTugInput(key) {
    if (key === 'a') {
        tugPosition = Math.max(0, tugPosition - 4);
    } else if (key === 'arrowleft') {
        tugPosition = Math.min(100, tugPosition + 4);
    }

    renderTugUI();

    if (tugPosition <= 0) {
        awardPoint(1, "Player 1 overpowered Player 2!");
    } else if (tugPosition >= 100) {
        awardPoint(2, "Player 2 overpowered Player 1!");
    }
}

/* ==========================================================================
   9. MODE 3: PATTERN MASH
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

    statusText.textContent = `MODE: Pattern Mash | First to ${targetScore} Points!`;
    renderPatternUI();
}

function renderPatternUI() {
    playfieldContent.innerHTML = `
    <div class="pattern-wrapper">
        <div class="pattern-box">
            <div class="stick-avatar-header">
               <div class="mini-stick">${getStickmanSVG(1, p1Index > 0 ? 'cheer' : 'idle')}</div>
               <div class="pattern-title">Player 1 Sequence</div>
            </div>
            <div class="arrow-sequence">
                ${p1Pattern.map((k, idx) => `
                <div class="arrow-key ${idx < p1Index ? 'done' : ''}">${arrowSymbols[k]}</div>
                `).join('')}
            </div>
        </div>

        <div class="pattern-box">
            <div class="stick-avatar-header">
               <div class="mini-stick">${getStickmanSVG(2, p2Index > 0 ? 'cheer' : 'idle')}</div>
               <div class="pattern-title">Player 2 Sequence</div>
            </div>
            <div class="arrow-sequence">
            ${p2Pattern.map((k, idx) => `
                <div class="arrow-key ${idx < p2Index ? 'done' : ''}">${arrowSymbols[k]}</div>
            `).join('')}
            </div>
        </div>
    </div>
    `;
}

function handlePatternInput(key) {
    if (directionKeysP1.includes(key)) {
        if (key === p1Pattern[p1Index]) {
            p1Index++;
            if (p1Index >= p1Pattern.length) {
                awardPoint(1, "Player 1 completed the sequence first!");
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
                awardPoint(2, "Player 2 completed the sequence first!");
            }
        } else {
            p2Index = 0;
            statusText.textContent = "Player 2 miskeyed! Sequence reset!";
        }
        renderPatternUI();
    }
}

/* ==========================================================================
   10. IN-GAME INPUT ROUTER & SCORING
   ========================================================================== */
function handleGameInput(key) {
    if (key === 'escape') {
        clearInterval(countdownTimerObj);
        clearTimeout(greenLightTimer);
        gameScreen.classList.remove('active');
        menuScreen.classList.add('active');
        currentScreen = 'menu';
        statusText.textContent = 'Use [W / S] or [▲ / ▼] to navigate, [Enter] to select target score';
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

    if (winner === 1) {
        p1Score++;
    } else {
        p2Score++;
    }

    score1El.textContent = p1Score;
    score2El.textContent = p2Score;
    statusText.textContent = message;

    if (p1Score >= targetScore || p2Score >= targetScore) {
        const winnerName = p1Score >= targetScore ? 'PLAYER 1' : 'PLAYER 2';
        const winnerNum = p1Score >= targetScore ? 1 : 2;
        
        playfieldContent.innerHTML = `
            <div class="winner-display">
                <div class="winner-stick">${getStickmanSVG(winnerNum, 'cheer')}</div>
                <div class="arena-message">${winnerName} WINS THE MATCH!</div>
            </div>`;
        statusText.textContent = 'Match Complete! Returning to menu...';

        setTimeout(() => {
            gameScreen.classList.remove('active');
            menuScreen.classList.add('active');
            currentScreen = 'menu';
            statusText.textContent = 'Use [W / S] or [▲ / ▼] to navigate, [Enter] to select target score';
        }, 3000);
    } else {
        setTimeout(() => {
            initiateNextRoundCountdown();
        }, 2000);
    }
}

// Initial camera startup & initial UI render
initWebcam();
updateAvatarDisplays();