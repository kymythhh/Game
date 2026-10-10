class GameObject {
    constructor(x, y, gridLimit) {
        this.x = x;
        this.y = y;
        this.gridLimit = gridLimit;
    }

    render(ctx, tileSize) {
        throw new Error("render() must be implemented by child classes");
    }
}

class Snake extends GameObject {
    constructor(x, y, gridLimit, initialDirection = { x: 1, y: 0 }) {
        super(x, y, gridLimit);
        this.dir = initialDirection;
        this.nextDir = initialDirection;
        this.segments = [
            { x: x, y: y },
            { x: (x - this.dir.x + gridLimit) % gridLimit, y: (y - this.dir.y + gridLimit) % gridLimit },
            { x: (x - this.dir.x * 2 + gridLimit) % gridLimit, y: (y - this.dir.y * 2 + gridLimit) % gridLimit }
        ];
        this.stunTicks = 0;
        this.score = 0;
    }

    setDirection(direction) {
        if (this.dir.x + direction.x !== 0 || this.dir.y + direction.y !== 0) {
            this.nextDir = direction;
        }
    }

    update() {
        if (this.stunTicks > 0) {
            this.stunTicks--;
            return false;
        }

        this.dir = { ...this.nextDir };
        const head = {
            x: (this.segments[0].x + this.dir.x + this.gridLimit) % this.gridLimit,
            y: (this.segments[0].y + this.dir.y + this.gridLimit) % this.gridLimit
        };

        const hitSelf = this.segments.slice(1).some(seg => seg.x === head.x && seg.y === head.y);
        if (hitSelf) {
            this.stunTicks = 12;
            return false;
        }

        this.segments.unshift(head);
        this.x = head.x;
        this.y = head.y;
        return true;
    }

    occupies(x, y) {
        return this.segments.some(seg => seg.x === x && seg.y === y);
    }

    grow() {
        this.score += 50;
    }

    shrinkAndStun() {
        this.score = Math.max(0, this.score - 10);
        this.stunTicks = 15;
        if (this.segments.length > 3) {
            this.segments.splice(Math.max(3, this.segments.length - 3));
        }
    }

    popTail() {
        this.segments.pop();
    }

    render(ctx, tileSize) {
        const isStunned = this.stunTicks > 0;

        this.segments.forEach((seg, i) => {
            const px = seg.x * tileSize;
            const py = seg.y * tileSize;

            if (i === 0) {
                // HEAD: Emerald/Lime base with directional eye pixels
                ctx.fillStyle = isStunned ? "#90e0ef" : "#10c946";
                ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 2);

                // Darker green border band
                ctx.fillStyle = isStunned ? "#48cae4" : "#0aa335";
                ctx.fillRect(px + 2, py + 2, tileSize - 4, 3);

                // Red Eye/Tongue pixels oriented to movement direction
                ctx.fillStyle = "#ff2233";
                if (this.dir.x === 1) {
                    ctx.fillRect(px + tileSize - 5, py + 4, 3, 3);
                    ctx.fillRect(px + tileSize - 5, py + tileSize - 7, 3, 3);
                } else if (this.dir.x === -1) {
                    ctx.fillRect(px + 2, py + 4, 3, 3);
                    ctx.fillRect(px + 2, py + tileSize - 7, 3, 3);
                } else if (this.dir.y === -1) {
                    ctx.fillRect(px + 4, py + 2, 3, 3);
                    ctx.fillRect(px + tileSize - 7, py + 2, 3, 3);
                } else {
                    ctx.fillRect(px + 4, py + tileSize - 5, 3, 3);
                    ctx.fillRect(px + tileSize - 7, py + tileSize - 5, 3, 3);
                }
            } else if (i === this.segments.length - 1) {
                // TAIL: Deep blue tapered tip
                ctx.fillStyle = isStunned ? "#0077b6" : "#1a60e0";
                ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
            } else {
                // BODY: Alternating green outer scales + central cyan/blue spine
                const ratio = i / this.segments.length;
                ctx.fillStyle = (i % 2 === 0) ? "#12bd45" : "#0da83c";
                ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 2);

                ctx.fillStyle = ratio > 0.5 ? "#1a7fe0" : "#00b4d8";
                if (this.dir.x !== 0) {
                    ctx.fillRect(px, py + Math.floor(tileSize / 2) - 2, tileSize, 4);
                } else {
                    ctx.fillRect(px + Math.floor(tileSize / 2) - 2, py, 4, tileSize);
                }
            }
        });
    }
}

