const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ----------------- Paddle -----------------
let paddleWidth = 100, paddleHeight = 15;
let paddleX = (canvas.width - paddleWidth) / 2;
const paddleY = canvas.height - 40;
const paddleSpeed = 7;

// ----------------- Ball -----------------
let ballRadius = 10;
let balls = [{ x: canvas.width/2, y: canvas.height-60, dx:4, dy:-4 }];

// ----------------- Bricks -----------------
const brickRows = 6;
const brickCols = 8;
const brickWidth = canvas.width / brickCols - 10;
const brickHeight = 25;
let bricks = [];
const rowColors = ["#f33","#fa0","#ff0","#0c0","#0cc","#a0f"];

function createBricks(){
  bricks = [];
  for(let r=0;r<brickRows;r++){
    for(let c=0;c<brickCols;c++){
      bricks.push({
        x: c*(brickWidth+10)+35,
        y: r*(brickHeight+10)+50,
        width: brickWidth,
        height: brickHeight,
        color: rowColors[r % rowColors.length],
        hitAnimation: 0
      });
    }
  }
}
createBricks();

// ----------------- Score & Powerups -----------------
let score = 0, lives = 3, level = 1;
let highscore = localStorage.getItem("highscore") || 0;

let powerups = [];
const powerupSize = 20;
const powerupTypes = ["expand","shrink","multiball","slow","fast","life"];

function spawnPowerup(x,y){
  if(Math.random()<0.35){
    const type = powerupTypes[Math.floor(Math.random()*powerupTypes.length)];
    powerups.push({x,y,type});
  }
}

function drawPowerups(){
  powerups.forEach(p=>{
    ctx.font="18px Arial";
    const icon = { expand:"⇔", shrink:"⇕", multiball:"⚪", slow:"🐢", fast:"⚡", life:"❤" }[p.type];
    ctx.fillStyle = {
      expand:"#0f0",
      shrink:"#f00",
      multiball:"#fa0",
      slow:"#a0f",
      fast:"#0cc",
      life:"#ff0"
    }[p.type];
    ctx.fillText(icon,p.x-9,p.y+16);
  });
}

// ----------------- Controls -----------------
let leftPressed=false, rightPressed=false;
document.addEventListener("keydown", e=>{
  if(e.key==="ArrowLeft") leftPressed=true;
  if(e.key==="ArrowRight") rightPressed=true;
});
document.addEventListener("keyup", e=>{
  if(e.key==="ArrowLeft") leftPressed=false;
  if(e.key==="ArrowRight") rightPressed=false;
});

// Mouse / touch
canvas.addEventListener("mousemove", e=>{
  const rect = canvas.getBoundingClientRect();
  paddleX = e.clientX - rect.left - paddleWidth/2;
  if(paddleX<0) paddleX=0;
  if(paddleX+paddleWidth>canvas.width) paddleX=canvas.width-paddleWidth;
});

