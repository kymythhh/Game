/* ==========================================================================
   1. APP STATE & DEFAULT AVATARS
   ========================================================================== */
let currentScreen = 'landing';
let selectedGameMode = 'arcade';
let selectedMenuIndex = 0;
let targetScore = 3;
let cameraStream = null;

let p1HeadSrc = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%2300f0ff'/><circle cx='35' cy='40' r='8' fill='%23000'/><circle cx='65' cy='40' r='8' fill='%23000'/><circle cx='35' cy='40' r='3' fill='%23fff'/><circle cx='65' cy='40' r='3' fill='%23fff'/><path d='M 30 70 Q 50 85 70 70' stroke='%23000' stroke-width='6' fill='none'/></svg>";
let p2HeadSrc = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23ff0055'/><circle cx='35' cy='40' r='8' fill='%23fff'/><circle cx='65' cy='40' r='8' fill='%23fff'/><circle cx='35' cy='40' r='3' fill='%23000'/><circle cx='65' cy='40' r='3' fill='%23000'/><path d='M 30 70 Q 50 85 70 70' stroke='%23fff' stroke-width='6' fill='none'/></svg>";

let p1Score = 0;
let p2Score = 0;
let roundActive = false;
let currentMode = null;
let countdownTimerObj = null;

let isGreenLightReady = false;
let greenLightTimer = null;
let tugPosition = 50;

const directionKeysP1 = ['w', 'a', 's', 'd'];
const directionKeysP2 = ['arrowup', 'arrowleft', 'arrowdown', 'arrowright'];
const arrowSymbols = { w: 'W', a: 'A', s: 'S', d: 'D', arrowup: '▲', arrowleft: '◄', arrowdown: '▼', arrowright: '►' };
let p1Pattern = [];
let p2Pattern = [];
let p1Index = 0;
let p2Index = 0;

/* ==========================================================================
   2. DOM REFERENCES & AUDIO CONTROLS
   ========================================================================== */
const landingScreen = document.getElementById('landingScreen');
const avatarScreen = document.getElementById('avatarScreen');
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');

const modeCards = document.querySelectorAll('.mode-card');
const startSetupBtn = document.getElementById('startSetupBtn');
const selectedModeSubtitle = document.getElementById('selectedModeSubtitle');
const menuBtns = document.querySelectorAll('.menu-btn');

const avatarBackBtn = document.getElementById('avatarBackBtn');
const menuBackBtn = document.getElementById('menuBackBtn');
const gameBackBtn = document.getElementById('gameBackBtn');

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

// Audio elements & helper functions
const bgMusic = document.getElementById('bgMusic');
const clickSound = document.getElementById('clickSound');
const winSound = document.getElementById('winSound');
const musicToggleBtn = document.getElementById('musicToggleBtn');

function playClick() {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
}

function playWin() {
    // Lower background music volume so win sound stands out
    bgMusic.volume = 0.2;
    winSound.currentTime = 0;
    winSound.play().catch(() => {});
}

function updateMusicUI() {
    if (bgMusic.paused) {
        musicToggleBtn.textContent = "🎵 OFF";
        musicToggleBtn.classList.add('muted');
    } else {
        musicToggleBtn.textContent = "🎵 ON";
        musicToggleBtn.classList.remove('muted');
    }
}

musicToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playClick();

    if (bgMusic.paused) {
        bgMusic.volume = 1.0; // Reset volume when turning back on
        bgMusic.play().then(() => {
            updateMusicUI();
        }).catch(err => {
            console.warn("Audio playback prevented:", err);
        });
    } else {
        bgMusic.pause();
        updateMusicUI();
    }
});

function handleFirstUserGesture() {
    window.removeEventListener('pointerdown', handleFirstUserGesture);
    window.removeEventListener('keydown', handleFirstUserGesture);
}

window.addEventListener('pointerdown', handleFirstUserGesture);
window.addEventListener('keydown', handleFirstUserGesture);

// Attach button click sounds to ALL buttons and mode selection cards globally
document.querySelectorAll('button, .mode-card').forEach(item => {
    item.addEventListener('click', () => {
        if (item !== musicToggleBtn) playClick();
    });
});

/* ==========================================================================
   3. LANDING PAGE & MODE SELECTION
   ========================================================================== */
