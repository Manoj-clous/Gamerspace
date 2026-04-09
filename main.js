/**
 * GamerSpace | Mini-Games Hub
 * Main Controller & Particle Engine
 */

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const DINO_GROUND_Y = CANVAS_HEIGHT - 60;
const COMBO_TIMEOUT = 500;

// --- Global State ---
let canvas, ctx;
let activeGame = 'dino';
let gameState = null;
let gameLoopId = null;
let highScore = { dino: 0, flappy: 0 };
let lastTimestamp = 0;

// --- Particle Engine ---
class Particle {
    constructor(x, y, color, speedX, speedY, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speedX = speedX;
        this.speedY = speedY;
        this.life = life;
        this.maxLife = life;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += 0.1; // gravity
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Emitter {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 6;
            const vy = (Math.random() - 0.5) * 6 - 2;
            this.particles.push(new Particle(x, y, color, vx, vy, 30 + Math.random() * 20));
        }
    }

    update() {
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update());
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}

const emitter = new Emitter();
const rohithImg = new Image();
rohithImg.src = 'rohith.jpg';

// --- Sound Manager (Logic Bridge) ---
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    play(name) {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        if (name === 'jump') {
            // Water Droplet / Plop Sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (name === 'score') {
            // Bubble / Pop Sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (name === 'flap') {
            // Futuristic Synth / Laser Flap
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (name === 'gameOver') {
            // Deep Thud
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

const sounds = new SoundManager();

// --- UI Logic ---
window.onload = () => {
    // Detect if we are on the Play page or Hub
    const urlParams = new URLSearchParams(window.location.search);
    const gameParam = urlParams.get('game');

    canvas = document.getElementById('gameCanvasFull') || document.getElementById('gameCanvas');
    if (!canvas) return; // Not on a page with a canvas

    ctx = canvas.getContext('2d');
    
    // Scale canvas to fit if on full-window mode
    if (canvas.id === 'gameCanvasFull') {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    } else {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }

    // Fetch scores from C Backend
    Promise.all([
        fetch('http://localhost:3000/api/score?game=dino').then(r => r.json()),
        fetch('http://localhost:3000/api/score?game=flappy').then(r => r.json())
    ]).then(([dinoRes, flappyRes]) => {
        if (!dinoRes.error) highScore.dino = dinoRes.score;
        if (!flappyRes.error) highScore.flappy = flappyRes.score;
        updateHighScoreUI();
    }).catch(e => console.log('Backend load error', e));

    setupInput();
    
    if (gameParam) {
        selectGame(gameParam);
    } else {
        // Default behavior for index.html if it still had a canvas
        selectGame('dino');
    }
    
    startTimeCycle();
};

function resizeCanvas() {
    const wrapper = canvas.parentElement;
    const padding = 40;
    const availableWidth = wrapper.clientWidth - padding;
    const availableHeight = wrapper.clientHeight - padding;
    
    // Maintain aspect ratio 2:1
    let w = availableWidth;
    let h = w / 2;
    
    if (h > availableHeight) {
        h = availableHeight;
        w = h * 2;
    }
    
    canvas.width = 800; // Native resolution
    canvas.height = 400;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            handleInput('jump');
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            handleInput('duck', true);
        } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
            e.preventDefault();
            if (gameState && gameState.gameOver) {
                restartGame();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowDown') {
            handleInput('duck', false);
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
        handleInput('slash', x, y);
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleInput('jump');
    });
}

function selectGame(game) {
    activeGame = game;
    
    // Update Sidebar if it exists
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems.length > 0) {
        navItems.forEach(el => el.classList.remove('active'));
        const btn = document.getElementById(`btn-${game}`);
        if (btn) btn.classList.add('active');
    }

    // Update Play Page UI if it exists
    const titleEl = document.getElementById('game-title') || document.getElementById('current-game-title');
    const descEl = document.getElementById('current-game-desc');
    
    const config = {
        dino: { title: 'Rohith Run', desc: 'Avoid the obstacles! [SPACE] to jump, [DOWN] to duck.', hint: '<span>[SPACE] Jump</span> <span>[DOWN] Duck</span>' },
        flappy: { title: 'Mini Flappy', desc: 'Navigate the obstacles! [SPACE] to flap.', hint: '<span>[SPACE] Flap</span>' }
    };

    if (titleEl) titleEl.innerText = config[game].title;
    if (descEl) descEl.innerText = config[game].desc;
    
    const hintEl = document.getElementById('controls-hint');
    if (hintEl) hintEl.innerHTML = config[game].hint;

    updateHighScoreUI();
    restartGame();
}

