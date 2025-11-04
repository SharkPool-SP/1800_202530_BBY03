import { auth } from "./main.js"; 
import { signInWithEmailAndPassword } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  // Firebase login
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Logged in as:", userCredential.user.email);
      window.location.href = "map.html";
    } catch (error) {
      console.error("❌ Login failed:", error.message);
      alert("Login failed: " + error.message);
    }
  });
});