class Fruit extends GameObject {
    constructor(x, y, gridLimit) {
        super(x, y, gridLimit);
        this.dir = { x: 0, y: 0 };
        this.nextDir = { x: 0, y: 0 };
        this.score = 0;
        this.trapsAvailable = 0;
        this.invulnerableTicks = 0;
    }

    setDirection(direction) {
        this.nextDir = direction;
    }

    update() {
        this.dir = { ...this.nextDir };
        this.x = (this.x + this.dir.x + this.gridLimit) % this.gridLimit;
        this.y = (this.y + this.dir.y + this.gridLimit) % this.gridLimit;

        if (this.invulnerableTicks > 0) {
            this.invulnerableTicks--;
        }
    }

    respawn(forbiddenCheck = () => false) {
        let candidate;
        let attempts = 0;
        do {
            candidate = {
                x: Math.floor(Math.random() * this.gridLimit),
                y: Math.floor(Math.random() * this.gridLimit)
            };
            attempts++;
        } while (forbiddenCheck(candidate.x, candidate.y) && attempts < 100);

        this.x = candidate.x;
        this.y = candidate.y;
        this.invulnerableTicks = 15;
    }

    collectSeed() {
        this.score += 10;
        this.trapsAvailable++;
    }

    createTrap() {
        if (this.trapsAvailable <= 0) return null;
        this.trapsAvailable--;
        return new Trap(this.x, this.y, this.gridLimit, 150);
    }

    render(ctx, tileSize) {
        if (this.invulnerableTicks % 4 >= 2) return;

        const px = this.x * tileSize;
        const py = this.y * tileSize;

        // PROCEDURAL PIXEL APPLE (Full-tile matching fruit.png anatomy)
        ctx.fillStyle = "#0a0a10";
        ctx.fillRect(px + 2, py + 4, tileSize - 4, tileSize - 5);

        ctx.fillStyle = "#d61c28";
        ctx.fillRect(px + 3, py + 5, tileSize - 6, tileSize - 7);

        ctx.fillStyle = "#9e0d17";
        ctx.fillRect(px + 4, py + tileSize - 4, tileSize - 8, 2);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px + 5, py + 7, 3, 3);
        ctx.fillRect(px + 8, py + 8, 2, 2);

        ctx.fillStyle = "#7a3e14";
        ctx.fillRect(px + 9, py + 2, 2, 3);

        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(px + 5, py + 1, 4, 3);
        ctx.fillStyle = "#1e824c";
        ctx.fillRect(px + 4, py + 2, 2, 2);
    }
}

class Seed extends GameObject {
    constructor(x, y, gridLimit) {
        super(x, y, gridLimit);
    }

    render(ctx, tileSize) {
        const px = this.x * tileSize;
        const py = this.y * tileSize;

        // PROCEDURAL PIXEL ORB (Full-tile matching orb.png anatomy)
        ctx.fillStyle = "#28346e";
        ctx.fillRect(px + 3, py + 2, tileSize - 6, tileSize - 4);
        ctx.fillRect(px + 2, py + 3, tileSize - 4, tileSize - 6);

        ctx.fillStyle = "#c2dcff";
        ctx.fillRect(px + 4, py + 3, tileSize - 8, tileSize - 6);
        ctx.fillRect(px + 3, py + 4, tileSize - 6, tileSize - 8);

        ctx.fillStyle = "#7aa7e8";
        ctx.fillRect(px + 4, py + tileSize - 5, tileSize - 8, 2);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px + 7, py + 4, 5, 2);
        ctx.fillRect(px + 12, py + 5, 2, 4);
        ctx.fillRect(px + 13, py + 7, 2, 3);
        ctx.fillRect(px + 8, py + tileSize - 5, 4, 2);
    }
}

class Trap extends GameObject {
    constructor(x, y, gridLimit, duration = 150) {
        super(x, y, gridLimit);
        this.duration = duration;
    }

    update() {
        this.duration--;
        return this.duration > 0;
    }

    render(ctx, tileSize) {
        const px = this.x * tileSize;
        const py = this.y * tileSize;

        ctx.fillStyle = "#8338ec";
        ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);

        ctx.strokeStyle = "#c77dff";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
    }
}

class ReverseSnakeGameManager {
    constructor(canvas, trapDisplayEl, onScoreUpdate, onRoundEnd) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.trapDisplayEl = trapDisplayEl;
        this.onScoreUpdate = onScoreUpdate;
        this.onRoundEnd = onRoundEnd;

        this.tileSize = 20;
        this.gridLimit = Math.floor(canvas.width / this.tileSize);