// ----------------- Main Game Loop -----------------
function gameLoop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // --- Paddle ---
  if(leftPressed && paddleX>0) paddleX -= paddleSpeed;
  if(rightPressed && paddleX<canvas.width-paddleWidth) paddleX += paddleSpeed;
  const grad = ctx.createLinearGradient(paddleX,0,paddleX+paddleWidth,0);
  grad.addColorStop(0,"#50aaff");
  grad.addColorStop(1,"#0cc");
  ctx.fillStyle=grad;
  ctx.shadowColor="#0cc";
  ctx.shadowBlur=15;
  ctx.fillRect(paddleX,paddleY,paddleWidth,paddleHeight);
  ctx.shadowBlur=0;

  // --- Balls ---
  balls.forEach((ball,bi)=>{
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Walls
    if(ball.x-ballRadius<=0 || ball.x+ballRadius>=canvas.width) ball.dx*=-1;
    if(ball.y-ballRadius<=0) ball.dy*=-1;

    // Paddle collision
    if(ball.y+ballRadius >= paddleY && ball.x>paddleX && ball.x<paddleX+paddleWidth){
      const collidePoint = ball.x-(paddleX+paddleWidth/2);
      const normalized = collidePoint/(paddleWidth/2);
      const angle = normalized*(Math.PI/3);
      const speed = Math.sqrt(ball.dx*ball.dx + ball.dy*ball.dy);
      ball.dx = speed*Math.sin(angle);
      ball.dy = -Math.abs(speed*Math.cos(angle));
    }

    // Brick collision
    for(let i=0;i<bricks.length;i++){
      const br = bricks[i];
      if(ball.x>br.x && ball.x<br.x+br.width && ball.y-ballRadius<br.y+br.height && ball.y+ballRadius>br.y){
        ball.dy*=-1;
        score+=10;
        br.hitAnimation = 5; // trigger animation
        spawnPowerup(br.x+br.width/2, br.y+br.height/2);
        bricks.splice(i,1);
        break;
      }
    }

    // Ball fall below
    if(ball.y>canvas.height){
      balls.splice(bi,1);
      if(balls.length===0){
        lives--;
        if(lives>0) balls.push({x:canvas.width/2,y:canvas.height-60,dx:4+level*0.5,dy:-4-level*0.5});
        else { showGameOver(); return; }
      }
    }

    // Draw ball
    const ballGrad = ctx.createRadialGradient(ball.x,ball.y,0,ball.x,ball.y,ballRadius);
    ballGrad.addColorStop(0,"#ff0");
    ballGrad.addColorStop(1,"#fa0");
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ball.x,ball.y,ballRadius,0,Math.PI*2);
    ctx.fill();
    ctx.closePath();
  });

  // --- Powerups ---
  powerups.forEach((p,pi)=>{
    p.y+=3;
    if(p.y+powerupSize>=paddleY && p.x>paddleX && p.x<paddleX+paddleWidth){
      applyPowerup(p);
      powerups.splice(pi,1);
    }
  });
  drawPowerups();

  // --- Bricks ---
  bricks.forEach(br=>{
    ctx.fillStyle=br.color;
    ctx.fillRect(br.x,br.y,br.width,br.height);
  });

  // --- Level complete ---
  if(bricks.length===0){
    level++;
    createBricks();
    balls=[{x:canvas.width/2, y:canvas.height-60, dx:4+level*0.5, dy:-4-level*0.5}];
    paddleWidth=100;
    powerups=[];
  }

  // --- Scoreboard ---
  document.getElementById("scoreBoard").innerText=
    `Score: ${score} | Lives: ${lives} | Level: ${level} | High Score: ${highscore}`;

  requestAnimationFrame(gameLoop);
}

// ----------------- Powerup -----------------
function applyPowerup(p){
  if(p.type==="expand") paddleWidth=Math.min(paddleWidth+40,200);
  if(p.type==="shrink") paddleWidth=Math.max(paddleWidth-40,60);
  if(p.type==="multiball") balls.push({x:balls[0].x,y:balls[0].y,dx:-4,dy:-4});
  if(p.type==="slow") balls.forEach(b=>{b.dx*=0.8;b.dy*=0.8;});
  if(p.type==="fast") balls.forEach(b=>{b.dx*=1.2;b.dy*=1.2;});
  if(p.type==="life") lives++;
}

// ----------------- Game Over -----------------
function showGameOver(){
  if(score>highscore){
    highscore=score;
    localStorage.setItem("highscore",highscore);
  }
  ctx.fillStyle="rgba(0,0,0,0.7)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#fa0";
  ctx.font="50px Arial";
  ctx.textAlign="center";
  ctx.fillText("GAME OVER",canvas.width/2,canvas.height/2-30);
  ctx.font="30px Arial";
  ctx.fillText(`Final Score: ${score}`,canvas.width/2,canvas.height/2+20);
  ctx.fillText("Press F5 to Restart",canvas.width/2,canvas.height/2+60);
}

// ----------------- Reset -----------------
function resetGame(){
  score=0; lives=3; level=1;
  createBricks();
  balls=[{x:canvas.width/2,y:canvas.height-60,dx:4,dy:-4}];
  paddleWidth=100;
  powerups=[];
}

gameLoop();
