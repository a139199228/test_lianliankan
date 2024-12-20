class LianLianKan {
    constructor(canvas, rows = 8, cols = 8, maxLayers = 4) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.rows = rows;
        this.cols = cols;
        this.maxLayers = maxLayers;
        this.tileSize = 60;
        
        this.layerOffset = {
            x: 15,
            y: 25
        };
        
        this.updateCanvasSize();
        
        this.gameStarted = false;
        
        this.board = this.createBoard();
        this.selected = null;
        this.icons = ['🎈', '🎨', '🎮', '🎲', '🎸', '🎭', '🎪', '🎯'];
        this.animations = [];
        this.lastTime = 0;
        this.difficulty = 'normal';
        this.hints = [];
        this.hintTimeout = null;
        this.highScores = this.loadHighScores();
        this.clickEffect = null;
        this.matchLine = null;
        
        this.handleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('click', this.handleClick);
        
        this.drawStartScreen();
    }

    drawStartScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            '连连看',
            this.canvas.width / 2,
            this.canvas.height / 3
        );
        
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = (this.canvas.width - buttonWidth) / 2;
        const buttonY = this.canvas.height * 0.6;
        
        this.startButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(
            '开始游戏',
            this.canvas.width / 2,
            buttonY + buttonHeight / 2
        );
    }

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (!this.gameStarted) {
            if (x >= this.startButton.x && 
                x <= this.startButton.x + this.startButton.width &&
                y >= this.startButton.y && 
                y <= this.startButton.y + this.startButton.height) {
                this.startGame();
            }
            return;
        }
        
        const layerOffset = {
            x: 5,
            y: 15
        };
        
        for (let z = this.maxLayers - 1; z >= 0; z--) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    if (!this.board[z][i][j]) continue;
                    
                    const tileX = j * this.tileSize + z * layerOffset.x;
                    const tileY = i * this.tileSize + z * layerOffset.y;
                    
                    if (x >= tileX && x < tileX + this.tileSize &&
                        y >= tileY && y < tileY + this.tileSize) {
                        this.selectTile(i, j, z);
                        return;
                    }
                }
            }
        }
    }

    startGame() {
        this.gameStarted = true;
        this.initGame();
        this.animate();
    }

    selectTile(row, col, layer) {
        if (!this.board[layer][row][col] || this.isGameOver) return;

        this.clickEffect = {
            row, col, layer,
            startTime: performance.now(),
            duration: 300
        };

        if (!this.selected) {
            this.selected = {row, col, layer};
            this.draw();
            return;
        }

        const firstTile = this.board[this.selected.layer][this.selected.row][this.selected.col];
        const secondTile = this.board[layer][row][col];

        if (firstTile.icon === secondTile.icon && 
            !(this.selected.row === row && 
              this.selected.col === col && 
              this.selected.layer === layer)) {
            
            this.matchLine = {
                start: {
                    x: this.selected.col * this.tileSize + this.selected.layer * this.layerOffset.x + this.tileSize / 2,
                    y: this.selected.row * this.tileSize + this.selected.layer * this.layerOffset.y + this.tileSize / 2
                },
                end: {
                    x: col * this.tileSize + layer * this.layerOffset.x + this.tileSize / 2,
                    y: row * this.tileSize + layer * this.layerOffset.y + this.tileSize / 2
                },
                startTime: performance.now(),
                duration: 500
            };
            
            setTimeout(() => {
                this.board[this.selected.layer][this.selected.row][this.selected.col] = null;
                this.board[layer][row][col] = null;
                this.matchLine = null;
                this.selected = null;
                
                this.score += 100;
                
                if (this.checkGameOver()) {
                    this.isGameOver = true;
                    clearInterval(this.timer);
                }
                this.draw();
            }, 500);
        } else {
            this.selected = {row, col, layer};
            this.draw();
        }
    }

    updateCanvasSize() {
        this.canvas.width = this.cols * this.tileSize + (this.maxLayers - 1) * this.layerOffset.x;
        this.canvas.height = this.rows * this.tileSize + (this.maxLayers - 1) * this.layerOffset.y;
    }

    createBoard() {
        let board = new Array(this.maxLayers);
        for (let z = 0; z < this.maxLayers; z++) {
            board[z] = new Array(this.rows);
            for (let i = 0; i < this.rows; i++) {
                board[z][i] = new Array(this.cols).fill(null);
            }
        }
        return board;
    }

    initGame() {
        this.board = this.createBoard();
        
        let totalPairs = Math.floor((this.rows * this.cols) / 2);
        let icons = [];
        for (let i = 0; i < totalPairs; i++) {
            const icon = this.icons[i % this.icons.length];
            icons.push(icon, icon);
        }
        icons = this.shuffle(icons);
        
        let index = 0;
        for (let i = 0; i < this.rows && index < icons.length; i++) {
            for (let j = 0; j < this.cols && index < icons.length; j++) {
                if (Math.random() < 0.7) {
                    this.board[0][i][j] = {
                        icon: icons[index++],
                        layer: 0
                    };
                }
            }
        }
        
        while (index < icons.length) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            let currentHeight = -1;
            for (let z = 0; z < this.maxLayers; z++) {
                if (this.board[z][row][col] !== null) {
                    currentHeight = z;
                }
            }
            
            if (currentHeight >= 0 && currentHeight < this.maxLayers - 1) {
                this.board[currentHeight + 1][row][col] = {
                    icon: icons[index++],
                    layer: currentHeight + 1
                };
            }
        }

        this.score = 0;
        this.time = 0;
        this.isGameOver = false;
        this.hints = [];
        this.selected = null;
        
        if (this.timer) clearInterval(this.timer);
        if (this.hintTimeout) clearTimeout(this.hintTimeout);
        
        this.timer = setInterval(() => {
            if (!this.isGameOver) {
                this.time++;
                this.draw();
            }
        }, 1000);

        this.draw();
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    animate(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.animations = this.animations.filter(animation => {
            const elapsed = currentTime - animation.startTime;
            return elapsed < animation.duration;
        });

        this.draw();
        requestAnimationFrame(this.animate.bind(this));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawLayerIndicator();
        
        const layerOffset = {
            x: 5,
            y: 15
        };
        
        this.drawGrid();
        
        for (let z = 0; z < this.maxLayers; z++) {
            this.drawLayerShadows(z, layerOffset);
            this.drawLayerTiles(z, layerOffset);
        }
        
        this.animations.forEach(animation => {
            if (animation.type === 'match') {
                const elapsed = performance.now() - animation.startTime;
                const progress = elapsed / animation.duration;
                
                animation.positions.forEach(pos => {
                    const offsetX = pos.col * this.tileSize + pos.layer * this.layerOffset.x;
                    const offsetY = pos.row * this.tileSize + pos.layer * this.layerOffset.y;
                    
                    this.ctx.save();
                    this.ctx.globalAlpha = 1 - progress;
                    this.ctx.translate(
                        offsetX + this.tileSize / 2,
                        offsetY + this.tileSize / 2
                    );
                    this.ctx.scale(1 + progress * 1.5, 1 + progress * 1.5);
                    
                    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.tileSize / 2);
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                    gradient.addColorStop(1, 'rgba(255, 235, 59, 0)');
                    this.ctx.fillStyle = gradient;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, this.tileSize / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                });
            }
        });

        if (this.hints.length > 0) {
            if (!this.hintFading) {
                this.hintAlpha -= 0.05;
                if (this.hintAlpha <= 0.3) this.hintFading = true;
            } else {
                this.hintAlpha += 0.05;
                if (this.hintAlpha >= 1) this.hintFading = false;
            }
            
            this.hints.forEach(hint => {
                const offsetX = hint.col * this.tileSize + hint.layer * this.layerOffset.x;
                const offsetY = hint.row * this.tileSize + hint.layer * this.layerOffset.y;
                
                this.ctx.strokeStyle = `rgba(255, 235, 59, ${this.hintAlpha})`;
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(
                    offsetX,
                    offsetY,
                    this.tileSize,
                    this.tileSize
                );
            });
        }
        
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = '40px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                '游戏胜利！', 
                this.canvas.width / 2, 
                this.canvas.height / 2 - 40
            );
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText(
                `得分: ${this.score} 时间: ${this.formatTime(this.time)}`,
                this.canvas.width / 2,
                this.canvas.height / 2 + 10
            );
        }

        if (this.matchLine) {
            const progress = (performance.now() - this.matchLine.startTime) / this.matchLine.duration;
            const currentEnd = {
                x: this.matchLine.start.x + (this.matchLine.end.x - this.matchLine.start.x) * progress,
                y: this.matchLine.start.y + (this.matchLine.end.y - this.matchLine.start.y) * progress
            };

            this.ctx.beginPath();
            this.ctx.moveTo(this.matchLine.start.x, this.matchLine.start.y);
            this.ctx.lineTo(currentEnd.x, currentEnd.y);
            this.ctx.strokeStyle = '#ffeb3b';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        if (this.clickEffect) {
            const elapsed = performance.now() - this.clickEffect.startTime;
            if (elapsed < this.clickEffect.duration) {
                const progress = elapsed / this.clickEffect.duration;
                const size = this.tileSize * (1 + progress * 0.2);
                const alpha = 1 - progress;
                
                const x = this.clickEffect.col * this.tileSize + 
                         this.clickEffect.layer * this.layerOffset.x + 
                         (this.tileSize - size) / 2;
                const y = this.clickEffect.row * this.tileSize + 
                         this.clickEffect.layer * this.layerOffset.y + 
                         (this.tileSize - size) / 2;

                this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(x, y, size, size);
            } else {
                this.clickEffect = null;
            }
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.rows; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.tileSize);
            this.ctx.lineTo(this.cols * this.tileSize, i * this.tileSize);
            this.ctx.stroke();
        }
        
        for (let j = 0; j <= this.cols; j++) {
            this.ctx.beginPath();
            this.ctx.moveTo(j * this.tileSize, 0);
            this.ctx.lineTo(j * this.tileSize, this.rows * this.tileSize);
            this.ctx.stroke();
        }
    }

    drawLayerShadows(z, layerOffset) {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.board[z][i][j]) {
                    const offsetX = j * this.tileSize + z * layerOffset.x;
                    const offsetY = i * this.tileSize + z * layerOffset.y;
                    
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    this.ctx.fillRect(
                        offsetX + 6,
                        offsetY + 6,
                        this.tileSize,
                        this.tileSize
                    );
                }
            }
        }
    }

    drawLayerTiles(z, layerOffset) {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const tile = this.board[z][i][j];
                if (tile) {
                    const offsetX = j * this.tileSize + z * layerOffset.x;
                    const offsetY = i * this.tileSize + z * layerOffset.y;
                    
                    this.drawTile(tile, offsetX, offsetY, z);
                }
            }
        }
    }

    drawTile(tile, x, y, layer) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(x + 4, y + 4, this.tileSize, this.tileSize);
        
        this.ctx.fillStyle = this.getTileColor(layer);
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`L${layer + 1}`, x + 5, y + 5);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
        
        this.ctx.font = '32px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            tile.icon,
            x + this.tileSize / 2,
            y + this.tileSize / 2
        );
        
        if (this.selected) {
            const selectedCol = Math.floor(x / this.tileSize);
            const selectedRow = Math.floor(y / this.tileSize);
            
            if (this.selected.row === selectedRow && 
                this.selected.col === selectedCol && 
                this.selected.layer === layer) {
                const gradient = this.ctx.createRadialGradient(
                    x + this.tileSize / 2, y + this.tileSize / 2, 0,
                    x + this.tileSize / 2, y + this.tileSize / 2, this.tileSize
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(x - 5, y - 5, this.tileSize + 10, this.tileSize + 10);
                
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
            }
        }
    }

    getTileColor(layer) {
        const colors = [
            '#2E7D32',
            '#1565C0',
            '#6A1B9A',
            '#C62828'
        ];
        return colors[layer] || colors[0];
    }

    setDifficulty(level) {
        switch(level) {
            case 'easy':
                this.rows = 6;
                this.cols = 6;
                this.maxLayers = 2;
                break;
            case 'normal':
                this.rows = 8;
                this.cols = 8;
                this.maxLayers = 3;
                break;
            case 'hard':
                this.rows = 10;
                this.cols = 10;
                this.maxLayers = 4;
                break;
        }
        
        this.updateCanvasSize();
        
        this.board = this.createBoard();
        this.initGame();
    }

    findHint() {
        this.hints = [];
        
        for (let z1 = this.maxLayers - 1; z1 >= 0; z1--) {
            for (let i1 = 0; i1 < this.rows; i1++) {
                for (let j1 = 0; j1 < this.cols; j1++) {
                    const tile1 = this.board[z1][i1][j1];
                    if (!tile1) continue;
                    
                    for (let z2 = this.maxLayers - 1; z2 >= 0; z2--) {
                        for (let i2 = 0; i2 < this.rows; i2++) {
                            for (let j2 = 0; j2 < this.cols; j2++) {
                                const tile2 = this.board[z2][i2][j2];
                                if (!tile2 || (z1 === z2 && i1 === i2 && j1 === j2)) continue;
                                
                                if (tile1.icon === tile2.icon) {
                                    this.hints = [{row: i1, col: j1, layer: z1}, 
                                                {row: i2, col: j2, layer: z2}];
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    showHint() {
        if (this.isGameOver) return;
        
        if (this.findHint()) {
            if (this.hintTimeout) clearTimeout(this.hintTimeout);
            
            this.hintAlpha = 1;
            this.hintFading = false;
            
            this.hintTimeout = setTimeout(() => {
                this.hints = [];
                this.draw();
            }, 3000);
            
            this.draw();
        }
    }

    checkGameOver() {
        for (let z = 0; z < this.maxLayers; z++) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    if (this.board[z][i][j] !== null) {
                        return false;
                    }
                }
            }
        }
        
        this.saveScore();
        return true;
    }

    saveScore() {
        const scoreData = {
            score: this.score,
            time: this.time,
            difficulty: this.difficulty,
            date: new Date().toISOString()
        };
        
        this.highScores[this.difficulty].push(scoreData);
        this.highScores[this.difficulty].sort((a, b) => b.score - a.score);
        this.highScores[this.difficulty] = this.highScores[this.difficulty].slice(0, 10);
        
        localStorage.setItem('lianliankan_scores', JSON.stringify(this.highScores));
    }

    loadHighScores() {
        const saved = localStorage.getItem('lianliankan_scores');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            easy: [],
            normal: [],
            hard: []
        };
    }

    getHighScores(difficulty) {
        return this.highScores[difficulty] || [];
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    destroy() {
        this.canvas.removeEventListener('click', this.handleClick);
        if (this.timer) clearInterval(this.timer);
        if (this.hintTimeout) clearTimeout(this.hintTimeout);
    }

    drawLayerIndicator() {
        const padding = 10;
        const indicatorHeight = 30;
        
        for (let z = 0; z < this.maxLayers; z++) {
            const x = padding;
            const y = padding + z * (indicatorHeight + 5);
            
            this.ctx.fillStyle = this.getTileColor(z);
            this.ctx.fillRect(x, y, 80, indicatorHeight);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                `层级 ${z + 1}`,
                x + 40,
                y + indicatorHeight / 2
            );
        }
    }
} 