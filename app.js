// Hanova — Firebase Auth & App Logic (Corrected Version)

// Import Firebase SDKs (Use CDN for better compatibility)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWJbWlgMwXEb5UIQtsULvbhZG9Cf_XMsQ",
  authDomain: "hanova-fe572.firebaseapp.com",
  projectId: "hanova-fe572",
  storageBucket: "hanova-fe572.firebasestorage.app",
  messagingSenderId: "945214637153",
  appId: "1:945214637153:web:42843555e33683d7895620",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence
setPersistence(auth, browserLocalPersistence).catch((e) => {
  console.warn("Auth persistence error:", e.message);
});

// Helper Functions
function isLocalDevHost() {
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function showAuthHostBanner() {
  const banner = document.getElementById("auth-host-banner");
  const link = document.getElementById("auth-localhost-link");
  if (!banner || !link) return;
  const port = location.port || "3000";
  const localhostUrl = `${location.protocol}//localhost:${port}${location.pathname}`;
  link.href = localhostUrl;
  link.textContent = localhostUrl;
  banner.hidden = isLocalDevHost();
}

function assertFirebaseHost(errEl) {
  if (location.protocol === "file:") {
    if (errEl) {
      errEl.textContent =
        "Open via http://localhost:3000 — do not double-click index.html.";
      errEl.hidden = false;
    }
    return false;
  }
  if (!isLocalDevHost() && location.hostname !== "hanadmahdi66-dotcom.github.io") {
    if (errEl) {
      errEl.textContent = `Firebase blocks "${location.hostname}". Open http://localhost:${location.port || "3000"} instead.`;
      errEl.hidden = false;
    }
    showAuthHostBanner();
    return false;
  }
  return true;
}

const PAYMENT_NUMBER = "+252633718556";
const USSD_PREFIX = "2200633718556";
const SPLASH_DURATION_MS = 6000;
const FREE_UPLOAD_LIMIT = 20;

const PLAN_LABELS = {
  free: "Free",
  basic: "Basic ($0.99)",
  plus: "Plus ($1.5)",
  premium: "Premium ($2)",
};

// State
let currentUser = null;
let selectedPlan = null;
let selectedAmount = 0;
let splashDone = false;

// DOM Elements
const screens = {
  splash: document.getElementById("screen-splash"),
  auth: document.getElementById("screen-auth"),
  plans: document.getElementById("screen-plans"),
  payment: document.getElementById("screen-payment"),
  home: document.getElementById("screen-home"),
  ai: document.getElementById("screen-ai"),
  history: document.getElementById("screen-history"),
  settings: document.getElementById("screen-settings"),
  profile: document.getElementById("screen-profile"),
  privacy: document.getElementById("screen-privacy"),
};

const modalWaiting = document.getElementById("modal-waiting");
const waitTimeEl = document.getElementById("wait-time");
const toastEl = document.getElementById("toast");

// Screen Management
function showScreen(id) {
  Object.values(screens).forEach((el) => {
    if (el) el.classList.remove("active");
  });
  const target = screens[id] || document.getElementById(`screen-${id}`);
  if (target) target.classList.add("active");
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.hidden = false;
  setTimeout(() => {
    if (toastEl) toastEl.hidden = true;
  }, 2800);
}

// Firebase User Data Functions
async function saveUserDataToFirestore(uid, data) {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving to Firestore:", error);
    return false;
  }
}

async function getUserDataFromFirestore(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return {};
  } catch (error) {
    console.error("Error reading from Firestore:", error);
    return {};
  }
}

// Local Storage Backup (for offline)
function storageKey(key) {
  const uid = currentUser?.uid || "guest";
  return `hanova_${uid}_${key}`;
}

function setUserData(data, uid) {
  const id = uid || currentUser?.uid || "guest";
  const key = `hanova_${id}_profile`;
  const existing = JSON.parse(localStorage.getItem(key) || "{}");
  localStorage.setItem(key, JSON.stringify({ ...existing, ...data }));
  
  // Also save to Firestore if user is logged in
  if (currentUser?.uid === id) {
    saveUserDataToFirestore(id, data);
  }
}

