import { auth } from "./main.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import QuartzParticles from "https://cdn.jsdelivr.net/gh/SharkPool-SP/Quartz-Particles/src/lib/quartz-particles.min.js";

document.addEventListener("DOMContentLoaded", () => {
  // particle effects
  const myEngine = new QuartzParticles();
  myEngine.initialize({
    width: window.screen.width,
    height: window.screen.height,
  });
  const particleDiv = document.getElementById("particles");
  particleDiv.appendChild(myEngine.engine.canvas);

  myEngine.createEmitter("emitter-1", [0, 0], "", {
    maxP: { val: 300, inf: 0 },
    emission: { val: 0, inf: 1 },
    time: { val: 1.85, inf: 0.2 },
    speed: { val: 5, inf: 0 },
    xPos: { val: 0, inf: window.screen.width / 2 },
    yPos: { val: window.screen.height / -2, inf: 0 },
    gravX: { val: 0, inf: 0 },
    gravY: { val: 0, inf: 0 },
    sDir: { val: 0, inf: 25 },
    eDir: { val: 0, inf: 0 },
    sSpin: { val: 0, inf: 720 },
    eSpin: { val: 0, inf: 360 },
    sSize: { val: 30, inf: 10 },
    eSize: { val: 10, inf: 5 },
    sStreX: { val: 100, inf: 0 },
    eStreX: { val: 100, inf: 0 },
    sStreY: { val: 100, inf: 0 },
    eStreY: { val: 100, inf: 0 },
    accelRad: { val: 0, inf: 0 },
    accelTan: { val: 0, inf: 0 },
    sinW: { val: 0, inf: 40 },
    cosW: { val: 0, inf: 40 },
    sinS: { val: 1, inf: 3 },
    cosS: { val: 1, inf: 3 },
    fIn: { val: 0, inf: 0 },
    fOut: { val: 50, inf: 20 },
    sCol: { val: [149, 66, 214], inf: 10 },
    eCol: { val: [149, 66, 214], inf: 10 },
  });

  function animate(time) {
    myEngine.updateEngine(1);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  const form = document.getElementById("loginForm");

  // Firebase login
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("✅ Logged in as:", userCredential.user.email);
      window.location.href = "map.html";
    } catch (error) {
      console.error("❌ Login failed:", error.message);
      alert("Login failed: " + error.message);
    }
  });
});
