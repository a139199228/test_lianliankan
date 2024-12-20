class LianLianKan {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // 固定为困难模式的参数
        this.rows = 10;
        this.cols = 10;
        this.maxLayers = 4;
        this.tileSize = 60;
        
        // 先初始化基本属性
        this.icons = ['🎈', '🎨', '🎮', '🎲', '🎸', '🎭', '🎪', '🎯'];
        this.board = this.createBoard();
        this.selected = null;
        this.animations = [];
        this.lastTime = 0;
        this.difficulty = 'normal';
        this.hints = [];
        this.hintTimeout = null;
        
        // 游戏状态
        this.gameStarted = false;
        
        // 然后再设置画布大小和绘制
        this.updateCanvasSize();
        
        // 绑定事件
        this.handleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('click', this.handleClick);
        
        // 开始动画循环
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        
        // 立即绘制开始界面
        this.drawStartScreen();
    }

    updateCanvasSize() {
        // 计算画布大小，考虑层级偏移
        const width = this.cols * this.tileSize + (this.maxLayers - 1) * 20;
        const height = this.rows * this.tileSize + (this.maxLayers - 1) * 20;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // 重新绘制
        if (this.gameStarted) {
            this.draw();
        } else {
            this.drawStartScreen();
        }
    }

    drawStartScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a237e');
        gradient.addColorStop(1, '#311b92');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制装饰性图案
        this.drawDecorations();
        
        // 绘制标题
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            '层级连连看',
            this.canvas.width / 2,
            this.canvas.height / 3
        );
        
        // 绘制开始按钮
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
        
        // 绘制按钮阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(buttonX + 4, buttonY + 4, buttonWidth, buttonHeight);
        
        // 绘制按钮
        const buttonGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        buttonGradient.addColorStop(0, '#4CAF50');
        buttonGradient.addColorStop(1, '#388E3C');
        this.ctx.fillStyle = buttonGradient;
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // 绘制按钮文字
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText(
            '开始游戏',
            this.canvas.width / 2,
            buttonY + buttonHeight / 2
        );
    }

    drawDecorations() {
        // 绘制背景粒子效果
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = Math.random() * 3 + 1;
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // 绘制装饰性图标
        const icons = this.icons;
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const rotation = Math.random() * Math.PI * 2;
            
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(rotation);
            this.ctx.font = '30px Arial';
            this.ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
            this.ctx.fillText(icons[i % icons.length], 0, 0);
            this.ctx.restore();
        }
    }

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        if (!this.gameStarted) {
            if (this.isClickOnStartButton(x, y)) {
                this.startGame();
            }
            return;
        }
        
        const clickedTile = this.findClickedTile(x, y);
        if (clickedTile) {
            this.selectTile(clickedTile.row, clickedTile.col, clickedTile.layer);
        }
    }

    isClickOnStartButton(x, y) {
        return this.startButton &&
               x >= this.startButton.x && 
               x <= this.startButton.x + this.startButton.width &&
               y >= this.startButton.y && 
               y <= this.startButton.y + this.startButton.height;
    }

    findClickedTile(x, y) {
        const layerOffset = 10;
        
        // 从上层向下检查，确保上层图块优先选中
        for (let z = this.maxLayers - 1; z >= 0; z--) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    if (!this.board[z][i][j]) continue;
                    
                    const tileX = j * this.tileSize + z * layerOffset;
                    const tileY = i * this.tileSize + z * layerOffset;
                    
                    if (x >= tileX && x < tileX + this.tileSize &&
                        y >= tileY && y < tileY + this.tileSize) {
                        return {row: i, col: j, layer: z};
                    }
                }
            }
        }
        return null;
    }

    startGame() {
        this.gameStarted = true;
        if (this.onGameStart) {
            this.onGameStart();
        }
        this.initGame();
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
        // 首先清空所有格子
        this.board = this.createBoard();
        
        // 修改配对数量计算，避免图块太密集
        let totalPairs = Math.floor((this.rows * this.cols * 1.2) / 2); // 减少总配对数
        let icons = [];
        for (let i = 0; i < totalPairs; i++) {
            const icon = this.icons[i % this.icons.length];
            icons.push(icon, icon);
        }
        icons = this.shuffle(icons);
        
        // 优化图块放置逻辑，确保下层有足够支撑
        let index = 0;
        let attempts = 0;
        const maxAttempts = 1000; // 防止无限循环
        
        while (index < icons.length && attempts < maxAttempts) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            let currentHeight = 0;
            for (let z = 0; z < this.maxLayers; z++) {
                if (this.board[z][row][col] !== null) {
                    currentHeight++;
                }
            }
            
            // 检查是否可以放置（第一层或有支撑）
            if (currentHeight === 0 || (currentHeight < this.maxLayers && this.hasSupport(row, col, currentHeight))) {
                this.board[currentHeight][row][col] = {
                    icon: icons[index++],
                    layer: currentHeight
                };
            }
            attempts++;
        }
    }

    // 添加检查支撑的方法
    hasSupport(row, col, layer) {
        if (layer === 0) return true;
        return this.board[layer - 1][row][col] !== null;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    selectTile(row, col, layer) {
        if (!this.board[layer][row][col] || this.isGameOver) return;

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
            
            // 添加消除动画
            this.addMatchAnimation(
                this.selected.row, this.selected.col, this.selected.layer,
                row, col, layer
            );

            // 消除配对的图标
            this.board[this.selected.layer][this.selected.row][this.selected.col] = null;
            this.board[layer][row][col] = null;
            
            this.score += 100;
            
            if (this.checkGameOver()) {
                this.isGameOver = true;
                clearInterval(this.timer);
            }
        }

        this.selected = null;
        this.draw();
    }

    addMatchAnimation(row1, col1, layer1, row2, col2, layer2) {
        const startTime = performance.now();
        const duration = 500; // 动画持续500毫秒

        this.animations.push({
            type: 'match',
            startTime,
            duration,
            positions: [
                {row: row1, col: col1, layer: layer1},
                {row: row2, col: col2, layer: layer2}
            ]
        });
    }

    animate(currentTime = 0) {
        if (!this.gameStarted) {
            // 在游戏未开始时重绘开始界面
            this.drawStartScreen();
        } else {
            // 游戏开始后的动画逻辑
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;

            // 更新动画
            this.animations = this.animations.filter(animation => {
                const elapsed = currentTime - animation.startTime;
                return elapsed < animation.duration;
            });

            this.draw();
        }
        requestAnimationFrame(this.animate);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 设置层级偏移量和阴影效果
        const layerOffset = 10; // 减小层级偏移，使堆叠更紧凑
        
        // 绘制所有图块的阴影
        for (let z = 0; z < this.maxLayers; z++) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    const tile = this.board[z][i][j];
                    if (tile) {
                        const offsetX = j * this.tileSize + z * layerOffset;
                        const offsetY = i * this.tileSize + z * layerOffset;
                        
                        // 绘制阴影
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                        this.ctx.fillRect(
                            offsetX + 4,
                            offsetY + 4,
                            this.tileSize,
                            this.tileSize
                        );
                    }
                }
            }
        }
        
        // 从底层开始绘制实际图块
        for (let z = 0; z < this.maxLayers; z++) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    const tile = this.board[z][i][j];
                    if (tile) {
                        const offsetX = j * this.tileSize + z * layerOffset;
                        const offsetY = i * this.tileSize + z * layerOffset;
                        
                        // 绘制图块背景
                        this.ctx.fillStyle = this.getTileColor(z);
                        this.ctx.fillRect(
                            offsetX,
                            offsetY,
                            this.tileSize,
                            this.tileSize
                        );
                        
                        // 绘制边框
                        this.ctx.strokeStyle = '#fff';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(
                            offsetX,
                            offsetY,
                            this.tileSize,
                            this.tileSize
                        );
                        
                        // 绘制图标
                        this.ctx.font = '40px Arial';
                        this.ctx.fillStyle = '#fff';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(
                            tile.icon,
                            offsetX + this.tileSize / 2,
                            offsetY + this.tileSize / 2
                        );
                        
                        // 绘制选中效果
                        if (this.selected && 
                            this.selected.row === i && 
                            this.selected.col === j &&
                            this.selected.layer === z) {
                            this.ctx.strokeStyle = '#ff4444';
                            this.ctx.lineWidth = 3;
                            this.ctx.strokeRect(
                                offsetX,
                                offsetY,
                                this.tileSize,
                                this.tileSize
                            );
                        }
                    }
                }
            }
        }
        
        // 绘制动画
        this.animations.forEach(animation => {
            if (animation.type === 'match') {
                const elapsed = performance.now() - animation.startTime;
                const progress = elapsed / animation.duration;
                
                animation.positions.forEach(pos => {
                    this.ctx.save();
                    this.ctx.globalAlpha = 1 - progress;
                    this.ctx.translate(
                        pos.col * this.tileSize + this.tileSize / 2,
                        pos.row * this.tileSize + this.tileSize / 2
                    );
                    this.ctx.scale(1 + progress, 1 + progress);
                    this.ctx.fillStyle = '#ffeb3b';
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, this.tileSize / 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                });
            }
        });

        // 绘制提示
        this.hints.forEach(hint => {
            this.ctx.strokeStyle = '#ffeb3b';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(
                hint.col * this.tileSize, 
                hint.row * this.tileSize, 
                this.tileSize, 
                this.tileSize
            );
        });
        
        // 绘制游戏结束画面
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
    }

    getTileColor(layer) {
        // 根据层级返回不���的颜色
        const colors = [
            '#4CAF50', // 底层：绿色
            '#2196F3', // 第二层：蓝色
            '#9C27B0', // 第三层：紫色
            '#F44336'  // 顶层：红色
        ];
        return colors[layer] || colors[0];
    }

    findHint() {
        // 清除现有提示
        this.hints = [];
        
        // 从上层向下搜索配对的图标
        for (let z1 = this.maxLayers - 1; z1 >= 0; z1--) {
            for (let i1 = 0; i1 < this.rows; i1++) {
                for (let j1 = 0; j1 < this.cols; j1++) {
                    const tile1 = this.board[z1][i1][j1];
                    if (!tile1) continue;
                    
                    // 搜索另一个相同图标
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
            // 清除之前的提示定时器
            if (this.hintTimeout) clearTimeout(this.hintTimeout);
            
            // 3秒后清除提示
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
        
        // 游戏结束时保存分数
        this.saveScore();
        return true;
    }

    saveScore() {
        const scoreData = {
            score: this.score,
            time: this.time,
            date: new Date().toISOString()
        };
        
        try {
            let highScores = this.loadHighScores();
            // 确保 highScores 是数组
            if (!Array.isArray(highScores)) {
                highScores = [];
            }
            
            highScores.push(scoreData);
            highScores.sort((a, b) => b.score - a.score);
            highScores = highScores.slice(0, 10);
            
            localStorage.setItem('lianliankan_scores', JSON.stringify(highScores));
        } catch (error) {
            console.error('保存分数时出错:', error);
            // 如果出错，尝试重置分数存储
            localStorage.setItem('lianliankan_scores', JSON.stringify([]));
        }
    }

    loadHighScores() {
        try {
            const saved = localStorage.getItem('lianliankan_scores');
            if (!saved) return [];
            
            const scores = JSON.parse(saved);
            // 确保返回的是数组
            return Array.isArray(scores) ? scores : [];
        } catch (error) {
            console.error('加载分数时出错:', error);
            return [];
        }
    }

    getHighScores() {
        return this.loadHighScores();
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // 在组件销毁时清理事件监听器
    destroy() {
        this.canvas.removeEventListener('click', this.handleClick);
        if (this.timer) clearInterval(this.timer);
        if (this.hintTimeout) clearTimeout(this.hintTimeout);
    }
} 