modeCards.forEach((card) => {
    card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedGameMode = card.dataset.modeType;
        statusText.textContent = selectedGameMode === 'arcade' 
            ? "ARCADE MODE: CYCLE THROUGH 3 MINI-GAMES!" 
            : "REVERSE SNAKE MODE: CONTROL THE FOOD, RUN FOR YOUR LIFE!";
    });
});

startSetupBtn.addEventListener('click', () => {
    goToAvatarSetup();
});

function goToAvatarSetup() {
    landingScreen.classList.add('hidden');
    avatarScreen.classList.remove('hidden');
    currentScreen = 'avatar';
    statusText.textContent = "SNAP PHOTOS TO CUSTOMIZE YOUR FIGHTERS!";
    initWebcam();
    updateAvatarDisplays();
}

/* ==========================================================================
   4. BACK BUTTON HANDLERS
   ========================================================================== */
avatarBackBtn.addEventListener('click', () => {
    stopCamera();
    avatarScreen.classList.add('hidden');
    landingScreen.classList.remove('hidden');
    currentScreen = 'landing';
    statusText.textContent = 'INSERT COIN • CHOOSE YOUR DUEL MODE';
});

menuBackBtn.addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    avatarScreen.classList.remove('hidden');
    currentScreen = 'avatar';
    statusText.textContent = 'SNAP PHOTOS TO CUSTOMIZE YOUR FIGHTERS!';
    initWebcam();
});

gameBackBtn.addEventListener('click', () => {
    quitGameToMenu();
});

function quitGameToMenu() {
    clearInterval(countdownTimerObj);
    clearTimeout(greenLightTimer);
    bgMusic.volume = 1.0; // Restore full volume
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    currentScreen = 'menu';
    statusText.textContent = 'NAVIGATE WITH [W / S] • SELECT WITH [ENTER / A]';
}

/* ==========================================================================
   5. RELIABLE SVG HEAD & STICKMAN GENERATION
   ========================================================================== */
let clipIdCounter = 0;

