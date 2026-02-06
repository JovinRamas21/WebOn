// =======================
// Firebase Setup
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyD2i8d1usAifaTvqkNzgylOLU2XDtakAUk",
  authDomain: "webcon-concerns.firebaseapp.com",
  databaseURL: "https://webcon-concerns-default-rtdb.firebaseio.com",
  projectId: "webcon-concerns",
  storageBucket: "webcon-concerns.firebasestorage.app",
  messagingSenderId: "416233156932",
  appId: "1:416233156932:web:78a1dfce6c61cf030f2711",
  measurementId: "G-L6LFLKHP6P"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =======================
// Globals / Constants
// =======================
const PASSWORD = "Webconadmin";
const MAX_USERS = 4;
const SESSION_ID = "sess_" + Math.random().toString(36).slice(2);
const ALLOWED_EMAILS = [
  "josramas@proweaver.email",
  "darescandallo@proweaver.email",
  "jomtabornal@proweaver.email",
  "jhepanoncio@proweaver.email"
];

const STORAGE_KEY = "devChecklistTables";
const CLOUD_DOC = "devChecklists/default-checklist";

let tableCount = 0;
let localEditLock = false;
let tablesLoaded = false;

// =======================
// Checklist Data
// =======================
const concerns = [
  "OFDB", "Missing Content", "Idol Time", "404", "Orch Entry Missing", "Minify CSS/JS", "Darkmode",
  "Do Not Sell", "Permalink", "Dropdown", "Hover", "DSHRBD/SEO", "Cred Details Acc", "Cookies",
  "Fav Icon", "Break Task", "Check List", "Page Not Found", "?s-desc", "Alt Value", "Forms",
  "Highlight", "HTML & CSS Validation", "Pages Trash", "Feature", "Dummy Img PREM", "Banner",
  "Fonts", "Logo", "Responsive", "301", "Gtrans", "Theme"
];

const devs = [
  { team: "KEPPEL", name: "Xaviery Batucan", remarks: "DEV 3" },
  { team: "KEPPEL", name: "Clariss Ann Ladica", remarks: "DEV 2" },
  { team: "TALISAY", name: "Lloyd Caesar Neri", remarks: "DEV 3" },
  { team: "TALISAY", name: "Rich Rhynor Austria", remarks: "DEV 2" },
  { team: "TALISAY", name: "Steve Wilben Saceda", remarks: "DEV 2" },
  { team: "TALISAY", name: "Jemuel Rivero", remarks: "DEV 2" },
  { team: "TALISAY", name: "Hachi Drake Merto", remarks: "DEV 2" },
  { team: "TALISAY", name: "Ian Jhon Cubatcha", remarks: "DEV 2" },
  { team: "PROBATIONARY", name: "Khirt Manatad", remarks: "6 MONTHS" },
  { team: "PROBATIONARY", name: "Don Johnson Atillo", remarks: "6 MONTHS" },
  { team: "PROBATIONARY", name: "Jahmel Anne Junto", remarks: "6 MONTHS" },
  { team: "PROBATIONARY", name: "Justin Romera", remarks: "3 MONTHS" },
  { team: "PROBATIONARY", name: "Jomar Jade Ballebas", remarks: "3 MONTHS" },
  { team: "PROBATIONARY", name: "Hinlorie Rebaño", remarks: "3 MONTHS" }
];

// =======================
// LOGIN (index.html)
// =======================
function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!ALLOWED_EMAILS.includes(email)) return alert("Email not authorized");
  if (password !== PASSWORD) return alert("Incorrect password");

  const sessionsRef = db.ref("sessions");

  sessionsRef.once("value", snap => {
    // Removed MAX_USERS check to allow unlimited users

    db.ref(`sessions/${SESSION_ID}`).set({ email, joinedAt: Date.now() }).onDisconnect().remove();

    sessionStorage.setItem("loggedIn", "true");
    sessionStorage.setItem("email", email);
    sessionStorage.setItem("sessionId", SESSION_ID);

    location.href = "Main.html";
  });
}


// =======================
// PAGE GUARD (Main.html)
// =======================
function checkLogin() {
  const container = document.getElementById("tablesContainer");
  if (container && sessionStorage.getItem("loggedIn") !== "true") {
    location.replace("index.html");
  }
}