function restartGame() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    document.getElementById('game-overlay').classList.add('hidden');
    
    gameState = initLogic(activeGame);
    lastTimestamp = performance.now();
    gameLoop(lastTimestamp);
}

function gameLoop(timestamp) {
    const dt = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    update(dt, timestamp);
    draw();
    
    if (!gameState.gameOver) {
        gameLoopId = requestAnimationFrame(gameLoop);
    } else {
        showGameOver();
    }
}

// --- Game Logic Mirrors ---
function initLogic(game) {
    const base = {
        type: game,
        score: 0,
        gameOver: false,
        waitingToStart: true, // New: Pause at the beginning
        difficulty: 0,
        gameTime: 0
    };

    if (game === 'dino') {
        return { ...base,
            dino: { 
                x: 80, y: DINO_GROUND_Y, vy: 0, jumping: false, ducking: false, shield: false,
                // Initial Background color (Night)
                bgColor: { r: 15, g: 23, b: 42 },
                clouds: Array.from({ length: 8 }, () => ({
                    x: Math.random() * CANVAS_WIDTH,
                    y: 20 + Math.random() * 150, // Top half of sky
                    parallax: 0.2 + Math.random() * 0.6, // Slower background movement
                    scale: 0.4 + Math.random() * 0.8
                })),
                lastCloudSpawn: 0
            },
            cacti: [],
            birds: []
        };
    } else {
        return { ...base,
            bird: { x: 100, y: 200, vy: 0 },
            pipes: []
        };
    }
}

function update(dt, timestamp) {
    // Background and animations (Sky, Cloud Birth) continue while waiting
    gameState.gameTime += dt / 1000;
    gameState.difficulty = Math.min(50, Math.floor(gameState.gameTime / 10));

    if (!gameState.waitingToStart) {
        if (gameState.type === 'dino') updateDino(dt);
        else if (gameState.type === 'flappy') updateFlappy(dt);
    }

    emitter.update();
    const scoreEl = document.getElementById('current-score');
    if (scoreEl) scoreEl.innerText = gameState.score;
    
    // Live update the personal best score if beaten during gameplay
    if (gameState.score > highScore[activeGame]) {
        highScore[activeGame] = gameState.score;
        updateHighScoreUI();
        
        // C Backend Save using Fetch to Node API
        // main.js - Sending the data to the API
        fetch('http://localhost:3000/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: activeGame, score: highScore[activeGame] })
        }).catch(e => console.log('Backend sync error:', e));
    }
}

function handleInput(type, x, y) {
    // Start the game if any input is received while waiting
    if (gameState.waitingToStart) {
        gameState.waitingToStart = false;
        return; // Consume the button press to prevent accidental jump
    }

    if (gameState.gameOver) return;

    if (gameState.type === 'dino') {
        if (type === 'jump' && !gameState.dino.jumping) {
            gameState.dino.vy = -15;
            gameState.dino.jumping = true;
            sounds.play('jump');
            emitter.emit(gameState.dino.x + 20, gameState.dino.y, '#38bdf8', 5);
        } else if (type === 'duck') {
            gameState.dino.ducking = x; // x is boolean for ducking
        }
    } else if (gameState.type === 'flappy' && type === 'jump') {
        gameState.bird.vy = -8.5;
        sounds.play('flap');
        emitter.emit(gameState.bird.x, gameState.bird.y, '#facc15', 3);
    }
}