async function getUserData() {
  const uid = currentUser?.uid;
  if (!uid) {
    try {
      return JSON.parse(localStorage.getItem("hanova_guest_profile") || "{}");
    } catch {
      return {};
    }
  }
  
  // Try to get from Firestore first
  const firestoreData = await getUserDataFromFirestore(uid);
  if (Object.keys(firestoreData).length > 0) {
    // Sync to localStorage
    localStorage.setItem(`hanova_${uid}_profile`, JSON.stringify(firestoreData));
    return firestoreData;
  }
  
  // Fallback to localStorage
  try {
    return JSON.parse(localStorage.getItem(`hanova_${uid}_profile`) || "{}");
  } catch {
    return {};
  }
}

function isPremium() {
  const data = getUserData();
  const plan = data.plan || "free";
  return plan !== "free";
}

function getUploadCountToday() {
  const key = storageKey("uploads");
  const raw = JSON.parse(localStorage.getItem(key) || "{}");
  const today = new Date().toDateString();
  if (raw.date !== today) return 0;
  return raw.count || 0;
}

function incrementUploadCount() {
  const key = storageKey("uploads");
  const today = new Date().toDateString();
  const raw = JSON.parse(localStorage.getItem(key) || "{}");
  const count = raw.date === today ? (raw.count || 0) + 1 : 1;
  localStorage.setItem(key, JSON.stringify({ date: today, count }));
  
  // Update Firestore if user is logged in
  if (currentUser) {
    saveUserDataToFirestore(currentUser.uid, {
      uploadsToday: count,
      lastUploadDate: today,
    });
  }
  
  return count;
}