        this.snake = null;
        this.fruit = null;
        this.seeds = [];
        this.traps = [];

        this.init();
    }

    init() {
        const snakeHead = {
            x: Math.floor(Math.random() * (this.gridLimit - 6)) + 3,
            y: Math.floor(Math.random() * (this.gridLimit - 6)) + 3
        };
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];
        const randomSnakeDir = directions[Math.floor(Math.random() * directions.length)];
        this.snake = new Snake(snakeHead.x, snakeHead.y, this.gridLimit, randomSnakeDir);

        let fruitSpawn;
        let attempts = 0;
        do {
            fruitSpawn = {
                x: Math.floor(Math.random() * this.gridLimit),
                y: Math.floor(Math.random() * this.gridLimit)
            };
            const distance = Math.hypot(fruitSpawn.x - snakeHead.x, fruitSpawn.y - snakeHead.y);
            attempts++;
            if (distance >= 5 && !this.snake.occupies(fruitSpawn.x, fruitSpawn.y)) {
                break;
            }
        } while (attempts < 100);

        this.fruit = new Fruit(fruitSpawn.x, fruitSpawn.y, this.gridLimit);
        this.traps = [];
        this.seeds = [];
        this.spawnSeeds(3);

        this.updateHUD();
        this.render();
    }

    spawnSeeds(targetCount) {
        while (this.seeds.length < targetCount) {
            const candidate = {
                x: Math.floor(Math.random() * this.gridLimit),
                y: Math.floor(Math.random() * this.gridLimit)
            };

            const collidesWithSnake = this.snake.occupies(candidate.x, candidate.y);
            const collidesWithFruit = this.fruit.x === candidate.x && this.fruit.y === candidate.y;
            const collidesWithTraps = this.traps.some(t => t.x === candidate.x && t.y === candidate.y);

            if (!collidesWithSnake && !collidesWithFruit && !collidesWithTraps) {
                this.seeds.push(new Seed(candidate.x, candidate.y, this.gridLimit));
            }
        }
    }

    step() {
        this.fruit.update();

        const seedIndex = this.seeds.findIndex(s => s.x === this.fruit.x && s.y === this.fruit.y);
        if (seedIndex !== -1) {
            this.seeds.splice(seedIndex, 1);
            this.fruit.collectSeed();
            this.spawnSeeds(3);
        }

        const moved = this.snake.update();

        let caughtFruit = false;
        if (this.fruit.invulnerableTicks === 0 && this.snake.occupies(this.fruit.x, this.fruit.y)) {
            this.snake.grow();
            this.fruit.respawn((rx, ry) => this.snake.occupies(rx, ry));
            caughtFruit = true;
        }

        if (moved && !caughtFruit) {
            this.snake.popTail();
        }

        if (moved) {
            const trapHitIndex = this.traps.findIndex(t => t.x === this.snake.x && t.y === this.snake.y);
            if (trapHitIndex !== -1) {
                this.traps.splice(trapHitIndex, 1);
                this.fruit.score += 20;
                this.snake.shrinkAndStun();
            }
        }

        this.traps = this.traps.filter(trap => trap.update());

        this.updateHUD();
        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = "rgba(30, 41, 93, 0.4)";
        for (let i = 0; i < this.canvas.width; i += this.tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }

        this.seeds.forEach(seed => seed.render(this.ctx, this.tileSize));
        this.traps.forEach(trap => trap.render(this.ctx, this.tileSize));
        this.snake.render(this.ctx, this.tileSize);
        this.fruit.render(this.ctx, this.tileSize);
    }

    updateHUD() {
        if (this.trapDisplayEl) {
            this.trapDisplayEl.textContent = `P2 TRAPS: ${this.fruit.trapsAvailable}`;
        }
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.snake.score, this.fruit.score);
        }
    }

    handleInput(key) {
        if (key === 'w') this.snake.setDirection({ x: 0, y: -1 });
        if (key === 's') this.snake.setDirection({ x: 0, y: 1 });
        if (key === 'a') this.snake.setDirection({ x: -1, y: 0 });
        if (key === 'd') this.snake.setDirection({ x: 1, y: 0 });

        if (key === 'arrowup') this.fruit.setDirection({ x: 0, y: -1 });
        if (key === 'arrowdown') this.fruit.setDirection({ x: 0, y: 1 });
        if (key === 'arrowleft') this.fruit.setDirection({ x: -1, y: 0 });
        if (key === 'arrowright') this.fruit.setDirection({ x: 1, y: 0 });

        if (key === 'shift' || key === 'enter') {
            const newTrap = this.fruit.createTrap();
            if (newTrap) {
                this.traps.push(newTrap);
                this.updateHUD();
            }
        }
    }
}