function updateDino(dt) {
    const s = gameState;
    // Score-Based Speed: Base 7 + Time Scaling + +1.5 for every 15 points
    const scoreBoost = Math.floor(s.score / 15) * 1.5;
    const speed = 7 + (s.difficulty * 0.2) + scoreBoost;
    s.currentSpeed = speed; // Store for other effects
    s.dino.vy += 0.8;
    s.dino.y += s.dino.vy;
    if (s.dino.y >= DINO_GROUND_Y) {
        s.dino.y = DINO_GROUND_Y;
        s.dino.vy = 0;
        s.dino.jumping = false;
    }

    // Smooth Background Lerp (Fractional: Shifts with every point)
    const phases = [
        { r: 15, g: 23, b: 42 },   // Night
        { r: 14, g: 165, b: 233 }, // Forenoon
        { r: 56, g: 189, b: 248 }, // Afternoon
        { r: 244, g: 63, b: 94 }   // Evening
    ];
    
    // Fractional Phase calculation: 10 points per phase
    const phaseValue = (s.score / 10) % phases.length;
    const currentIdx = Math.floor(phaseValue);
    const nextIdx = (currentIdx + 1) % phases.length;
    const t = phaseValue - currentIdx; // Fractional progress
    
    const targetColor = {
        r: phases[currentIdx].r + (phases[nextIdx].r - phases[currentIdx].r) * t,
        g: phases[currentIdx].g + (phases[nextIdx].g - phases[currentIdx].g) * t,
        b: phases[currentIdx].b + (phases[nextIdx].b - phases[currentIdx].b) * t
    };
    
    // Liquid Smooth Background Lerp (Cinematic 0.04 factor)
    s.dino.bgColor.r += (targetColor.r - s.dino.bgColor.r) * 0.04;
    s.dino.bgColor.g += (targetColor.g - s.dino.bgColor.g) * 0.04;
    s.dino.bgColor.b += (targetColor.b - s.dino.bgColor.b) * 0.04;

    // Update Background Clouds
    s.dino.clouds.forEach(c => {
        c.x -= speed * (c.parallax * 0.15); // Move horizontally
        if (c.x < -150) {
            c.x = CANVAS_WIDTH + Math.random() * 100;
            c.y = 20 + Math.random() * 150;
            c.scale = 0.4 + Math.random() * 0.8;
            c.parallax = 0.2 + Math.random() * 0.6;
        }
    });

    // Spawn Cacti/Obstacles
    if (Math.random() < 0.02 && (s.cacti.length === 0 || s.cacti[s.cacti.length-1].x < 450)) {
        const type = Math.random() > 0.5 ? 'tree' : 'bush';
        s.cacti.push({ 
            x: CANVAS_WIDTH, 
            w: type === 'tree' ? 30 + Math.random()*20 : 40 + Math.random()*30, 
            h: type === 'tree' ? 50 + Math.random()*35 : 30 + Math.random()*20, // Reduced tree height
            type: type,
            passed: false 
        });
    }

    // Spawn Birds
    if (s.score > 20 && Math.random() < 0.005 && s.birds.length < 2) {
        s.birds.push({ x: CANVAS_WIDTH, y: DINO_GROUND_Y - 50 - Math.random()*100, speed: speed + 1, passed: false });
    }

    s.cacti.forEach(c => {
        c.x -= speed;
        // Skill-based Scoring: Increment when crossed
        if (!c.passed && s.dino.x > c.x + c.w) {
            c.passed = true;
            s.score++;
            sounds.play('score');
        }
        // Collision Detection
        if (checkRectOverlap(s.dino.x, s.dino.y - 50, 35, 45, c.x, DINO_GROUND_Y - c.h, c.w, c.h)) {
            s.gameOver = true;
        }
    });

    s.birds.forEach(b => {
        b.x -= b.speed;
        if (!b.passed && s.dino.x > b.x + 40) {
            b.passed = true;
            s.score++;
            sounds.play('score');
        }
        if (!s.dino.ducking && checkRectOverlap(s.dino.x, s.dino.y - 50, 35, 45, b.x, b.y, 40, 20)) {
            s.gameOver = true;
        }
    });

    s.cacti = s.cacti.filter(c => c.x > -50);
    s.birds = s.birds.filter(b => b.x > -50);
}

