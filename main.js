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
const auth = firebase.auth();

// =======================
// CONSTANTS & STATE
// =======================
const SESSION_ID = sessionStorage.getItem("sessionId");
const STORAGE_KEY = "devChecklistTables";
const CLOUD_DOC = "devChecklists/default-checklist";
const USER_COLOR_KEY = "userColor";
let tableCount = 0;
let isLocalEdit = false;
let isApplyingRemote = false;
let tablesLoaded = false;

// Assign random color to user
function getUserColor() {
  let color = sessionStorage.getItem(USER_COLOR_KEY);
  if (!color) {
    color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 75%)`;
    sessionStorage.setItem(USER_COLOR_KEY, color);
  }
  return color;
}
const USER_COLOR = getUserColor();

// =======================
// DATA
// =======================
const concerns = [
  "OFDB","Missing Content","Idol Time","404","Orch Entry Missing","Minify CSS/JS","Darkmode",
  "Do Not Sell","Permalink","Dropdown","Hover","DSHRBD/SEO","Cred Details Acc","Cookies",
  "Fav Icon","Break Task","Check List","Page Not Found","?s-desc","Alt Value","Forms",
  "Highlight","HTML & CSS Validation","Pages Trash","Feature","Dummy Img PREM","Banner",
  "Fonts","Logo","Responsive","301","Gtrans","Theme"
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
// PAGE GUARD
// =======================
function checkLogin() {
  if (!SESSION_ID || !sessionStorage.getItem("loggedIn")) {
    location.replace("index.html");
  }
}

// =======================
// PRESENCE / ONLINE USERS
// =======================
function initPresence() {
  if (!SESSION_ID) return;
  const email = sessionStorage.getItem("email");
  const presenceRef = db.ref(`presence/${SESSION_ID}`);

  // Set presence with color & activity
  presenceRef.set({
    email,
    color: USER_COLOR,
    onlineAt: Date.now(),
    activity: null
  });
  presenceRef.onDisconnect().remove();

  // Listen for online users and update list & highlights
  db.ref("presence").on("value", snap => {
    const users = snap.val() || {};
    renderOnlineUsers(users);
    applyUserHighlights(users);
  });
}

// Show users in the online list
function renderOnlineUsers(users) {
  const ul = document.getElementById("onlineUsers");
ul.innerHTML = "";
Object.values(users).forEach(u => {
  const li = document.createElement("li");
  li.textContent = u.email;
  li.style.color = u.color || "#000";
  ul.appendChild(li);
});
}

// Update user's current activity (cell being edited)
function updateUserActivity(info) {
  if (!SESSION_ID) return;
  db.ref(`presence/${SESSION_ID}/activity`).set(info);
}

// Apply color highlights for other users with hover name
function applyUserHighlights(users) {
  // Clear previous
  document.querySelectorAll(".user-highlight").forEach(el => {
    el.classList.remove("user-highlight");
    el.style.outline = "";
    el.removeAttribute("data-user");
    el.removeAttribute("title");
  });

  Object.entries(users).forEach(([id, user]) => {
    if (!user.activity || id === SESSION_ID) return;
    const { tableId, row, col } = user.activity;
    const table = document.getElementById(tableId);
    if (!table) return;
    const tr = table.querySelectorAll("tbody tr")[row];
    if (!tr) return;
    const td = tr.querySelectorAll("td")[col + 3];
    if (!td) return;

    td.classList.add("user-highlight");
    td.style.outline = `3px solid ${user.color}`;
    td.dataset.user = user.email;
    td.title = `Editing: ${user.email}`; // hover tooltip
  });
}

// =======================
// TABLE GENERATION
// =======================
function generateTable(containerId, savedData = null) {
  tableCount++;
  const container = typeof containerId === "string" ? document.getElementById(containerId) : containerId;
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
      <tr id="${tableId}-totals">
        <td colspan="3"><strong>Total Errors</strong></td>
      </tr>
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

  // Totals
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

  // Body
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
// AUTO SAVE & TYPING
// =======================
function attachAutoSave(wrapper) {
  let typingTimeout;

  wrapper.addEventListener("focusin", e => {
    const td = e.target.closest("td");
    if (!td) return;
    const tr = td.closest("tr");
    const table = td.closest("table");

    updateUserActivity({
      tableId: table.id,
      row: tr.rowIndex - 1,
      col: td.cellIndex - 3,
      field: e.target.tagName === "TEXTAREA" ? "comment" : "checkbox"
    });
  });

  wrapper.addEventListener("input", e => {
    const td = e.target.closest("td");
    if (!td) return;
    const tr = td.closest("tr");
    const table = td.closest("table");

    // Typing indicator
    updateUserActivity({
      tableId: table.id,
      row: tr.rowIndex - 1,
      col: td.cellIndex - 3,
      field: e.target.tagName === "TEXTAREA" ? "comment" : "checkbox"
    });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => updateUserActivity(null), 2000);

    if (e.target.matches("textarea")) {
      td.classList.toggle("has-comment", e.target.value.trim() !== "");
    }

    saveTables();
  });

  wrapper.addEventListener("change", e => {
    if (e.target.matches("input[type='checkbox'], input[type='date']")) {
      const row = e.target.closest("tr");
      if (row) updateErrorCount(row);
      const table = e.target.closest("table");
      if (table) updateColumnTotals(table.id);
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
// SAVE / LOAD
// =======================
function saveTables() {
  if (isApplyingRemote) return;
  isLocalEdit = true;

  const tables = [...document.querySelectorAll(".table-wrapper")].map(wrapper => ({
    date: wrapper.querySelector("input[type='date']")?.value || "",
    rows: [...wrapper.querySelectorAll("tbody tr")].map(tr => ({
      checkboxes: [...tr.querySelectorAll("input[type='checkbox']")].map(cb => cb.checked),
      comments: [...tr.querySelectorAll("textarea")].map(ta => ta.value)
    }))
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  db.ref(CLOUD_DOC).set({ updatedAt: firebase.database.ServerValue.TIMESTAMP, tables }).catch(console.error);

  setTimeout(() => (isLocalEdit = false), 300);
}

async function loadFromCloud() {
  try {
    const snap = await db.ref(CLOUD_DOC).get();
    if (!snap.exists()) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap.val().tables || []));
  } catch (err) {
    console.error(err);
  }
}

// =======================
// REALTIME SYNC
// =======================
function initRealTimeSync() {
  db.ref(CLOUD_DOC).on("value", snap => {
    if (!snap.exists() || isLocalEdit) return;
    isApplyingRemote = true;

    const tables = snap.val().tables || [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));

    const container = document.getElementById("tablesContainer");
    container.innerHTML = "";
    tables.forEach(t => generateTable(container, t));

    setTimeout(() => (isApplyingRemote = false), 300);
  });
}

// =======================
// INIT APP
// =======================
async function initApp() {
  checkLogin();
  initPresence();
  await loadFromCloud();

  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const container = document.getElementById("tablesContainer");
  container.innerHTML = "";
  if (saved.length) saved.forEach(t => generateTable(container, t));
  else generateTable(container);

  initRealTimeSync();
}

// =======================
// START
// =======================
document.addEventListener("DOMContentLoaded", initApp);

// =======================
// CLEANUP
// =======================
window.addEventListener("beforeunload", () => {
  if (SESSION_ID) db.ref(`presence/${SESSION_ID}`).remove();
});