let currentScreen = 'avatar';
let selectedGameMode = 'arcade';
let selectedMenuIndex = 0;
let targetScore = 3;
let cameraStream = null;

let swapControllers = false;

let isGamePaused = false;

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

let snakeGameInstance = null;
let snakeGameLoopInterval = null;
let snakeRoundTimerInterval = null;
let snakePassiveInterval = null;
let snakeTimeRemaining = 60;

const landingScreen = document.getElementById('landingScreen');
const avatarScreen = document.getElementById('avatarScreen');
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');

const modeCards = document.querySelectorAll('.mode-card');
const startSetupBtn = document.getElementById('startSetupBtn');
const selectedModeSubtitle = document.getElementById('selectedModeSubtitle');
const menuScreenTitle = document.getElementById('menuScreenTitle');
const scoreOptionsContainer = document.getElementById('scoreOptions');

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

const p1PadBadge = document.getElementById('p1PadBadge');
const p2PadBadge = document.getElementById('p2PadBadge');
const padSwapBtn = document.getElementById('padSwapBtn');

const countdownOverlay = document.getElementById('countdownOverlay');
const countdownTimer = document.getElementById('countdownTimer');
const countdownLabel = document.getElementById('countdownLabel');

const pauseOverlay = document.getElementById('pauseOverlay');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');

const playfieldContent = document.getElementById('playfieldContent');
const statusText = document.getElementById('status');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const p1KeyBadge = document.getElementById('p1KeyBadge');
const p2KeyBadge = document.getElementById('p2KeyBadge');
const centerDividerLabel = document.getElementById('centerDividerLabel');
const matchTimerBox = document.getElementById('matchTimerBox');
const matchTimerNum = document.getElementById('matchTimerNum');

const bgMusic = document.getElementById('bgMusic');
const clickSound = document.getElementById('clickSound');
const winSound = document.getElementById('winSound');
const musicToggleBtn = document.getElementById('musicToggleBtn');

function playClick() {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => { });
}

function playWin() {
    bgMusic.volume = 0.2;
    winSound.currentTime = 0;
    winSound.play().catch(() => { });
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
        bgMusic.volume = 1.0;goToMenu
        bgMusic.play().then(updateMusicUI).catch(err => console.warn(err));
    } else {
        bgMusic.pause();
        updateMusicUI();
    }
});

function toggleControllerAssignment() {
    playClick();
    swapControllers = !swapControllers;
    updatePadUI();
}

function updatePadUI() {
    if (swapControllers) {
        padSwapBtn.textContent = "🎮 PAD: P1=PORT2";
        if (p1PadBadge) p1PadBadge.textContent = "PAD 2";
        if (p2PadBadge) p2PadBadge.textContent = "PAD 1";
        statusText.textContent = "CONTROLLERS SWAPPED: P1 = PORT 2, P2 = PORT 1";
    } else {
        padSwapBtn.textContent = "🎮 PAD: P1=PORT1";
        if (p1PadBadge) p1PadBadge.textContent = "PAD 1";
        if (p2PadBadge) p2PadBadge.textContent = "PAD 2";
        statusText.textContent = "CONTROLLERS DEFAULT: P1 = PORT 1, P2 = PORT 2";
    }
}

padSwapBtn.addEventListener('click', toggleControllerAssignment);

function handleFirstUserGesture() {
    window.removeEventListener('pointerdown', handleFirstUserGesture);
    window.removeEventListener('keydown', handleFirstUserGesture);
}
window.addEventListener('pointerdown', handleFirstUserGesture);
window.addEventListener('keydown', handleFirstUserGesture);

document.querySelectorAll('button, .mode-card').forEach(item => {
    item.addEventListener('click', () => {
        if (item !== musicToggleBtn && item !== padSwapBtn) playClick();
    });
});

window.addEventListener('DOMContentLoaded', () => {
    initWebcam();
    updateAvatarDisplays();
});

function togglePauseGame() {
    if (currentScreen !== 'game' || !roundActive) return;

    isGamePaused = !isGamePaused;
    playClick();

    if (isGamePaused) {
        pauseOverlay.classList.remove('hidden');
        statusText.textContent = "MATCH PAUSED";
    } else {
        pauseOverlay.classList.add('hidden');
        statusText.textContent = selectedGameMode === 'reversesnake'
            ? "MODE: REVERSE SNAKE • SURVIVE UNTIL THE TIMER ENDS!"
            : `MODE: ${currentMode.toUpperCase()}`;
    }
}

