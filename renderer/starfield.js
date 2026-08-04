// starfield.js
// Persistent animated background: twinkling stars + occasional shooting stars.
// Runs behind every screen of the app.

(function () {
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  let stars = [];
  let shootingStars = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.floor((w * h) / 3500);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.02
    }));
  }

  function maybeSpawnShootingStar() {
    if (Math.random() < 0.006 && shootingStars.length < 2) {
      const startX = Math.random() * w * 0.6;
      const startY = Math.random() * h * 0.3;
      shootingStars.push({
        x: startX, y: startY,
        vx: 6 + Math.random() * 5, vy: 3 + Math.random() * 3,
        life: 1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // deep space gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#05070f");
    grad.addColorStop(1, "#0a1024");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    stars.forEach((s) => {
      s.phase += s.speed;
      const twinkle = 0.5 + 0.5 * Math.sin(s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + twinkle * 0.7})`;
      ctx.fill();
    });

    maybeSpawnShootingStar();
    shootingStars.forEach((s) => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(180,210,255,${s.life})`;
      ctx.lineWidth = 2;
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
      ctx.stroke();
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.02;
    });
    shootingStars = shootingStars.filter((s) => s.life > 0 && s.x < w + 50 && s.y < h + 50);

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
})();
