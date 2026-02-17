// Jump Obby Game State
let gameState = {
    playerName: 'Player',
    currentLevel: 1,
    difficulty: 'normal',
    isPlaying: false,
    startTime: 0,
    checkpointsPassed: 0,
    fallCount: 0
};

// Three.js setup
let scene, camera, renderer;
let playerCharacter;
let platforms = [];
let checkpoints = [];
let levelFinish = null;

// Physics
const gravity = -0.02;
let velocityY = 0;
let moveSpeed = 0.2;
const jumpPower = 0.35;

// Input
const keys = {};
let cameraYaw = 0;
let cameraPitch = 0;

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === ' ' && gameState.isPlaying && playerCharacter) {
        e.preventDefault();
        if (playerCharacter.userData.isGrounded) {
            velocityY = jumpPower;
            playerCharacter.userData.isGrounded = false;
        }
    }
    
    if (e.key === 'Escape' && gameState.isPlaying) {
        goToMenu();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

document.addEventListener('mousemove', (e) => {
    cameraYaw -= e.movementX * 0.005;
    cameraPitch -= e.movementY * 0.005;
    cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraPitch));
});

// Start button listeners
document.addEventListener('DOMContentLoaded', () => {
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            gameState.difficulty = btn.dataset.difficulty;
            difficultyBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
    
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }
    
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', restartLevel);
    }
    
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    if (nextLevelBtn) {
        nextLevelBtn.addEventListener('click', nextLevel);
    }
    
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', restartLevel);
    }
    
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', goToMenu);
    }
});

function startGame() {
    const nameInput = document.getElementById('playerNameInput');
    gameState.playerName = nameInput.value || 'Player';
    gameState.isPlaying = true;
    gameState.currentLevel = 1;
    gameState.startTime = Date.now();
    gameState.checkpointsPassed = 0;
    gameState.fallCount = 0;
    
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('playerName').textContent = gameState.playerName;
    
    setTimeout(initializeGame, 100);
}

function initializeGame() {
    const container = document.getElementById('canvas-container');
    container.innerHTML = '';
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 300, 500);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 50, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    
    // Create level
    createLevel(gameState.currentLevel);
    
    // Create player
    playerCharacter = createPlayer();
    scene.add(playerCharacter);
    
    window.addEventListener('resize', onWindowResize);
    
    gameLoop();
}

function createLevel(level) {
    platforms = [];
    checkpoints = [];
    
    let platformY = 0;
    let platformGap = 3;
    let platformWidth = 2;
    let platformLength = 10;
    
    // Difficulty adjustments
    if (gameState.difficulty === 'easy') {
        platformGap = 2.5;
        platformWidth = 2.5;
    } else if (gameState.difficulty === 'hard') {
        platformGap = 3.5;
        platformWidth = 1.5;
    }
    
    // Add platforms based on level
    const numPlatforms = 10 + level * 2;
    
    for (let i = 0; i < numPlatforms; i++) {
        let z = i * platformGap;
        let x = (Math.sin(i * 0.5) * 5);
        
        const platform = createPlatform(x, platformY, z, platformWidth, platformLength);
        scene.add(platform);
        platforms.push({
            mesh: platform,
            x: x,
            y: platformY,
            z: z,
            width: platformWidth,
            length: platformLength
        });
        
        // Add checkpoints every 3 platforms
        if (i > 0 && i % 3 === 0) {
            const checkpoint = createCheckpoint(x, platformY + 0.5, z);
            scene.add(checkpoint);
            checkpoints.push({
                mesh: checkpoint,
                x: x,
                y: platformY + 0.5,
                z: z,
                passed: false
            });
        }
    }
    
    // Finish platform
    let finalZ = numPlatforms * platformGap;
    levelFinish = createFinish(0, platformY, finalZ);
    scene.add(levelFinish);
}

function createPlatform(x, y, z, width, length) {
    const geometry = new THREE.BoxGeometry(width, 0.5, length);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x4488ff,
        metalness: 0.2,
        roughness: 0.8
    });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    
    return platform;
}

function createCheckpoint(x, y, z) {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xffff00,
        emissive: 0xffaa00
    });
    const checkpoint = new THREE.Mesh(geometry, material);
    checkpoint.position.set(x, y, z);
    checkpoint.castShadow = true;
    
    return checkpoint;
}

function createFinish(x, y, z) {
    const geometry = new THREE.BoxGeometry(3, 0.5, 3);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        emissive: 0x00aa00
    });
    const finish = new THREE.Mesh(geometry, material);
    finish.position.set(x, y, z);
    finish.castShadow = true;
    
    return finish;
}