pauseBtn.addEventListener('click', togglePauseGame);
resumeBtn.addEventListener('click', togglePauseGame);

modeCards.forEach((card) => {
    card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedGameMode = card.dataset.modeType;
        statusText.textContent = selectedGameMode === 'arcade'
            ? "ARCADE MODE: CYCLE THROUGH 3 MINI-GAMES!"
            : "REVERSE SNAKE MODE: TIMED SURVIVAL SHOWDOWN!";
    });
});

startSetupBtn.addEventListener('click', () => {
    goToMenuScreen();
});

function goToMenuScreen() {
    landingScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    currentScreen = 'menu';

    if (selectedGameMode === 'reversesnake') {
        menuScreenTitle.textContent = "SELECT ROUND TIMER";
        selectedModeSubtitle.textContent = "Timed Arena Survival Match";
        scoreOptionsContainer.innerHTML = `
            <button class="menu-btn" data-value="30">30 SECONDS BLITZ</button>
            <button class="menu-btn selected" data-value="60">60 SECONDS (1 MIN)</button>
            <button class="menu-btn" data-value="90">90 SECONDS ENDURANCE</button>
        `;
    } else {
        menuScreenTitle.textContent = "SELECT TARGET SCORE";
        selectedModeSubtitle.textContent = "Arcade Mode (3 Mini-Games)";
        scoreOptionsContainer.innerHTML = `
            <button class="menu-btn selected" data-value="3">FIRST TO 3 POINTS</button>
            <button class="menu-btn" data-value="5">FIRST TO 5 POINTS</button>
            <button class="menu-btn" data-value="7">FIRST TO 7 POINTS</button>
        `;
    }

    selectedMenuIndex = 1;
    bindMenuButtons();
    statusText.textContent = 'NAVIGATE WITH [W / S] • SELECT WITH [ENTER / A]';
}

function goToAvatarSetup() {
    landingScreen.classList.add('hidden');
    avatarScreen.classList.remove('hidden');
    currentScreen = 'avatar';
    statusText.textContent = "SNAP PHOTOS TO CUSTOMIZE YOUR FIGHTERS!";
    initWebcam();
    updateAvatarDisplays();
    updatePadUI();
}

avatarBackBtn.addEventListener('click', () => {
    landingScreen.classList.add('hidden');
    avatarScreen.classList.remove('hidden');
    currentScreen = 'avatar';
    statusText.textContent = 'SNAP PHOTOS TO CUSTOMIZE YOUR FIGHTERS!';
    initWebcam();
});

menuBackBtn.addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    landingScreen.classList.remove('hidden');
    currentScreen = 'landing';
    statusText.textContent = 'CHOOSE YOUR DUEL MODE!';
});

gameBackBtn.addEventListener('click', () => {
    quitGameToMenu();
});

function quitGameToMenu() {
    isGamePaused = false;
    pauseOverlay.classList.add('hidden');
    clearInterval(countdownTimerObj);
    clearTimeout(greenLightTimer);
    stopSnakeLoops();
    bgMusic.volume = 1.0;
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    currentScreen = 'menu';
    statusText.textContent = 'NAVIGATE WITH [W / S] • SELECT WITH [ENTER / A]';
}

