class LifeCanvas {
    #config = {
        colors: ["#F7E4E4", "#E4F2F2", "#E4EAF7", "#E8F2E8", "#F7F7E4", "#F7E8E8", "#EDE4F7", "#E4EEF7"],
        cell: {
            size: 18,
            padding: 8,
            get realSize() {
                return this.size - this.padding;
            }
        },
        game: {
            frameInterval: 120,
            randomThreshold: 0.2,
            neighborProbability: 0.3,
            edgeWidthRatio: 0.03
        },
        interaction: {
            throttleDelay: 16,
            resizeDebounceDelay: 250
        }
    };

    #state = {
        canvas: null,
        context: null,
        currentGrid: null,
        nextGrid: null,
        cellColors: null,
        cellOpacity: null,
        rows: 0,
        cols: 0,
        lastCellPosition: null,
        lastFrameTime: 0,
        isVisible: true,
        animationFrameId: null
    };

    constructor(canvasElement) {
        if (!(canvasElement instanceof HTMLCanvasElement)) {
            throw new Error('必须传入有效的canvas元素');
        }

        this.#state.canvas = canvasElement;
        this.#state.context = canvasElement.getContext('2d');
        this.#setupEventListeners();
    }

    start() {
        this.#handleCanvasResize();
        this.#initializeGrids();
        this.#initializeEdgeCells();
        this.#renderFrame();
        this.#animationLoop();
    }

    createCellsAroundElement(selector) {
        const element = document.querySelector(selector);
        if (!element) return;

        const elementRect = element.getBoundingClientRect();
        const canvasRect = this.#state.canvas.getBoundingClientRect();

        const startRow = Math.floor((elementRect.top - canvasRect.top) / this.#config.cell.size) - 2;
        const endRow = Math.ceil((elementRect.bottom - canvasRect.top) / this.#config.cell.size) + 2;
        const startCol = Math.floor((elementRect.left - canvasRect.left) / this.#config.cell.size) - 2;
        const endCol = Math.ceil((elementRect.right - canvasRect.left) / this.#config.cell.size) + 2;

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (
                    row >= 0 &&
                    row < this.#state.rows &&
                    col >= 0 &&
                    col < this.#state.cols &&
                    Math.random() < this.#config.game.randomThreshold
                ) {
                    const index = row * this.#state.cols + col;
                    this.#state.currentGrid[index] = 1;
                    this.#activateNeighbors(row, col);
                }
            }
        }
    }

    pause() {
        if (this.#state.animationFrameId) {
            cancelAnimationFrame(this.#state.animationFrameId);
            this.#state.animationFrameId = null;
        }
    }

    resume() {
        if (!this.#state.animationFrameId) {
            this.#state.lastFrameTime = performance.now();
            this.#state.animationFrameId = requestAnimationFrame((t) => this.#animationLoop(t));
        }
    }

    // 私有方法
    #handleCanvasResize() {
        const dpr = window.devicePixelRatio || 1;
        const canvasRect = this.#state.canvas.getBoundingClientRect();
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        this.#state.canvas.width = (canvasRect.width - scrollbarWidth) * dpr;
        this.#state.canvas.height = canvasRect.height * dpr;
        this.#state.canvas.style.width = `${canvasRect.width - scrollbarWidth}px`;
        this.#state.canvas.style.height = `${canvasRect.height}px`;

        this.#state.context.scale(dpr, dpr);

        this.#state.rows = Math.ceil(canvasRect.height / this.#config.cell.size);
        this.#state.cols = Math.ceil((canvasRect.width - scrollbarWidth) / this.#config.cell.size);
    }

    #initializeGrids() {
        const gridSize = this.#state.rows * this.#state.cols;
        this.#state.currentGrid = new Uint8Array(gridSize);
        this.#state.nextGrid = new Uint8Array(gridSize);
        this.#state.cellColors = new Array(gridSize);
        this.#state.cellOpacity = new Float32Array(gridSize).fill(0);
    }

    #initializeEdgeCells() {
        const edgeCols = Math.floor(this.#state.cols * this.#config.game.edgeWidthRatio);
        for (let row = 0; row < this.#state.rows; row++) {
            if (Math.random() < this.#config.game.randomThreshold) {
                this.#createCellWithNeighbors(row, 0, edgeCols);
            }
            if (Math.random() < this.#config.game.randomThreshold) {
                this.#createCellWithNeighbors(row, this.#state.cols - edgeCols, this.#state.cols);
            }
        }
    }

    #createCellWithNeighbors(row, startCol, endCol) {
        const randomCol = startCol + Math.floor(Math.random() * (endCol - startCol));
        const index = row * this.#state.cols + randomCol;
        this.#state.currentGrid[index] = 1;
        this.#activateNeighbors(row, randomCol, 0, this.#state.cols);
    }

    #activateNeighbors(row, col, startCol = 0, endCol = this.#state.cols) {
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                const neighborRow = row + r;
                const neighborCol = col + c;
                if (
                    neighborRow >= 0 &&
                    neighborRow < this.#state.rows &&
                    neighborCol >= startCol &&
                    neighborCol < endCol &&
                    Math.random() < this.#config.game.neighborProbability
                ) {
                    const index = neighborRow * this.#state.cols + neighborCol;
                    this.#state.currentGrid[index] = 1;
                }
            }
        }
    }

    #renderFrame() {
        this.#state.context.clearRect(0, 0, this.#state.canvas.width, this.#state.canvas.height);

        for (let row = 0; row < this.#state.rows; row++) {
            for (let col = 0; col < this.#state.cols; col++) {
                const index = row * this.#state.cols + col;
                if (this.#state.currentGrid[index] === 1 || this.#state.cellOpacity[index] > 0) {
                    this.#drawCell(row, col, index);
                }
            }
        }
    }

    #drawCell(row, col, index) {
        if (!this.#state.cellColors[index]) {
            this.#state.cellColors[index] = this.#config.colors[
                Math.floor(Math.random() * this.#config.colors.length)
            ];
            this.#state.cellOpacity[index] = 1;
        }

        const x = col * this.#config.cell.size + this.#config.cell.size / 2;
        const y = row * this.#config.cell.size + this.#config.cell.size / 2;
        const radius = this.#config.cell.realSize / 2;

        const alpha = Math.floor(this.#state.cellOpacity[index] * 255)
            .toString(16)
            .padStart(2, "0");

        this.#state.context.fillStyle = `${this.#state.cellColors[index].slice(0, 7)}${alpha}`;

        this.#state.context.beginPath();
        this.#state.context.arc(x, y, radius, 0, Math.PI * 2);
        this.#state.context.fill();

        if (this.#state.currentGrid[index] === 0) {
            this.#state.cellOpacity[index] = Math.max(0, this.#state.cellOpacity[index] - 0.1);
            if (this.#state.cellOpacity[index] === 0) {
                this.#state.cellColors[index] = null;
            }
        }
    }

    #animationLoop(timestamp) {
        if (this.#state.isVisible) {
            if (timestamp - this.#state.lastFrameTime >= this.#config.game.frameInterval) {
                this.#updateGameState();
                this.#renderFrame();
                this.#state.lastFrameTime = timestamp;
            }
            this.#state.animationFrameId = requestAnimationFrame((t) => this.#animationLoop(t));
        }
    }

    #updateGameState() {
        for (let row = 0; row < this.#state.rows; row++) {
            for (let col = 0; col < this.#state.cols; col++) {
                const index = row * this.#state.cols + col;
                const neighbors = this.#countNeighbors(row, col);
                this.#state.nextGrid[index] = this.#getNextCellState(
                    this.#state.currentGrid[index],
                    neighbors
                );
            }
        }
        [this.#state.currentGrid, this.#state.nextGrid] = [this.#state.nextGrid, this.#state.currentGrid];
    }

    #countNeighbors(row, col) {
        let count = 0;
        const rowStart = Math.max(0, row - 1);
        const rowEnd = Math.min(this.#state.rows - 1, row + 1);
        const colStart = Math.max(0, col - 1);
        const colEnd = Math.min(this.#state.cols - 1, col + 1);

        for (let r = rowStart; r <= rowEnd; r++) {
            for (let c = colStart; c <= colEnd; c++) {
                if (!(r === row && c === col)) {
                    count += this.#state.currentGrid[r * this.#state.cols + c];
                }
            }
        }
        return count;
    }

    #getNextCellState(currentState, neighborCount) {
        return currentState === 1
            ? neighborCount === 2 || neighborCount === 3 ? 1 : 0
            : neighborCount === 3 ? 1 : 0;
    }

    #setupEventListeners() {
        const handleMove = this.#throttle((e) => this.#handlePointerMove(e), this.#config.interaction.throttleDelay);

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', () => {
            this.#state.lastCellPosition = null;
        });

        window.addEventListener('resize', this.#debounce(() => {
            this.#handleCanvasResize();
            this.#initializeGrids();
            this.#renderFrame();
        }, this.#config.interaction.resizeDebounceDelay));

        new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.#state.isVisible = entry.isIntersecting;
                if (this.#state.isVisible) {
                    if (!this.#state.animationFrameId) {
                        this.#state.lastFrameTime = performance.now();
                        this.#state.animationFrameId = requestAnimationFrame((t) => this.#animationLoop(t));
                    }
                } else {
                    this.pause();
                }
            });
        }, { threshold: 0 }).observe(this.#state.canvas);
    }

    #handlePointerMove(event) {
        const canvasRect = this.#state.canvas.getBoundingClientRect();
        const clientX = event.clientX || event.touches?.[0].clientX;
        const clientY = event.clientY || event.touches?.[0].clientY;

        if (
            clientX >= canvasRect.left &&
            clientX <= canvasRect.right &&
            clientY >= canvasRect.top &&
            clientY <= canvasRect.bottom
        ) {
            const localX = clientX - canvasRect.left;
            const localY = clientY - canvasRect.top;
            const currentRow = Math.floor(localY / this.#config.cell.size);
            const currentCol = Math.floor(localX / this.#config.cell.size);

            if (this.#state.lastCellPosition) {
                this.#drawLineBetweenCells(currentRow, currentCol);
            }
            this.#state.lastCellPosition = { row: currentRow, col: currentCol };
            this.#renderFrame();
        } else {
            this.#state.lastCellPosition = null;
        }
    }

    #drawLineBetweenCells(targetRow, targetCol) {
        const steps = Math.max(
            Math.abs(targetRow - this.#state.lastCellPosition.row),
            Math.abs(targetCol - this.#state.lastCellPosition.col)
        );

        for (let i = 0; i <= steps; i++) {
            const progress = steps === 0 ? 0 : i / steps;
            const row = Math.round(
                this.#state.lastCellPosition.row + (targetRow - this.#state.lastCellPosition.row) * progress
            );
            const col = Math.round(
                this.#state.lastCellPosition.col + (targetCol - this.#state.lastCellPosition.col) * progress
            );

            if (
                row >= 0 &&
                row < this.#state.rows &&
                col >= 0 &&
                col < this.#state.cols
            ) {
                const index = row * this.#state.cols + col;
                this.#state.currentGrid[index] = 1;
            }
        }
    }

    #throttle(fn, delay) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                fn(...args);
                lastCall = now;
            }
        };
    }

    #debounce(fn, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    }
}