function addHistory(entry) {
  const key = storageKey("history");
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  list.unshift({ ...entry, date: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  
  // Update Firestore history
  if (currentUser) {
    saveUserDataToFirestore(currentUser.uid, {
      lastAction: entry,
      lastActionDate: new Date().toISOString(),
    });
  }
}

function renderHistory() {
  const list = document.getElementById("history-list");
  const empty = document.getElementById("history-empty");
  if (!list || !empty) return;
  
  const items = JSON.parse(localStorage.getItem(storageKey("history")) || "[]");
  list.innerHTML = "";
  if (!items.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  items.forEach((item) => {
    const li = document.createElement("li");
    const date = new Date(item.date).toLocaleString();
    li.innerHTML = `
      <div class="hist-type">${escapeHtml(item.type)}</div>
      <div>${escapeHtml(item.summary)}</div>
      <div class="hist-date">${date}</div>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function updateHomeUI() {
  const data = getUserData();
  const name = data.displayName || currentUser?.displayName || "Guest";
  
  const greetingEl = document.getElementById("home-greeting");
  if (greetingEl) greetingEl.textContent = `Good day, ${name.split(" ")[0]}`;
  
  const planBadge = document.getElementById("user-plan-badge");
  if (planBadge) planBadge.textContent = PLAN_LABELS[data.plan] || "Free";
  
  const profileName = document.getElementById("profile-name");
  if (profileName) profileName.textContent = name;
  
  const profileEmail = document.getElementById("profile-email");
  if (profileEmail) profileEmail.textContent = currentUser?.email || data.email || "—";
  
  const profilePlan = document.getElementById("profile-plan");
  if (profilePlan) profilePlan.textContent = PLAN_LABELS[data.plan] || "Free";
  
  const profileAvatar = document.getElementById("profile-avatar");
  if (profileAvatar) profileAvatar.textContent = (name[0] || "H").toUpperCase();
  
  setupAIUI();
}

function setupAIUI() {
  const premium = isPremium();
  const chatBar = document.getElementById("ai-premium-chat");
  const uploadsBadge = document.getElementById("uploads-remaining");

  if (chatBar) chatBar.hidden = !premium;

  if (!premium && uploadsBadge) {
    const remaining = FREE_UPLOAD_LIMIT - getUploadCountToday();
    uploadsBadge.hidden = false;
    uploadsBadge.textContent = `${Math.max(0, remaining)} uploads left today`;
  } else if (uploadsBadge) {
    uploadsBadge.hidden = true;
  }
}

function buildUssdCode(amount) {
  return `${USSD_PREFIX}*${amount}#`;
}

function generateEloquentResponse(context, type) {
  const openings = [
    "Upon thoughtful consideration,",
    "It is my pleasure to reflect that",
    "With refined discernment, one may observe that",
    "In the spirit of elegant inquiry,",
  ];
  const open = openings[Math.floor(Math.random() * openings.length)];

  if (type === "photo") {
    return `${open} your image conveys a narrative rich in detail and atmosphere. The composition suggests intentionality—a visual language that speaks to both memory and aspiration. Hanova interprets this moment as worthy of preservation and contemplation.`;
  }
  if (type === "file") {
    return `${open} the text you have shared unfolds with clarity and purpose. Its themes resonate with the pursuit of understanding. Allow this insight to guide your next steps with confidence and grace.`;
  }
  return `${open} your question invites a response woven with care. The essence of your inquiry points toward growth, clarity, and the quiet luxury of well-considered action. Hanova stands ready to illuminate the path ahead.`;
}

function displayAIResponse(html) {
  const el = document.getElementById("ai-response");
  if (!el) return;
  el.classList.remove("empty");
  el.innerHTML = html;
}

// Splash Screen
function startSplash() {
  setTimeout(() => {
    splashDone = true;
    routeAfterSplash();
  }, SPLASH_DURATION_MS);
}

async function routeAfterSplash() {
  if (!splashDone) return;
  if (currentUser) {
    const data = await getUserData();
    if (data.plan) {
      showScreen("home");
      updateHomeUI();
    } else {
      showScreen("plans");
    }
  } else {
    showScreen("auth");
    showAuthHostBanner();
  }
}

// Authentication
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach((f) => f.classList.remove("active"));
    btn.classList.add("active");
    const formId = `form-${btn.dataset.tab}`;
    const form = document.getElementById(formId);
    if (form) form.classList.add("active");
  });
});

const signupForm = document.getElementById("form-signup");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("signup-error");
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (errEl) errEl.hidden = true;

    const name = document.getElementById("signup-name")?.value.trim() || "";
    const email = document.getElementById("signup-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("signup-password")?.value || "";

    const validationError = validateAuthInput(email, password);
    if (validationError && errEl) {
      errEl.textContent = validationError;
      errEl.hidden = false;
      return;
    }

    if (!assertFirebaseHost(errEl)) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating account…";
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      currentUser = cred.user;
      
      // Save user data to both localStorage and Firestore
      await setUserData({ displayName: name, email }, cred.user.uid);
      await saveUserDataToFirestore(cred.user.uid, {
        displayName: name,
        email: email,
        plan: null,
        createdAt: new Date().toISOString(),
      });

      try {
        await updateProfile(cred.user, { displayName: name });
      } catch (profileErr) {
        console.warn("Display name update skipped:", profileErr);
      }

      showScreen("plans");
      showToast("Account created successfully");
    } catch (err) {
      console.error("Sign up error:", err.code, err.message);
      if (errEl) {
        errEl.textContent = friendlyAuthError(err);
        errEl.hidden = false;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
      }
    }
  });
}

const loginForm = document.getElementById("form-login");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("login-error");
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (errEl) errEl.hidden = true;

    const email = document.getElementById("login-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("login-password")?.value || "";

    const validationError = validateAuthInput(email, password, true);
    if (validationError && errEl) {
      errEl.textContent = validationError;
      errEl.hidden = false;
      return;
    }

    if (!assertFirebaseHost(errEl)) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in…";
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      currentUser = cred.user;
      const data = await getUserData();
      
      if (!data.displayName && cred.user.displayName) {
        await setUserData({ displayName: cred.user.displayName, email });
      }
      
      if (data.plan) {
        showScreen("home");
        updateHomeUI();
      } else {
        showScreen("plans");
      }
      showToast("Welcome back");
    } catch (err) {
      console.error("Log in error:", err.code, err.message);
      if (errEl) {
        errEl.textContent = friendlyAuthError(err);
        errEl.hidden = false;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Log In";
      }
    }
  });
}