function stopSnakeLoops() {
    clearInterval(snakeGameLoopInterval);
    clearInterval(snakeRoundTimerInterval);
    clearInterval(snakePassiveInterval);
}

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
        <line x1="50" y1="48" x2="50" y2="75" class="stick-line" stroke="${strokeColor}" stroke-width="6" />
        <line x1="50" y1="55" ${armLeft} class="stick-line" stroke="${strokeColor}" stroke-width="6" />
        <line x1="50" y1="55" ${armRight} class="stick-line" stroke="${strokeColor}" stroke-width="6" />
        <g stroke="${strokeColor}" stroke-width="6">${legs}</g>
        <circle cx="50" cy="25" r="24" fill="#070913" stroke="${strokeColor}" stroke-width="3" />
        <image href="${headUrl}" x="28" y="3" width="44" height="44" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />
    </svg>`;
}

async function initWebcam() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 300 }, height: { ideal: 300 }, facingMode: "user" },
            audio: false
        });
        p1Video.srcObject = cameraStream;
        p2Video.srcObject = cameraStream;
    } catch (err) {
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
    landingScreen.classList.remove('hidden');
    currentScreen = 'landing';
    statusText.textContent = 'CHOOSE YOUR DUEL MODE!';
}

function bindMenuButtons() {
    const btns = document.querySelectorAll('.menu-btn');
    btns.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            selectedMenuIndex = idx;
            updateMenuSelection();
            targetScore = parseInt(btn.dataset.value);
            startGame();
        });
    });
}

function handleMenuNavigation(key) {
    const btns = document.querySelectorAll('.menu-btn');
    if (key === 'w' || key === 'arrowup') {
        selectedMenuIndex = (selectedMenuIndex - 1 + btns.length) % btns.length;
        updateMenuSelection();
    } else if (key === 's' || key === 'arrowdown') {
        selectedMenuIndex = (selectedMenuIndex + 1) % btns.length;
        updateMenuSelection();
    } else if (key === 'enter') {
        targetScore = parseInt(btns[selectedMenuIndex].dataset.value);
        startGame();
    }
}

function updateMenuSelection() {
    const btns = document.querySelectorAll('.menu-btn');
    btns.forEach((btn, index) => {
        btn.className = index === selectedMenuIndex ? "menu-btn selected" : "menu-btn";
    });
}

let prevPadState = {};

function pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const activePads = Array.from(gamepads).filter(gp => gp !== null && gp.connected);

    activePads.forEach((gp) => {
        let playerNum = (gp.index === 0) ? 1 : 2;
        if (swapControllers) {
            playerNum = (gp.index === 0) ? 2 : 1;
        }

        processGamepadInput(gp, playerNum);
    });

    requestAnimationFrame(pollGamepads);
}

function processGamepadInput(gp, playerNum) {
    if (!gp) return;
    const padId = `pad_${gp.index}`;
    if (!prevPadState[padId]) {
        prevPadState[padId] = { up: false, down: false, left: false, right: false, action: false, start: false, select: false };
    }
    const prev = prevPadState[padId];

    const up = (gp.buttons[12] && gp.buttons[12].pressed) || (gp.axes[1] < -0.5);
    const down = (gp.buttons[13] && gp.buttons[13].pressed) || (gp.axes[1] > 0.5);
    const left = (gp.buttons[14] && gp.buttons[14].pressed) || (gp.axes[0] < -0.5);
    const right = (gp.buttons[15] && gp.buttons[15].pressed) || (gp.axes[0] > 0.5);
    const action = (gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[1] && gp.buttons[1].pressed);
    const start = (gp.buttons[9] && gp.buttons[9].pressed);
    const select = (gp.buttons[8] && gp.buttons[8].pressed);

    if (select && !prev.select) {
        toggleControllerAssignment();
    }

    if (currentScreen === 'landing') {
        if ((left && !prev.left) || (right && !prev.right)) {
            selectedGameMode = selectedGameMode === 'arcade' ? 'reversesnake' : 'arcade';
            modeCards.forEach(c => c.classList.toggle('selected', c.dataset.modeType === selectedGameMode));
        }
        if ((action && !prev.action) || (start && !prev.start)) goToAvatarSetup();
    } else if (currentScreen === 'avatar') {
        if (action && !prev.action) {
            if (playerNum === 1) p1SnapBtn.click();
            else p2SnapBtn.click();
        }
        if (start && !prev.start) confirmAvatarSelection();
    } else if (currentScreen === 'menu') {
        if (up && !prev.up) handleMenuNavigation('w');
        if (down && !prev.down) handleMenuNavigation('s');
        if ((action && !prev.action) || (start && !prev.start)) handleMenuNavigation('enter');
    } else if (currentScreen === 'game') {
        if (start && !prev.start) {
            togglePauseGame();
        }

        if (!isGamePaused && roundActive) {
            if (selectedGameMode === 'reversesnake') {
                if (playerNum === 1) {
                    if (up && !prev.up) snakeGameInstance.handleInput('w');
                    if (down && !prev.down) snakeGameInstance.handleInput('s');
                    if (left && !prev.left) snakeGameInstance.handleInput('a');
                    if (right && !prev.right) snakeGameInstance.handleInput('d');
                } else if (playerNum === 2) {
                    if (up && !prev.up) snakeGameInstance.handleInput('arrowup');
                    if (down && !prev.down) snakeGameInstance.handleInput('arrowdown');
                    if (left && !prev.left) snakeGameInstance.handleInput('arrowleft');
                    if (right && !prev.right) snakeGameInstance.handleInput('arrowright');
                    if (action && !prev.action) snakeGameInstance.handleInput('enter');
                }
            } else {
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
        }
    }

    prevPadState[padId] = { up, down, left, right, action, start, select };
}
requestAnimationFrame(pollGamepads);

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
    }

    if (key === 'p' && currentScreen === 'game') {
        togglePauseGame();
        return;
    }

    if (currentScreen === 'avatar') {
        if (action && !prev.action) {
            if (playerNum === 1) p1SnapBtn.click();
            else p2SnapBtn.click();
        }
        if (start && !prev.start) {
            confirmAvatarSelection();
        }
    } else if (currentScreen === 'landing') {
        if ((left && !prev.left) || (right && !prev.right)) {
            selectedGameMode = selectedGameMode === 'arcade' ? 'greenlight' : 'arcade';
            modeCards.forEach(c => c.classList.toggle('selected', c.dataset.modeType === selectedGameMode));
        }
        if ((action && !prev.action) || (start && !prev.start)) {
            goToMenuScreen();
        }
    }
});

function handleGameInput(key) {
    if (key === 'escape') {
        quitGameToMenu();
        return;
    }

    if (!roundActive || isGamePaused) return;

    if (selectedGameMode === 'reversesnake') {
        if (snakeGameInstance) snakeGameInstance.handleInput(key);
    } else {
        if (currentMode === 'green') handleGreenInput(key);
        else if (currentMode === 'tug') handleTugInput(key);
        else if (currentMode === 'pattern') handlePatternInput(key);
    }
}

function startGame() {
    p1Score = 0;
    p2Score = 0;
    score1El.textContent = p1Score;
    score2El.textContent = p2Score;
    isGamePaused = false;
    pauseOverlay.classList.add('hidden');

    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    currentScreen = 'game';

    if (selectedGameMode === 'reversesnake') {
        setupReverseSnakeMatch();
    } else {
        matchTimerBox.classList.add('hidden');
        centerDividerLabel.classList.remove('hidden');
        initiateNextRoundCountdown();
    }
}

function setupReverseSnakeMatch() {
    roundActive = false;
    isGamePaused = false;
    pauseOverlay.classList.add('hidden');

    centerDividerLabel.classList.add('hidden');
    matchTimerBox.classList.remove('hidden');

    snakeTimeRemaining = targetScore;
    matchTimerNum.textContent = snakeTimeRemaining;

    p1KeyBadge.textContent = 'WASD (SNAKE)';
    p2KeyBadge.textContent = 'ARROWS+SHIFT (FRUIT)';

    playfieldContent.innerHTML = `
        <div class="snake-arena-wrapper">
            <canvas id="snakeCanvas" class="snake-game-canvas" width="340" height="340"></canvas>
            <div id="trapChargesDisplay" class="snake-trap-indicator">P2 TRAPS: 0</div>
        </div>
    `;

    const canvas = document.getElementById('snakeCanvas');
    const trapDisplay = document.getElementById('trapChargesDisplay');

    snakeGameInstance = new ReverseSnakeGameManager(
        canvas,
        trapDisplay,
        (snakeScore, fruitScore) => {
            p1Score = snakeScore;
            p2Score = fruitScore;
            score1El.textContent = p1Score;
            score2El.textContent = p2Score;
        }
    );

    statusText.textContent = `MODE: REVERSE SNAKE • SURVIVE UNTIL THE TIMER ENDS!`;

    countdownOverlay.classList.remove('hidden');
    countdownLabel.textContent = "SHOWDOWN IN";
    let count = 3;
    countdownTimer.textContent = count;

    clearInterval(countdownTimerObj);
    countdownTimerObj = setInterval(() => {
        count--;
        if (count > 0) {
            countdownTimer.textContent = count;
        } else if (count === 0) {
            countdownTimer.textContent = "RUN!";
        } else {
            clearInterval(countdownTimerObj);
            countdownOverlay.classList.add('hidden');
            startReverseSnakeEngine();
        }
    }, 1000);
}

function startReverseSnakeEngine() {
    roundActive = true;
    stopSnakeLoops();

    snakeGameLoopInterval = setInterval(() => {
        if (roundActive && !isGamePaused && snakeGameInstance) {
            snakeGameInstance.step();
        }
    }, 100);

    snakePassiveInterval = setInterval(() => {
        if (roundActive && !isGamePaused && snakeGameInstance) {
            snakeGameInstance.fruit.score += 1;
            snakeGameInstance.updateHUD();
        }
    }, 1000);

    snakeRoundTimerInterval = setInterval(() => {
        if (!roundActive || isGamePaused) return;
        snakeTimeRemaining--;
        matchTimerNum.textContent = snakeTimeRemaining;

        if (snakeTimeRemaining <= 0) {
            endReverseSnakeMatch();
        }
    }, 1000);
}

function endReverseSnakeMatch() {
    roundActive = false;
    stopSnakeLoops();
    playWin();

    let winnerNum = 0;
    let winnerName = "IT'S A TIE";
    let winnerColor = "#00ff66";

    if (p1Score > p2Score) {
        winnerNum = 1;
        winnerName = "PLAYER 1 (SNAKE)";
        winnerColor = "#00f0ff";
    } else if (p2Score > p1Score) {
        winnerNum = 2;
        winnerName = "PLAYER 2 (FRUIT)";
        winnerColor = "#ff0055";
    }

    playfieldContent.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <div style="width:96px; height:112px;">${winnerNum > 0 ? getStickmanSVG(winnerNum, 'cheer') : ''}</div>
            <div style="font-family:'Press Start 2P', cursive; font-size:1rem; color:${winnerColor}; text-shadow:0 0 15px ${winnerColor};">${winnerName} WINS!</div>
            <div style="font-family:'Press Start 2P', cursive; font-size:0.65rem; color:#8a99c9; margin-top:4px;">FINAL: ${p1Score} - ${p2Score}</div>
        </div>
    `;

    statusText.textContent = 'MATCH COMPLETE! RETURNING TO MENU...';

    setTimeout(() => {
        bgMusic.volume = 1.0;
        gameScreen.classList.add('hidden');
        landingScreen.classList.remove('hidden');
        currentScreen = 'landing';
        statusText.textContent = 'INSERT COIN • CHOOSE YOUR DUEL MODE';
    }, 4000);
}

