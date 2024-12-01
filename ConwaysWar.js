document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById('sprout-canvas');
    const ctx = canvas.getContext('2d');
    const cellSize = 10;
    const viewRows = canvas.height / cellSize;
    const viewCols = canvas.width / cellSize;
    const totalRows = viewRows * 16; // 16x larger grid
    const totalCols = viewCols * 16;
    let aliveCells = new Set(); // Use Set to store alive cells with numeric keys
    let blueCells = new Set(); // Track blue cells
    let redCells = new Set(); // Track red cells
    let greenCells = new Set(); // Track green cells
    let player = { x: Math.floor(totalCols / 2), y: Math.floor(totalRows / 2) }; // Start player in the center
    let lastDirection = 'up'; // Default initial direction
    const tileCounter = document.getElementById('tile-counter');
    const healthBar = document.getElementById('health-bar');
    const pressedKeys = {}; // Object to track currently pressed keys

    const minimapCanvas = document.getElementById('minimap-canvas');
    const minimapCtx = minimapCanvas.getContext('2d');

    function getCoordKey(x, y) {
        return x * totalRows + y; // Unique numeric key
    }

    function getCoordFromKey(key) {
        const x = Math.floor(key / totalRows);
        const y = key % totalRows;
        return [x, y];
    }

    function initializeRandom() {
        aliveCells.clear();
        blueCells.clear();
        redCells.clear();
        greenCells.clear();
        for (let y = 0; y < totalRows; y++) {
            for (let x = 0; x < totalCols; x++) {
                if (Math.random() < 0.2) {
                    aliveCells.add(getCoordKey(x, y));
                }
            }
        }
    }

    function updateGrid() {
        const newAliveCells = new Set();
        const newBlueCells = new Set();
        const newRedCells = new Set();
        const newGreenCells = new Set();
        const neighborCounts = new Map();

        // Count neighbors
        aliveCells.forEach(key => {
            const [x, y] = getCoordFromKey(key);

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    // Skip out-of-bounds coordinates
                    if (nx < 0 || ny < 0 || nx >= totalCols || ny >= totalRows) continue;

                    const neighborKey = getCoordKey(nx, ny);

                    if (dx !== 0 || dy !== 0) {
                        neighborCounts.set(neighborKey, (neighborCounts.get(neighborKey) || 0) + 1);
                    }
                }
            }
        });

        // Determine next state
        neighborCounts.forEach((count, key) => {
            if (count === 3 || (count === 2 && aliveCells.has(key))) {
                newAliveCells.add(key);

                // Determine color dominance
                if (hasColorNeighbor(key, redCells) && hasColorNeighbor(key, greenCells)) {
                    newRedCells.add(key); // Red beats green
                } else if (hasColorNeighbor(key, greenCells) && hasColorNeighbor(key, blueCells)) {
                    newGreenCells.add(key); // Green beats blue
                } else if (hasColorNeighbor(key, blueCells) && hasColorNeighbor(key, redCells)) {
                    newBlueCells.add(key); // Blue beats red
                } else if (hasColorNeighbor(key, redCells)) {
                    newRedCells.add(key);
                } else if (hasColorNeighbor(key, greenCells)) {
                    newGreenCells.add(key);
                } else if (hasColorNeighbor(key, blueCells)) {
                    newBlueCells.add(key);
                }
            }
        });

        // Update alive and color cells
        aliveCells = newAliveCells;
        blueCells = newBlueCells;
        redCells = newRedCells;
        greenCells = newGreenCells;
    }

    function hasColorNeighbor(key, colorSet) {
        const [x, y] = getCoordFromKey(key);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const neighborKey = getCoordKey(x + dx, y + dy);
                if (colorSet.has(neighborKey)) {
                    return true;
                }
            }
        }
        return false;
    }

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const startX = player.x - Math.floor(viewCols / 2);
        const startY = player.y - Math.floor(viewRows / 2);

        // Only draw alive cells within the visible area
        aliveCells.forEach(key => {
            const [x, y] = getCoordFromKey(key);
            const canvasX = x - startX;
            const canvasY = y - startY;
            if (canvasX >= 0 && canvasX < viewCols && canvasY >= 0 && canvasY < viewRows) {
                if (greenCells.has(key)) {
                    ctx.fillStyle = 'green'; // Green beats blue
                } else if (blueCells.has(key)) {
                    ctx.fillStyle = 'blue'; // Blue beats red
                } else if (redCells.has(key)) {
                    ctx.fillStyle = 'red'; // Red beats green
                } else {
                    ctx.fillStyle = 'black';
                }
                ctx.fillRect(canvasX * cellSize, canvasY * cellSize, cellSize, cellSize);
            }
        });

        // Draw the player at the center
        ctx.fillStyle = 'red';
        ctx.fillRect(Math.floor(viewCols / 2) * cellSize, Math.floor(viewRows / 2) * cellSize, cellSize, cellSize);

        updateCounter();
    }

    function updateCounter() {
        const filledTiles = aliveCells.size;
        tileCounter.textContent = `Filled Tiles: ${filledTiles}`;
        updateHealthBar(filledTiles);
    }

    function updateHealthBar(filledTiles) {
        const numBars = 25; // 25 bars
        const maxTiles = 200000; // Starting point for the first bar

        healthBar.innerHTML = ''; // Clear existing bars

        for (let i = 0; i < numBars; i++) {
            const bar = document.createElement('div');

            // Calculate the threshold for each bar using a logarithmic scale
            const threshold = maxTiles / Math.pow(2, i);

            // Only fill bars if the filledTiles exceed the threshold for that bar
            if (filledTiles > threshold) {
                const progress = (i + 1) / numBars;
                const red = Math.min(255, Math.floor(255 * progress)); // Increase red
                const green = Math.max(0, 255 - Math.floor(255 * progress)); // Decrease green
                const blue = 0; // Ensure blue is 0
                bar.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
            } else {
                bar.style.backgroundColor = 'transparent';
            }

            healthBar.appendChild(bar);
        }
    }

    function drawMinimap() {
        const minimapSize = minimapCanvas.width; // Assuming square minimap
        const scaleX = minimapSize / totalCols;
        const scaleY = minimapSize / totalRows;

        minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

        aliveCells.forEach(key => {
            const [x, y] = getCoordFromKey(key);
            if (blueCells.has(key)) {
                minimapCtx.fillStyle = 'blue';
            } else if (redCells.has(key)) {
                minimapCtx.fillStyle = 'red';
            } else if (greenCells.has(key)) {
                minimapCtx.fillStyle = 'green';
            } else {
                minimapCtx.fillStyle = 'black';
            }
            const indicatorSize = Math.max(scaleX, scaleY) * 2; // Increase size for visibility
            minimapCtx.fillRect(x * scaleX, y * scaleY, indicatorSize, indicatorSize);
        });

        // Draw player position on the minimap
        minimapCtx.fillStyle = 'red';
        const playerIndicatorSize = Math.max(scaleX, scaleY) * 3; // Increase size for visibility
        minimapCtx.strokeStyle = 'red'; // Add a border for boldness
        minimapCtx.lineWidth = 2; // Set border width
        minimapCtx.fillRect(player.x * scaleX - playerIndicatorSize / 2, player.y * scaleY - playerIndicatorSize / 2, playerIndicatorSize, playerIndicatorSize);
        minimapCtx.strokeRect(player.x * scaleX - playerIndicatorSize / 2, player.y * scaleY - playerIndicatorSize / 2, playerIndicatorSize, playerIndicatorSize);
    }

    function updateColorCounters() {
        document.getElementById('red-counter').textContent = `Red: ${redCells.size}`;
        document.getElementById('green-counter').textContent = `Green: ${greenCells.size}`;
        document.getElementById('blue-counter').textContent = `Blue: ${blueCells.size}`;
    }

    let lastUpdateTime = 0;
    const updateInterval = 100; // Update every 100ms
    let lastMoveTime = 0;
    const moveInterval = 100; // Move every 100ms

    function gameLoop(timestamp) {
        if (timestamp - lastUpdateTime > updateInterval) {
            updateGrid();
            lastUpdateTime = timestamp;
        }
        handleMovement(timestamp);
        drawGrid();
        drawMinimap();
        updateColorCounters();
        updateBarChart();
        requestAnimationFrame(gameLoop);
    }

    function handleMovement(timestamp) {
        if (timestamp - lastMoveTime < moveInterval) {
            return; // Not enough time has passed for another move
        }
        let dx = 0;
        let dy = 0;
        if (pressedKeys['w'] || pressedKeys['ArrowUp']) {
            dy--;
        }
        if (pressedKeys['s'] || pressedKeys['ArrowDown']) {
            dy++;
        }
        if (pressedKeys['a'] || pressedKeys['ArrowLeft']) {
            dx--;
        }
        if (pressedKeys['d'] || pressedKeys['ArrowRight']) {
            dx++;
        }
        if (dx !== 0 || dy !== 0) {
            let newX = player.x + dx;
            let newY = player.y + dy;

            // Ensure new position is within bounds
            if (newX >= 0 && newX < totalCols) {
                player.x = newX;
            }
            if (newY >= 0 && newY < totalRows) {
                player.y = newY;
            }

            // Update lastDirection based on movement
            if (dx === 0 && dy === -1) lastDirection = 'up';
            else if (dx === 0 && dy === 1) lastDirection = 'down';
            else if (dx === -1 && dy === 0) lastDirection = 'left';
            else if (dx === 1 && dy === 0) lastDirection = 'right';
            else if (dx === -1 && dy === -1) lastDirection = 'up-left';
            else if (dx === 1 && dy === -1) lastDirection = 'up-right';
            else if (dx === -1 && dy === 1) lastDirection = 'down-left';
            else if (dx === 1 && dy === 1) lastDirection = 'down-right';

            const playerKey = getCoordKey(player.x, player.y);
            aliveCells.add(playerKey); // Mark the player's position as alive
            lastMoveTime = timestamp;
        }
    }

    // Input handling
    document.addEventListener('keydown', function (event) {
        pressedKeys[event.key] = true;
        if (event.key === ' ') {
            launchGlider('blue');
        } else if (event.key === 'r') {
            launchGlider('red');
        } else if (event.key === 'g') {
            launchGlider('green');
        }
    });

    document.addEventListener('keyup', function (event) {
        delete pressedKeys[event.key];
    });

    function handleCanvasClick(event) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / cellSize);
        const y = Math.floor((event.clientY - rect.top) / cellSize);
        const gridX = player.x - Math.floor(viewCols / 2) + x;
        const gridY = player.y - Math.floor(viewRows / 2) + y;
        if (gridX >= 0 && gridY >= 0 && gridX < totalCols && gridY < totalRows) {
            const cellKey = getCoordKey(gridX, gridY);
            aliveCells.add(cellKey); // Set the clicked cell to be alive
            drawGrid(); // Redraw the grid to reflect the change
        }
    }

    function launchGlider(color) {
        const gliderPatterns = {
            'up': [
                [0, 0], [1, 0], [2, 0],
                [0, 1], [1, 2]
            ],
            'down': [
                [1, 2], [2, 3], [3, 1],
                [3, 2], [3, 3]
            ],
            'left': [
                [0, 0], [0, 1], [0, 2],
                [1, 2], [2, 1]
            ],
            'right': [
                [0, 0], [1, 0], [2, 0],
                [2, 1], [1, 2]
            ],
            'up-left': [
                [0, 0], [1, 0], [0, 1],
                [1, 2], [2, 1]
            ],
            'up-right': [
                [0, 0], [1, 0], [2, 0],
                [2, 1], [2, 2]
            ],
            'down-left': [
                [0, 0], [0, 1], [1, 1],
                [0, 2], [1, 2]
            ],
            'down-right': [
                [0, 0], [1, 0], [2, 1],
                [1, 2], [2, 2]
            ]
        };

        const pattern = gliderPatterns[lastDirection] || gliderPatterns['up'];
        pattern.forEach(([dx, dy]) => {
            const x = player.x + dx;
            const y = player.y + dy;
            if (x >= 0 && y >= 0 && x < totalCols && y < totalRows) {
                const cellKey = getCoordKey(x, y);
                aliveCells.add(cellKey);
                if (color === 'blue') {
                    blueCells.add(cellKey);
                } else if (color === 'red') {
                    redCells.add(cellKey);
                } else if (color === 'green') {
                    greenCells.add(cellKey);
                }
            }
        });
    }

    canvas.addEventListener('click', handleCanvasClick);

    initializeRandom();
    requestAnimationFrame(gameLoop);

    function updateBarChart() {
        const maxBarHeight = 100; // Maximum height of the bars
        const maxCells = Math.max(redCells.size, greenCells.size, blueCells.size, 1); // Avoid division by zero

        document.getElementById('red-bar').style.height = `${(redCells.size / maxCells) * maxBarHeight}px`;
        document.getElementById('green-bar').style.height = `${(greenCells.size / maxCells) * maxBarHeight}px`;
        document.getElementById('blue-bar').style.height = `${(blueCells.size / maxCells) * maxBarHeight}px`;
    }
});