function getHeadOnlySVG(player) {
    const isP1 = player === 1;
    const strokeColor = isP1 ? '#00f0ff' : '#ff0055';
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
    const strokeColor = isP1 ? '#00f0ff' : '#ff0055';
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
        <circle cx="50" cy="25" r="24" fill="#070913" stroke="${strokeColor}" stroke-width="3" />
        <image href="${headUrl}" x="28" y="3" width="44" height="44" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />
    </svg>`;
}

/* ==========================================================================
   6. CAMERA & AVATAR CAPTURE
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
        statusText.textContent = "CAMERA UNAVAILABLE. DEFAULT AVATARS LOADED!";
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
        statusText.textContent = "PLAYER 1 HEAD SNAPPED!";
    }
});

p2SnapBtn.addEventListener('click', () => {
    const snap = captureSnapshot(p2Video, p2Canvas);
    if (snap) {
        p2HeadSrc = snap;
        updateAvatarDisplays();
        statusText.textContent = "PLAYER 2 HEAD SNAPPED!";
    }
});

function updateAvatarDisplays() {
    const p1Preview = document.getElementById('p1PreviewSvg');
    const p2Preview = document.getElementById('p2PreviewSvg');
    const p1Card = document.getElementById('p1CardSvg');
    const p2Card = document.getElementById('p2CardSvg');

    if (p1Preview) p1Preview.innerHTML = getStickmanSVG(1, 'idle');
    if (p2Preview) p2Preview.innerHTML = getStickmanSVG(2, 'idle');
    if (p1Card) p1Card.innerHTML = getHeadOnlySVG(1);
    if (p2Card) p2Card.innerHTML = getHeadOnlySVG(2);
}

confirmAvatarsBtn.addEventListener('click', () => {
    confirmAvatarSelection();
});

function confirmAvatarSelection() {
    stopCamera();
    avatarScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    currentScreen = 'menu';
    
    selectedModeSubtitle.textContent = selectedGameMode === 'arcade' 
        ? "Arcade Mode (3 Mini-Games)" 
        : "Reverse Snake";

    statusText.textContent = 'NAVIGATE WITH [W / S] • SELECT WITH [ENTER / A]';
}

/* ==========================================================================
   7. CONTROLLER / GAMEPAD API SUPPORT
   ========================================================================== */
let prevPadState = {};

function pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const activePads = Array.from(gamepads).filter(gp => gp !== null && gp.connected);

    activePads.forEach((gp, idx) => {
        const playerNum = idx === 0 ? 1 : 2;
        processGamepadInput(gp, playerNum);
    });

    requestAnimationFrame(pollGamepads);
}

function processGamepadInput(gp, playerNum) {
    if (!gp) return;

    const padId = `pad_${gp.index}`;
    if (!prevPadState[padId]) {
        prevPadState[padId] = { up: false, down: false, left: false, right: false, action: false, start: false };
    }
    const prev = prevPadState[padId];

    const up = (gp.buttons[12] && gp.buttons[12].pressed) || (gp.axes[1] < -0.5);
    const down = (gp.buttons[13] && gp.buttons[13].pressed) || (gp.axes[1] > 0.5);
    const left = (gp.buttons[14] && gp.buttons[14].pressed) || (gp.axes[0] < -0.5);
    const right = (gp.buttons[15] && gp.buttons[15].pressed) || (gp.axes[0] > 0.5);

    const action = (gp.buttons[0] && gp.buttons[0].pressed) ||
                   (gp.buttons[1] && gp.buttons[1].pressed) ||
                   (gp.buttons[2] && gp.buttons[2].pressed) ||
                   (gp.buttons[3] && gp.buttons[3].pressed) ||
                   (gp.buttons[5] && gp.buttons[5].pressed) ||
                   (gp.buttons[7] && gp.buttons[7].pressed);

    const start = (gp.buttons[9] && gp.buttons[9].pressed);

    if (currentScreen === 'landing') {
        if ((left && !prev.left) || (right && !prev.right)) {
            selectedGameMode = selectedGameMode === 'arcade' ? 'greenlight' : 'arcade';
            modeCards.forEach(c => c.classList.toggle('selected', c.dataset.modeType === selectedGameMode));
        }
        if ((action && !prev.action) || (start && !prev.start)) {
            goToAvatarSetup();
        }
    } else if (currentScreen === 'avatar') {
        if (action && !prev.action) {
            if (playerNum === 1) p1SnapBtn.click();
            else p2SnapBtn.click();
        }
        if (start && !prev.start) {
            confirmAvatarSelection();
        }
    } else if (currentScreen === 'menu') {
        if (up && !prev.up) handleMenuNavigation('w');
        if (down && !prev.down) handleMenuNavigation('s');
        if ((action && !prev.action) || (start && !prev.start)) handleMenuNavigation('enter');
    } else if (currentScreen === 'game' && roundActive) {
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

    prevPadState[padId] = { up, down, left, right, action, start };
}

window.addEventListener('gamepadconnected', (e) => {
    statusText.textContent = `CONTROLLER DETECTED: PORT ${e.gamepad.index + 1}`;
});

requestAnimationFrame(pollGamepads);

/* ==========================================================================
   8. KEYBOARD ROUTING & MENU NAVIGATION
   ========================================================================== */
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
    }

    if (currentScreen === 'landing') {
        if (key === 'a' || key === 'arrowleft' || key === 'd' || key === 'arrowright') {
            selectedGameMode = selectedGameMode === 'arcade' ? 'greenlight' : 'arcade';
            modeCards.forEach(c => c.classList.toggle('selected', c.dataset.modeType === selectedGameMode));
        } else if (key === 'enter') {
            goToAvatarSetup();
        }
    } else if (currentScreen === 'menu') {
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
        btn.className = index === selectedMenuIndex ? "menu-btn selected" : "menu-btn";
    });
}

/* ==========================================================================
   9. MATCH & ROUND FLOW
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

    if (selectedGameMode === 'greenlight') {
        currentMode = 'green';
    } else {
        const modeList = ['green', 'tug', 'pattern'];
        currentMode = modeList[Math.floor(Math.random() * modeList.length)];
    }

    p1KeyBadge.textContent = 'KEYS: ???';
    p2KeyBadge.textContent = 'KEYS: ???';

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
        p1KeyBadge.textContent = 'KEY: [A] / PAD [A]';
        p2KeyBadge.textContent = 'KEY: [◄] / PAD [A]';
        setupGreenLight();
    } else if (currentMode === 'tug') {
        p1KeyBadge.textContent = 'MASH: [A] / PAD [A]';
        p2KeyBadge.textContent = 'MASH: [◄] / PAD [A]';
        setupTugOfWar();
    } else if (currentMode === 'pattern') {
        p1KeyBadge.textContent = 'WASD / D-PAD';
        p2KeyBadge.textContent = 'ARROWS / D-PAD';
        setupPatternMash();
    }
}

/* ==========================================================================
   10. MINI-GAME 1: GREEN LIGHT REFLEX
   ========================================================================== */
function setupGreenLight() {
    isGreenLightReady = false;
    statusText.textContent = `MODE: GREEN LIGHT REFLEX • FIRST TO ${targetScore}!`;

    playfieldContent.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:16px;">
        <div style="width:80px; height:96px; flex-shrink:0;">${getStickmanSVG(1, 'ready')}</div>
        <div id="greenBox" style="flex:1; height:128px; border-radius:8px; background-color:#0d1127; border:2px solid #1e295d; display:flex; align-items:center; justify-content:center; font-family:'Press Start 2P', cursive; font-size:0.85rem; color:#8a99c9; transition:all 0.15s ease;">
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
            box.style.fontSize = "1.1rem";
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
            awardPoint(pressedPlayer, `PLAYER ${pressedPlayer} STRUCK FIRST ON GREEN!`);
        } else {
            const recipient = pressedPlayer === 1 ? 2 : 1;
            awardPoint(recipient, `PLAYER ${pressedPlayer} JUMPED EARLY! POINT TO PLAYER ${recipient}.`);
        }
    }
}

/* ==========================================================================
   11. MINI-GAME 2: TUG-OF-WAR CLASH
   ========================================================================== */
function setupTugOfWar() {
    tugPosition = 50;
    statusText.textContent = `MODE: TUG-OF-WAR CLASH • PURE BUTTON MASHING!`;
    renderTugUI();
}

function renderTugUI() {
    const p1Offset = Math.max(-10, Math.min(60, (50 - tugPosition) * 0.9));
    const p2Offset = Math.max(-60, Math.min(10, (50 - tugPosition) * 0.9));

    playfieldContent.innerHTML = `
    <div style="width:100%; display:flex; flex-direction:column; align-items:center; gap:12px;">
        <div style="display:flex; align-items:center; justify-content:center; width:100%; position:relative; padding:0 20px;">
            
            <!-- Player 1 Stickman (Left Side) -->
            <div style="width:70px; height:90px; flex-shrink:0; transform: translateX(${p1Offset}px); z-index: 5; margin-right: -15px;">
                ${getStickmanSVG(1, 'pull')}
            </div>

            <!-- Tug of War Dual-Colored Progress Bar -->
            <div style="flex:1; height:32px; background-color:#ff0055; box-shadow: 0 0 12px rgba(255, 0, 85, 0.6); border-radius:6px; border:2px solid #1e295d; position:relative; overflow:hidden; display:flex; align-items:center;">
                <div class="tug-progress" style="height:100%; background-color:#00f0ff; box-shadow: 0 0 12px #00f0ff; width: ${100 - tugPosition}%"></div>
                <div style="position:absolute; top:0; bottom:0; width:6px; background-color:#00ff66; box-shadow: 0 0 10px #00ff66; z-index:10; transform:translateX(-50%); left: ${100 - tugPosition}%"></div>
            </div>

            <!-- Player 2 Stickman (Right Side) -->
            <div style="width:70px; height:90px; flex-shrink:0; transform: translateX(${p2Offset}px) scaleX(-1); z-index: 5; margin-left: -15px;">
                ${getStickmanSVG(2, 'pull')}
            </div>
            
        </div>

        <p style="font-family:'Press Start 2P', cursive; font-size:0.55rem; color:#8a99c9; margin-top:8px;">
            P1: MASH <span style="color:#00f0ff;">[A] / PAD BUTTON</span> | P2: MASH <span style="color:#ff0055;">[◄] / PAD BUTTON</span>
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
        awardPoint(1, "PLAYER 1 PULLED THE ROPE ALL THE WAY!");
    } else if (tugPosition >= 100) {
        awardPoint(2, "PLAYER 2 PULLED THE ROPE ALL THE WAY!");
    }
}