function updateFlappy(dt) {
    const s = gameState;
    // Score-Based Speed: Base 4 + Time Scaling + Score Scaling
    const speed = 4 + (s.difficulty * 0.1) + (s.score / 10) * 0.5;

    s.bird.vy += 0.45;
    s.bird.y += s.bird.vy;
    if (s.bird.y < 0 || s.bird.y > CANVAS_HEIGHT) s.gameOver = true;

    // Dynamic Gap Calculation: Shrinks every 30 points
    const currentGap = Math.max(100, 160 - Math.floor(s.score / 30) * 15);

    if (s.pipes.length === 0 || s.pipes[s.pipes.length-1].x < CANVAS_WIDTH - 350) {
        const topH = 60 + Math.random() * (CANVAS_HEIGHT - currentGap - 120);
        s.pipes.push({ 
            x: CANVAS_WIDTH, 
            h: topH, 
            gap: currentGap, // Store gap at spawn for consistent physics
            passed: false, 
            move: Math.random() > 0.7 ? 1 : 0 
        });
    }

    s.pipes.forEach(p => {
        p.x -= speed;
        if (p.move) {
            p.h += Math.sin(Date.now() / 500) * 2;
        }
        // Collision detection using the pipe-specific gap
        if (checkRectOverlap(s.bird.x, s.bird.y - 12, 25, 25, p.x, 0, 60, p.h) ||
            checkRectOverlap(s.bird.x, s.bird.y - 12, 25, 25, p.x, p.h + p.gap, 60, CANVAS_HEIGHT)) {
            s.gameOver = true;
        }
        if (!p.passed && s.bird.x > p.x + 60) {
            p.passed = true;
            s.score++;
            sounds.play('score');
        }
    });
    s.pipes = s.pipes.filter(p => p.x > -100);
}