// =======================
// PRESENCE / ONLINE USERS
// =======================
function initPresence() {
  if (!sessionStorage.getItem("loggedIn")) return;

  const sessionEmail = sessionStorage.getItem("email");
  const presenceRef = db.ref(`presence/${SESSION_ID}`);

  // Add current user
  presenceRef.set({ email: sessionEmail, onlineAt: Date.now() });
  presenceRef.onDisconnect().remove();

  // Listen to online users
  db.ref("presence").on("value", snap => {
    const users = snap.val() || {};
    const list = document.getElementById("onlineUsers");
    if (!list) return;

    list.innerHTML = ""; // clear old list
    Object.values(users).forEach(u => {
      const li = document.createElement("li");
      li.textContent = u.email;
      list.appendChild(li);
    });
  });
}


// =======================
// TABLE GENERATION
// =======================
function generateTable(containerId, savedData = null) {
  tableCount++;
  const container = document.getElementById(containerId);
  if (!container) return;

  const tableId = `devTable_${tableCount}`;
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";
  wrapper.style.marginBottom = "30px";

  wrapper.innerHTML = `
    <div style="margin-bottom:10px;">
      <label style="font-weight:bold;margin-right:8px;">Checklist Date:</label>
      <input type="date" value="${savedData?.date || new Date().toISOString().split("T")[0]}">
    </div>
  `;

  const table = document.createElement("table");
  table.id = tableId;
  table.innerHTML = `
    <thead>
      <tr>
        <th rowspan="2">Hub</th>
        <th rowspan="2">Devs Name</th>
        <th rowspan="2">Remarks</th>
        <th colspan="${concerns.length}">Concerns</th>
        <th rowspan="2">Errors</th>
      </tr>
      <tr id="${tableId}-headers"></tr>
    </thead>
    <tbody id="${tableId}-body"></tbody>
    <tfoot>
      <tr id="${tableId}-totals"><td colspan="3"><strong>Total Errors</strong></td></tr>
    </tfoot>
  `;

  wrapper.appendChild(table);
  container.appendChild(wrapper);

  // Headers
  const headerRow = document.getElementById(`${tableId}-headers`);
  concerns.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c;
    headerRow.appendChild(th);
  });

  // Footer totals
  const totalsRow = document.getElementById(`${tableId}-totals`);
  concerns.forEach(() => {
    const td = document.createElement("td");
    td.className = "column-total";
    td.textContent = "0";
    totalsRow.appendChild(td);
  });
  const grand = document.createElement("td");
  grand.className = "grand-total";
  grand.textContent = "0";
  totalsRow.appendChild(grand);

  // Body rows
  const body = document.getElementById(`${tableId}-body`);
  devs.forEach((dev, r) => {
    const tr = document.createElement("tr");
    tr.className = dev.team.toLowerCase();
    tr.innerHTML = `<td>${dev.team}</td><td>${dev.name}</td><td>${dev.remarks}</td>`;

    concerns.forEach((_, c) => {
      const td = document.createElement("td");
      td.className = "checkbox-cell";

      const cb = document.createElement("input");
      cb.type = "checkbox";

      const ta = document.createElement("textarea");
      ta.className = "comment-box";
      ta.placeholder = "Add comment...";

      if (savedData?.rows?.[r]) {
        cb.checked = savedData.rows[r].checkboxes?.[c] || false;
        ta.value = savedData.rows[r].comments?.[c] || "";
        td.classList.toggle("has-comment", ta.value.trim() !== "");
      }

      td.append(cb, ta);
      tr.appendChild(td);
    });

    const err = document.createElement("td");
    err.className = "errors high";
    err.textContent = "0";
    tr.appendChild(err);

    body.appendChild(tr);
    updateErrorCount(tr);
  });

  updateColumnTotals(tableId);
  attachAutoSave(wrapper);
}

// =======================
// AUTO-SAVE ATTACH
// =======================
function attachAutoSave(wrapper) {
  wrapper.addEventListener("change", e => {
    if (e.target.matches("input[type='checkbox'], input[type='date']")) {
      const row = e.target.closest("tr");
      if (row) updateErrorCount(row);

      const table = e.target.closest("table");
      if (table) updateColumnTotals(table.id);

      saveTables();
    }
  });

  wrapper.addEventListener("input", e => {
    if (e.target.matches("textarea")) {
      const td = e.target.closest("td");
      td.classList.toggle("has-comment", e.target.value.trim() !== "");
      saveTables();
    }
  });
}