/* ==========================================================================
   12. MINI-GAME 3: PATTERN MASH
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

    statusText.textContent = `MODE: PATTERN MASH • MATCH THE SEQUENCE FAST!`;
    renderPatternUI();
}

function renderPatternUI() {
    playfieldContent.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%;">
        <div style="background-color:rgba(7,9,19,0.8); padding:12px; border-radius:8px; border:1px solid rgba(0,240,255,0.3); display:flex; flex-direction:column; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="width:32px; height:40px;">${getStickmanSVG(1, p1Index > 0 ? 'cheer' : 'idle')}</div>
                <span style="font-family:'Press Start 2P', cursive; font-size:0.55rem; color:#00f0ff;">P1 SEQUENCE</span>
            </div>
            <div style="display:flex; gap:6px;">
                ${p1Pattern.map((k, idx) => `
                    <div style="width:32px; height:32px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-family:'Press Start 2P', cursive; font-size:0.7rem; border:2px solid ${idx < p1Index ? '#00ff66; background-color:#00ff66; color:#000; box-shadow:0 0 10px #00ff66;' : '#1e295d; background-color:#0d1127; color:#fff;'}">
                        ${arrowSymbols[k]}
                    </div>
                `).join('')}
            </div>
        </div>

        <div style="background-color:rgba(7,9,19,0.8); padding:12px; border-radius:8px; border:1px solid rgba(255,0,85,0.3); display:flex; flex-direction:column; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="width:32px; height:40px;">${getStickmanSVG(2, p2Index > 0 ? 'cheer' : 'idle')}</div>
                <span style="font-family:'Press Start 2P', cursive; font-size:0.55rem; color:#ff0055;">P2 SEQUENCE</span>
            </div>
            <div style="display:flex; gap:6px;">
                ${p2Pattern.map((k, idx) => `
                    <div style="width:32px; height:32px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-family:'Press Start 2P', cursive; font-size:0.7rem; border:2px solid ${idx < p2Index ? '#00ff66; background-color:#00ff66; color:#000; box-shadow:0 0 10px #00ff66;' : '#1e295d; background-color:#0d1127; color:#fff;'}">
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
                awardPoint(1, "PLAYER 1 COMPLETED THEIR SEQUENCE FIRST!");
            }
        } else {
            p1Index = 0;
            statusText.textContent = "PLAYER 1 MISKEYED! SEQUENCE RESET!";
        }
        renderPatternUI();
    }

    if (directionKeysP2.includes(key)) {
        if (key === p2Pattern[p2Index]) {
            p2Index++;
            if (p2Index >= p2Pattern.length) {
                awardPoint(2, "PLAYER 2 COMPLETED THEIR SEQUENCE FIRST!");
            }
        } else {
            p2Index = 0;
            statusText.textContent = "PLAYER 2 MISKEYED! SEQUENCE RESET!";
        }
        renderPatternUI();
    }
}

/* ==========================================================================
   13. IN-GAME INPUT ROUTING & SCORING
   ========================================================================== */