function createPlayer() {
    const group = new THREE.Group();
    group.position.set(0, 1, 0);
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    head.castShadow = true;
    group.add(head);
    
    group.userData = {
        isGrounded: true,
        lastPlatform: null,
        checkpointsNeeded: 0
    };
    
    return group;
}

function updatePlayer() {
    if (!playerCharacter || !camera) return;
    
    // Movement
    const forward = new THREE.Vector3(
        Math.sin(cameraYaw),
        0,
        -Math.cos(cameraYaw)
    ).normalize();
    
    const right = new THREE.Vector3(
        Math.cos(cameraYaw),
        0,
        Math.sin(cameraYaw)
    ).normalize();
    
    if (keys['w']) playerCharacter.position.addScaledVector(forward, moveSpeed);
    if (keys['s']) playerCharacter.position.addScaledVector(forward, -moveSpeed);
    if (keys['a']) playerCharacter.position.addScaledVector(right, -moveSpeed);
    if (keys['d']) playerCharacter.position.addScaledVector(right, moveSpeed);
    
    // Gravity and collision
    velocityY += gravity;
    playerCharacter.position.y += velocityY;
    
    // Platform collision
    playerCharacter.userData.isGrounded = false;
    platforms.forEach(platform => {
        const px = playerCharacter.position.x;
        const py = playerCharacter.position.y;
        const pz = playerCharacter.position.z;
        
        const platX = platform.x;
        const platY = platform.y;
        const platZ = platform.z;
        const width = platform.width;
        const length = platform.length;
        
        if (px > platX - width/2 && px < platX + width/2 &&
            pz > platZ - length/2 && pz < platZ + length/2 &&
            py > platY - 0.5 && py < platY + 1) {
            
            playerCharacter.position.y = platY + 0.5;
            velocityY = 0;
            playerCharacter.userData.isGrounded = true;
            playerCharacter.userData.lastPlatform = platform;
        }
    });
    
    // Check checkpoints
    checkpoints.forEach(checkpoint => {
        const dist = playerCharacter.position.distanceTo(
            new THREE.Vector3(checkpoint.x, checkpoint.y, checkpoint.z)
        );
        
        if (dist < 1 && !checkpoint.passed) {
            checkpoint.passed = true;
            gameState.checkpointsPassed++;
            document.getElementById('checkpointCount').textContent = gameState.checkpointsPassed;
        }
    });
    
    // Check finish
    const finishDist = playerCharacter.position.distanceTo(levelFinish.position);
    if (finishDist < 2) {
        levelComplete();
    }
    
    // Fall detection
    if (playerCharacter.position.y < -10) {
        gameState.fallCount++;
        document.getElementById('fallCount').textContent = gameState.fallCount;
        resetPlayerPosition();
    }
    
    // Camera follow
    const cameraDistance = 3;
    const cameraHeight = 1.5;
    camera.position.x = playerCharacter.position.x - Math.sin(cameraYaw) * cameraDistance;
    camera.position.y = playerCharacter.position.y + cameraHeight;
    camera.position.z = playerCharacter.position.z + Math.cos(cameraYaw) * cameraDistance;
    
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraYaw;
    camera.rotation.x = cameraPitch;
}

function resetPlayerPosition() {
    playerCharacter.position.set(0, 2, 0);
    velocityY = 0;
}

function levelComplete() {
    gameState.isPlaying = false;
    const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
    
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.add('active');
    document.getElementById('gameoverTitle').textContent = 'LEVEL ' + gameState.currentLevel + ' VOLTOOID! 🎉';
    document.getElementById('finalPlayerName').textContent = gameState.playerName;
    document.getElementById('finalTime').textContent = formatTime(timeTaken);
    document.getElementById('finalFalls').textContent = gameState.fallCount;
    document.getElementById('finalLevel').textContent = gameState.currentLevel;
}

function nextLevel() {
    gameState.currentLevel++;
    gameState.checkpointsPassed = 0;
    gameState.startTime = Date.now();
    
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('levelNumber').textContent = gameState.currentLevel;
    
    initializeGame();
}

function restartLevel() {
    gameState.checkpointsPassed = 0;
    gameState.startTime = Date.now();
    gameState.isPlaying = true;
    
    if (document.getElementById('gameOverScreen').classList.contains('active')) {
        document.getElementById('gameOverScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
    }
    
    initializeGame();
}

function goToMenu() {
    gameState.isPlaying = false;
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('startScreen').classList.add('active');
    
    if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
        scene = null;
        camera = null;
        renderer = null;
    }
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    
    if (!gameState.isPlaying) return;
    
    updatePlayer();
    updateTimer();
    
    renderer.render(scene, camera);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    document.getElementById('timer').textContent = formatTime(elapsed);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