// =======================
// CALCULATIONS
// =======================
function updateErrorCount(row) {
  const count = [...row.querySelectorAll("input[type='checkbox']")].filter(cb => cb.checked).length;
  const cell = row.querySelector(".errors");
  cell.textContent = count;
  cell.className = "errors " + (count === 0 ? "low" : count <= 5 ? "medium" : "high");
}

function updateColumnTotals(tableId) {
  const table = document.getElementById(tableId);
  const totals = Array(concerns.length).fill(0);

  table.querySelectorAll("tbody tr").forEach(row => {
    row.querySelectorAll("input[type='checkbox']").forEach((cb, i) => {
      if (cb.checked) totals[i]++;
    });
  });

  table.querySelectorAll(".column-total").forEach((td, i) => td.textContent = totals[i]);
  table.querySelector(".grand-total").textContent = totals.reduce((a, b) => a + b, 0);
}

// =======================
// CLOUD LOAD
// =======================
async function loadFromCloud() {
  try {
    const snapshot = await db.ref(CLOUD_DOC).get();
    if (!snapshot.exists()) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.val().tables || []));
    console.log("☁️ Loaded from cloud");
    return true;
  } catch (err) {
    console.error("❌ Cloud load failed:", err);
    return false;
  }
}

// =======================
// REAL-TIME CLOUD SYNC
// =======================
function initRealTimeSync() {
  const cloudRef = db.ref(CLOUD_DOC);

  cloudRef.on("value", snap => {
    if (!snap.exists()) return;
    const cloudTables = snap.val().tables || [];

    if (localEditLock) return;

    localEditLock = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudTables));

    const container = document.getElementById("tablesContainer");
    if (!container) return;

    container.innerHTML = "";
    cloudTables.forEach(data => generateTable("tablesContainer", data));

    tablesLoaded = true;
    localEditLock = false;

    console.log("☁️ Real-time sync applied from cloud");
  });

  document.addEventListener("change", e => {
    if (!e.target.matches("input[type='checkbox'], textarea, input[type='date']")) return;
    saveTables(); 
  });
}

// =======================
// SAVE TABLES (Real-Time Push)
// =======================
function saveTables() {
  if (localEditLock) return;

  const data = [...document.querySelectorAll(".table-wrapper")].map(wrapper => ({
    date: wrapper.querySelector("input[type='date']").value,
    rows: [...wrapper.querySelectorAll("tbody tr")].map(tr => ({
      checkboxes: [...tr.querySelectorAll("input[type='checkbox']")].map(cb => cb.checked),
      comments: [...tr.querySelectorAll("textarea")].map(ta => ta.value)
    }))
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  db.ref(CLOUD_DOC).set({
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
    tables: data
  }).then(() => console.log("☁️ Local changes pushed to cloud"))
    .catch(err => console.error("❌ Failed to push local changes:", err));
}

// =======================
// INITIALIZE
// =======================
async function initApp() {
  checkLogin();
  initPresence();

  const container = document.getElementById("tablesContainer");
  if (!container) return;
  container.innerHTML = "";

  await loadFromCloud();

  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (!tablesLoaded) {
    if (saved.length) saved.forEach(data => generateTable("tablesContainer", data));
    else generateTable("tablesContainer");
    tablesLoaded = true;
  }

  initRealTimeSync();
}

// =======================
// BUTTON EVENTS
// =======================
document.addEventListener("DOMContentLoaded", () => {
  initApp();

  document.getElementById("addTableBtn")?.addEventListener("click", () => {
    generateTable("tablesContainer");
    saveTables();
  });

  document.getElementById("saveTablesBtn")?.addEventListener("click", () => {
    saveTables();
    alert("All tables saved successfully!");
  });
});

// =======================
// CLEANUP / PREVENT BACK NAVIGATION
// =======================
window.addEventListener("beforeunload", () => db.ref(`sessions/${SESSION_ID}`).remove());
history.pushState(null, null, location.href);
window.onpopstate = () => history.pushState(null, null, location.href);