// --- Utils & Graphics ---
function checkRectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (gameState.type === 'dino') drawDinoScene();
    else if (gameState.type === 'flappy') drawFlappyScene();

    if (gameState.waitingToStart) drawStartScreen();
    
    emitter.draw(ctx);
}
function drawDinoScene() {
    const s = gameState;
    const bc = s.dino.bgColor;
    
    // Background sky fill (Smoothly interpolated)
    ctx.fillStyle = `rgb(${Math.floor(bc.r)}, ${Math.floor(bc.g)}, ${Math.floor(bc.b)})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dynamic Character clouds: Magical emission
    const brightness = (bc.r * 299 + bc.g * 587 + bc.b * 114) / 1000;
    const cloudColor = brightness < 100 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)';
    
    s.dino.clouds.forEach(c => {
        draw3DCloud(ctx, c.x, c.y, 25, cloudColor, c.scale);
    });

    // Character: Spinning Rohith Block
    drawRohithBlock(ctx, s.dino.x, s.dino.y, s.gameTime, s.dino.ducking, s.dino.jumping);
    
    // Obstacles
    s.cacti.forEach(c => {
        if (c.type === 'tree') drawTree(ctx, c.x, DINO_GROUND_Y, c.w, c.h);
        else drawBush(ctx, c.x, DINO_GROUND_Y, c.w, c.h);
    });
    
    // Birds
    s.birds.forEach(b => drawBird(ctx, b.x, b.y, s.gameTime));

    // Ground
    ctx.fillStyle = brightness < 100 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(148, 163, 184, 0.3)';
    ctx.fillRect(0, DINO_GROUND_Y, CANVAS_WIDTH, 4);
}

function drawRohithBlock(ctx, x, y, time, isDucking, isJumping) {
    const baseSize = isDucking ? 25 : 45;
    // Pulse effect: character scales slightly when jumping
    const pulse = isJumping ? 1.2 + Math.sin(time * 20) * 0.1 : 1.0;
    const size = baseSize * pulse;
    
    // Adaptive Contrast Logic
    const bc = gameState.dino.bgColor;
    const brightness = (bc.r * 299 + bc.g * 587 + bc.b * 114) / 1000;
    const charColor = brightness < 120 ? '#38bdf8' : '#db2777'; // Electric Cyan for dark, Vibrant Magenta for light
    
    // Rotation speed scales with game speed
    const speedFactor = gameState.currentSpeed ? (gameState.currentSpeed / 7) : 1;
    const rotation = time * 8 * speedFactor; 
    
    ctx.save();
    // Center the rotation exactly on the block midpoint
    ctx.translate(x + 20, y - baseSize/2); 
    ctx.rotate(rotation);
    
    // Draw Square with high-definition outline and glow
    ctx.strokeStyle = charColor;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = charColor;
    ctx.strokeRect(-size/2, -size/2, size, size);
    ctx.shadowBlur = 0; // Reset shadow
    
    // Character Background (Premium Glass effect)
    ctx.fillStyle = brightness < 120 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(219, 39, 119, 0.2)';
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Character: 'R' (Premium Font and Centering)
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(size * 0.7)}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', 0, 0);
    
    ctx.restore();
}

function drawTree(ctx, x, y, w, h) {
    // Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x + w/2 - 5, y - h/3, 10, h/3);
    // Canopy
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.moveTo(x + w/2, y - h);
    ctx.lineTo(x, y - h/4);
    ctx.lineTo(x + w, y - h/4);
    ctx.fill();
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.moveTo(x + w/2, y - h * 0.8);
    ctx.lineTo(x + w/4, y - h/3);
    ctx.lineTo(x + w * 0.75, y - h/3);
    ctx.fill();
}

function drawBush(ctx, x, y, w, h) {
    ctx.fillStyle = '#065f46';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + (w/3) * i + 10, y - h/2, h/2, 0, Math.PI*2);
        ctx.fill();
    }
}

function draw3DCloud(ctx, x, y, size, color, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Main Body (3 circles)
    ctx.fillStyle = color;
    
    // Shading: Subtle Bottom Shadow
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    
    const parts = [
        { dx: -20, dy: 0, r: 20 },
        { dx: 0, dy: -10, r: 25 },
        { dx: 20, dy: 0, r: 20 }
    ];

    parts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.dx, p.dy, p.r, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight layer (3D look)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(p.dx, p.dy - p.r * 0.3, p.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
    });

    ctx.restore();
}

function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Pulse effect
    const pulse = 0.8 + Math.sin(Date.now() / 300) * 0.2;
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.font = 'bold 32px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#38bdf8';
    ctx.fillText('PRESS ANY BUTTON TO START!', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText('READY TO PLAY?', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 40);
}

function drawBird(ctx, x, y, time) {
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;
    const wingOffset = Math.sin(time * 15) * 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y + wingOffset);
    ctx.lineTo(x + 40, y);
    ctx.stroke();
    
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(x + 20, y, 5, 0, Math.PI*2);
    ctx.fill();
}

function drawFlappyScene() {
    const s = gameState;
    ctx.fillStyle = '#facc15';
    ctx.save();
    ctx.translate(s.bird.x + 15, s.bird.y);
    ctx.rotate(s.bird.vy * 0.05);
    ctx.fillRect(-15, -15, 30, 30);
    ctx.restore();

    ctx.fillStyle = '#ef4444';
    s.pipes.forEach(p => {
        ctx.fillRect(p.x, 0, 60, p.h);
        ctx.fillRect(p.x, p.h + p.gap, 60, CANVAS_HEIGHT);
    });
}



// --- Persistence & Time ---
function updateHighScoreUI() {
    const dino = document.getElementById('high-dino');
    const flappy = document.getElementById('high-flappy');
    const bestScoreEl = document.getElementById('best-score');
    
    if (dino) dino.innerText = highScore.dino;
    if (flappy) flappy.innerText = highScore.flappy;
    if (bestScoreEl && activeGame) {
        bestScoreEl.innerText = highScore[activeGame] || 0;
    }
}

function showGameOver() {
    const overlay = document.getElementById('game-overlay');
    if (overlay) overlay.classList.remove('hidden');
    
    fetch('http://localhost:3000/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: activeGame, score: highScore[activeGame] })
    }).catch(e => console.log('Backend sync error:', e));
    sounds.play('gameOver');
}



function startTimeCycle() {
    setInterval(() => {
        const hour = new Date().getHours();
        if (hour >= 18 || hour <= 6) document.body.classList.add('night-mode');
        else document.body.classList.remove('night-mode');
    }, 60000);
}
