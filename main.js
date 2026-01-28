// 简易小猫咪跑酷 - 复刻 Google 小恐龙核心玩法

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");

// 适配高分屏
function setupHiDPI() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

setupHiDPI();
window.addEventListener("resize", () => {
  setupHiDPI();
  drawStaticScene();
});

// 游戏状态
let gameState = "idle"; // idle | running | over
let lastTime = 0;
let speed = 6;
let groundY = canvas.height / (window.devicePixelRatio || 1) - 40;

const cat = {
  x: 80,
  y: groundY - 40,
  width: 40,
  height: 40,
  vy: 0,
  gravity: 0.9,
  jumpForce: 15,
  isOnGround: true,
};

let obstacles = [];
let spawnTimer = 0;
let score = 0;
let highScore = Number(localStorage.getItem("catRunnerHighScore") || 0);
highScoreEl.textContent = highScore;

function resetGame() {
  speed = 6;
  cat.y = groundY - cat.height;
  cat.vy = 0;
  cat.isOnGround = true;
  obstacles = [];
  spawnTimer = 0;
  score = 0;
  scoreEl.textContent = "0";
}

function startGame() {
  if (gameState === "running") return;
  resetGame();
  gameState = "running";
  overlay.classList.add("hidden");
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function gameOver() {
  gameState = "over";
  overlayTitle.textContent = "游戏结束";
  overlayMessage.textContent = `你的得分：${Math.floor(
    score
  )} 分\n按 R 或点击下方按钮再来一次`;
  overlay.classList.remove("hidden");

  if (score > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem("catRunnerHighScore", highScore);
    highScoreEl.textContent = highScore;
  }
}

// 输入：跳跃
function jump() {
  if (cat.isOnGround) {
    cat.vy = -cat.jumpForce;
    cat.isOnGround = false;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    if (gameState === "idle") {
      startGame();
    } else if (gameState === "running") {
      jump();
    } else if (gameState === "over") {
      startGame();
    }
  } else if (e.code === "KeyR") {
    startGame();
  }
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// 障碍物
function spawnObstacle() {
  const isTall = Math.random() < 0.4;
  const width = isTall ? 28 : 22;
  const height = isTall ? 60 : 40;

  obstacles.push({
    x: canvas.width / (window.devicePixelRatio || 1) + 20,
    y: groundY - height,
    width,
    height,
  });
}

function updateObstacles(delta) {
  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = 700 + Math.random() * 600; // 0.7 - 1.3s
  }

  const move = speed * (delta / 16.67);

  obstacles.forEach((o) => {
    o.x -= move;
  });

  obstacles = obstacles.filter((o) => o.x + o.width > -20);
}

// 碰撞检测（AABB）
function isColliding(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
}

// 绘制
function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = canvas.width / dpr;

  ctx.save();
  ctx.translate(0, 0);
  ctx.strokeStyle = "#4b5563";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 0.5);
  ctx.lineTo(logicalWidth, groundY + 0.5);
  ctx.stroke();

  // 简单地面线条（模仿原版小恐龙）
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 1;
  for (let i = 0; i < logicalWidth; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, groundY + 6);
    ctx.lineTo(i + 15, groundY + 6);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCat() {
  ctx.save();
  ctx.translate(cat.x, cat.y);

  // 赛博霓虹轮廓（外发光）
  ctx.save();
  ctx.shadowColor = "rgba(56, 189, 248, 0.9)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(-4, 2, cat.width + 8, cat.height - 4, 10);
  ctx.fill();
  ctx.restore();

  // 身体主体（渐变装甲）
  const bodyGradient = ctx.createLinearGradient(0, 8, cat.width, cat.height);
  bodyGradient.addColorStop(0, "#22d3ee");
  bodyGradient.addColorStop(0.5, "#38bdf8");
  bodyGradient.addColorStop(1, "#a855f7");
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.roundRect(2, 10, cat.width - 4, cat.height - 10, 8);
  ctx.fill();

  // 头部（带金属质感）
  const headGradient = ctx.createLinearGradient(4, -6, 30, 20);
  headGradient.addColorStop(0, "#22d3ee");
  headGradient.addColorStop(0.5, "#0ea5e9");
  headGradient.addColorStop(1, "#6366f1");
  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.roundRect(4, -6, 28, 26, 8);
  ctx.fill();

  // 耳朵（锋利赛博耳）
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.moveTo(8, -4);
  ctx.lineTo(13, -18);
  ctx.lineTo(18, -4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(22, -4);
  ctx.lineTo(27, -18);
  ctx.lineTo(32, -4);
  ctx.closePath();
  ctx.fill();

  // 耳朵内侧亮片
  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.moveTo(11, -6);
  ctx.lineTo(13, -14);
  ctx.lineTo(15, -6);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(25, -6);
  ctx.lineTo(27, -14);
  ctx.lineTo(29, -6);
  ctx.closePath();
  ctx.fill();

  // 尾巴（带能量条）
  ctx.save();
  ctx.translate(cat.width - 4, 16);
  ctx.rotate(-0.1);
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.roundRect(0, 0, 16, 6, 3);
  ctx.fill();

  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.roundRect(3, 1.5, 8, 3, 2);
  ctx.fill();
  ctx.restore();

  // 眼睛（发光数码眼）
  const eyePulse = 0.6 + 0.4 * Math.sin(performance.now() / 180);
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(13, 3, 3, 0, Math.PI * 2);
  ctx.arc(22, 3, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = "rgba(56, 189, 248, 0.9)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.arc(13, 3, 1.6 + eyePulse * 0.4, 0, Math.PI * 2);
  ctx.arc(22, 3, 1.6 + eyePulse * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 机械鼻子
  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.roundRect(17 - 2, 8, 4, 2, 1);
  ctx.fill();

  // 下颚线
  ctx.strokeStyle = "rgba(148, 163, 184, 0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(13, 11);
  ctx.lineTo(21, 11);
  ctx.stroke();

  // 身体上的赛博线路
  ctx.strokeStyle = "#e0f2fe";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, 18);
  ctx.lineTo(8, 26);
  ctx.lineTo(16, 26);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(24, 20);
  ctx.lineTo(28, 20);
  ctx.lineTo(28, 30);
  ctx.stroke();

  ctx.restore();
}

function drawObstacles() {
  ctx.save();
  ctx.fillStyle = "#9ca3af";
  obstacles.forEach((o) => {
    ctx.beginPath();
    ctx.roundRect(o.x, o.y, o.width, o.height, 4);
    ctx.fill();
  });
  ctx.restore();
}

function drawClouds(delta) {
  // 简单伪云（不做状态保存，纯视觉）
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = canvas.width / dpr;

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#e5e7eb";

  const t = (performance.now() / 1000) * 0.2;
  const offset = (t * 40) % (logicalWidth + 200);

  function drawCloud(baseX, baseY, scale) {
    ctx.beginPath();
    ctx.arc(baseX, baseY, 12 * scale, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(baseX + 10 * scale, baseY - 12 * scale, 14 * scale, Math.PI, 0);
    ctx.arc(baseX + 20 * scale, baseY, 12 * scale, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  drawCloud(logicalWidth - offset, 60, 1);
  drawCloud(logicalWidth + 140 - offset, 40, 0.8);
  drawCloud(logicalWidth + 280 - offset, 70, 1.1);

  ctx.restore();
}

function drawStaticScene(delta = 16.67) {
  clear();
  drawClouds(delta);
  drawGround();
  drawCat();
  drawObstacles();
}

// 主循环
function loop(timestamp) {
  if (gameState !== "running") return;

  const delta = timestamp - lastTime || 16.67;
  lastTime = timestamp;

  // 更新
  // 重力与跳跃
  cat.vy += cat.gravity;
  cat.y += cat.vy;

  if (cat.y + cat.height >= groundY) {
    cat.y = groundY - cat.height;
    cat.vy = 0;
    cat.isOnGround = true;
  }

  updateObstacles(delta);

  // 提速与得分
  score += delta * 0.02;
  scoreEl.textContent = Math.floor(score);
  if (speed < 16) {
    speed += delta * 0.0005;
  }

  // 碰撞检测
  for (const o of obstacles) {
    if (
      isColliding(
        { x: cat.x, y: cat.y, width: cat.width, height: cat.height },
        o
      )
    ) {
      gameOver();
      drawStaticScene(delta);
      return;
    }
  }

  // 绘制
  drawStaticScene(delta);

  requestAnimationFrame(loop);
}

// 初始静态画面
overlayTitle.textContent = "小猫咪准备好了";
overlayMessage.textContent = "按空格或↑开始游戏，帮助小猫咪躲避障碍物！";
drawStaticScene();