function initiateNextRoundCountdown() {
    roundActive = false;
    isGamePaused = false;
    pauseOverlay.classList.add('hidden');
    clearTimeout(greenLightTimer);

    const modeList = ['green', 'tug', 'pattern'];
    currentMode = modeList[Math.floor(Math.random() * modeList.length)];

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
        if (!roundActive || currentMode !== 'green' || isGamePaused) return;
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
            <div style="width:70px; height:90px; flex-shrink:0; transform: translateX(${p1Offset}px); z-index: 5; margin-right: -15px;">
                ${getStickmanSVG(1, 'pull')}
            </div>
            <div style="flex:1; height:32px; background-color:#ff0055; box-shadow: 0 0 12px rgba(255, 0, 85, 0.6); border-radius:6px; border:2px solid #1e295d; position:relative; overflow:hidden; display:flex; align-items:center;">
                <div class="tug-progress" style="height:100%; background-color:#00f0ff; box-shadow: 0 0 12px #00f0ff; width: ${100 - tugPosition}%"></div>
                <div style="position:absolute; top:0; bottom:0; width:6px; background-color:#00ff66; box-shadow: 0 0 10px #00ff66; z-index:10; transform:translateX(-50%); left: ${100 - tugPosition}%"></div>
            </div>
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
    if (key === 'a') tugPosition = Math.max(0, tugPosition - 4);
    else if (key === 'arrowleft') tugPosition = Math.min(100, tugPosition + 4);

    renderTugUI();

    if (tugPosition <= 0) awardPoint(1, "PLAYER 1 PULLED THE ROPE ALL THE WAY!");
    else if (tugPosition >= 100) awardPoint(2, "PLAYER 2 PULLED THE ROPE ALL THE WAY!");
}

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
            if (p1Index >= p1Pattern.length) awardPoint(1, "PLAYER 1 COMPLETED SEQUENCE FIRST!");
        } else {
            p1Index = 0;
            statusText.textContent = "PLAYER 1 MISKEYED! RESET!";
        }
        renderPatternUI();
    }

    if (directionKeysP2.includes(key)) {
        if (key === p2Pattern[p2Index]) {
            p2Index++;
            if (p2Index >= p2Pattern.length) awardPoint(2, "PLAYER 2 COMPLETED SEQUENCE FIRST!");
        } else {
            p2Index = 0;
            statusText.textContent = "PLAYER 2 MISKEYED! RESET!";
        }
        renderPatternUI();
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
            bgMusic.volume = 1.0;
            gameScreen.classList.add('hidden');
            avatarScreen.classList.remove('hidden');
            currentScreen = 'landing';
            statusText.textContent = 'INSERT COIN • CHOOSE YOUR DUEL MODE';
        }, 3500);
    } else {
        setTimeout(initiateNextRoundCountdown, 2000);
    }
}