function validateAuthInput(email, password, isLogin = false) {
  if (!email) return "Please enter your Gmail address.";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) return "Please enter a valid email address (e.g. you@gmail.com).";
  if (!isLogin && password.length < 6) return "Password must be at least 6 characters.";
  if (!password) return "Please enter your password.";
  return null;
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  const map = {
    "auth/email-already-in-use": "This email is already registered. Use Log In instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-not-found": "No account found with this email. Please Sign Up first.",
    "auth/wrong-password": "Incorrect password. Try again or reset it in Firebase Console.",
    "auth/invalid-credential": "Wrong email or password. If you are new, use Sign Up.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/operation-not-allowed":
      "Email sign-in is disabled in Firebase. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.",
    "auth/unauthorized-domain": () =>
      `Firebase blocked "${location.hostname}". Open http://localhost:${location.port || "3000"} (not the Network IP). Add "localhost" in Firebase → Authentication → Settings → Authorized domains.`,
    "auth/network-request-failed":
      "Network error. Check your internet connection and try again.",
    "auth/configuration-not-found": "Firebase project not found. Verify your firebaseConfig settings.",
    "auth/invalid-api-key": "Invalid Firebase API key. Check your project settings.",
    "auth/missing-password": "Please enter a password.",
    "auth/missing-email": "Please enter your email address.",
    "auth/admin-restricted-operation": "This sign-in method is restricted. Enable Email/Password in Firebase Console.",
  };

  if (map[code]) {
    const msg = map[code];
    return typeof msg === "function" ? msg() : msg;
  }

  if (err?.message) {
    const cleaned = err.message
      .replace(/^Firebase:\s*/i, "")
      .replace(/\s*\(auth\/[^)]+\)\.?\s*$/i, "")
      .trim();
    if (cleaned && cleaned !== "Error") return cleaned;
  }

  return `Sign-in failed (${code || "unknown"}). Enable Email/Password in Firebase Console and add this site to Authorized domains.`;
}

// Plans Selection
document.querySelectorAll(".plan-card .btn-plan").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".plan-card");
    if (!card) return;
    
    selectedPlan = card.dataset.plan;
    selectedAmount = parseFloat(card.dataset.amount);

    if (selectedPlan === "free") {
      setUserData({ plan: "free", amount: 0 });
      showScreen("home");
      updateHomeUI();
      showToast("Free plan activated — enjoy AI uploads");
      return;
    }

    const amountDisplay = document.getElementById("payment-amount-display");
    const ussdCode = document.getElementById("ussd-code");
    
    if (amountDisplay) amountDisplay.textContent = `$${selectedAmount}`;
    if (ussdCode) ussdCode.textContent = buildUssdCode(selectedAmount);
    
    showScreen("payment");
  });
});

// Payment
const copyBtn = document.getElementById("btn-copy-ussd");
if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    const code = document.getElementById("ussd-code")?.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      showToast("Payment code copied");
    } catch {
      showToast("Copy: " + code);
    }
  });
}

const paymentSentBtn = document.getElementById("btn-payment-sent");
if (paymentSentBtn) {
  paymentSentBtn.addEventListener("click", () => {
    const waitMinutes = selectedAmount >= 1.5 ? 5 : 2;
    let remainingSec = waitMinutes * 60;
    if (waitTimeEl) waitTimeEl.textContent = waitMinutes;
    if (modalWaiting) modalWaiting.hidden = false;

    const countdown = setInterval(() => {
      remainingSec -= 1;
      const mins = Math.ceil(remainingSec / 60);
      if (waitTimeEl) waitTimeEl.textContent = mins > 0 ? mins : 0;
      if (remainingSec <= 0) clearInterval(countdown);
    }, 1000);

    setTimeout(() => {
      clearInterval(countdown);
      if (modalWaiting) modalWaiting.hidden = true;
      setUserData({ plan: selectedPlan, amount: selectedAmount });
      showScreen("home");
      updateHomeUI();
      showToast("Plan activated — welcome to Hanova Premium");
    }, waitMinutes * 60 * 1000);
  });
}