function handleGameInput(key) {
    if (key === 'escape') {
        quitGameToMenu();
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
        // Play win sound and lower background music volume
        playWin();

        const winnerName = p1Score >= targetScore ? 'PLAYER 1' : 'PLAYER 2';
        const winnerNum = p1Score >= targetScore ? 1 : 2;
        const winnerColor = winnerNum === 1 ? '#00f0ff' : '#ff0055';
        
        playfieldContent.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                <div style="width:96px; height:112px;">${getStickmanSVG(winnerNum, 'cheer')}</div>
                <div style="font-family:'Press Start 2P', cursive; font-size:1.1rem; color:${winnerColor}; text-shadow:0 0 15px ${winnerColor};">${winnerName} WINS THE MATCH!</div>
            </div>`;
        statusText.textContent = 'MATCH COMPLETE! RETURNING TO MENU...';

        setTimeout(() => {
            bgMusic.volume = 1.0; // Restore full volume when returning to menu
            gameScreen.classList.add('hidden');
            landingScreen.classList.remove('hidden');
            currentScreen = 'landing';
            statusText.textContent = 'INSERT COIN • CHOOSE YOUR DUEL MODE';
        }, 3500);
    } else {
        setTimeout(() => {
            initiateNextRoundCountdown();
        }, 2000);
    }
}