// Navigation
function navigateTo(target) {
  if (target === "home") showScreen("home");
  else if (target === "ai") {
    showScreen("ai");
    setupAIUI();
  } else if (target === "history") {
    showScreen("history");
    renderHistory();
  } else if (target === "settings") showScreen("settings");
}

document.querySelectorAll("[data-nav]").forEach((el) => {
  el.addEventListener("click", () => {
    const nav = el.dataset.nav;
    document.querySelectorAll(".nav-item").forEach((n) => {
      n.classList.toggle("active", n.dataset.nav === nav);
    });
    navigateTo(nav);
  });
});

document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const backTo = btn.dataset.back;
    if (backTo) navigateTo(backTo);
  });
});

document.querySelectorAll("[data-settings]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.settings === "profile") {
      updateHomeUI();
      showScreen("profile");
    } else if (btn.dataset.settings === "privacy") {
      showScreen("privacy");
    }
  });
});

const logoutBtn = document.getElementById("btn-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      currentUser = null;
      showScreen("auth");
      showToast("Logged out");
    } catch {
      showToast("Could not log out");
    }
  });
}

// AI Uploads
async function handlePhotoUpload(file) {
  if (!isPremium()) {
    if (getUploadCountToday() >= FREE_UPLOAD_LIMIT) {
      showToast("Daily upload limit reached (20). Upgrade for unlimited access.");
      return;
    }
    incrementUploadCount();
    setupAIUI();
  }

  const url = URL.createObjectURL(file);
  const answer = generateEloquentResponse(file.name, "photo");
  displayAIResponse(`
    <img class="ai-preview-img" src="${url}" alt="Uploaded" style="max-width: 100%; border-radius: 8px; margin-bottom: 1rem;">
    <p class="ai-answer">${escapeHtml(answer)}</p>
  `);
  addHistory({ type: "Photo Upload", summary: answer.slice(0, 120) + "…" });
}

async function handleTextFileUpload(file) {
  if (!isPremium()) {
    if (getUploadCountToday() >= FREE_UPLOAD_LIMIT) {
      showToast("Daily upload limit reached (20). Upgrade for unlimited access.");
      return;
    }
    incrementUploadCount();
    setupAIUI();
  }

  const text = await file.text();
  const preview = text.slice(0, 200);
  const answer = generateEloquentResponse(preview, "file");
  displayAIResponse(`<p class="ai-answer">${escapeHtml(answer)}</p>`);
  addHistory({ type: "Text File Upload", summary: answer.slice(0, 120) + "…" });
}

const photoUpload = document.getElementById("upload-photo");
if (photoUpload) {
  photoUpload.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoUpload(file);
    e.target.value = "";
  });
}

const textFileUpload = document.getElementById("upload-text-file");
if (textFileUpload) {
  textFileUpload.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleTextFileUpload(file);
    e.target.value = "";
  });
}

// AI Chat
const sendTextBtn = document.getElementById("btn-send-text");
if (sendTextBtn) {
  sendTextBtn.addEventListener("click", () => {
    if (!isPremium()) {
      showToast("Sending text requires a Premium plan");
      return;
    }
    const input = document.getElementById("ai-text-input");
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    const answer = generateEloquentResponse(text, "chat");
    displayAIResponse(`<p class="ai-answer">${escapeHtml(answer)}</p>`);
    addHistory({ type: "AI Chat", summary: text.slice(0, 80) });
    input.value = "";
  });
}

const aiTextInput = document.getElementById("ai-text-input");
if (aiTextInput) {
  aiTextInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const sendBtn = document.getElementById("btn-send-text");
      if (sendBtn) sendBtn.click();
    }
  });
}

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user && splashDone) {
    const data = await getUserData();
    if (!data.displayName && user.displayName) {
      await setUserData({ displayName: user.displayName, email: user.email });
    }
    
    const activeScreen = document.querySelector(".screen.active");
    if (data.plan && activeScreen && 
        (activeScreen === screens.splash || activeScreen === screens.auth)) {
      showScreen("home");
      updateHomeUI();
    }
  }
});

// Initialize App
showAuthHostBanner();
showScreen("splash");
startSplash();
