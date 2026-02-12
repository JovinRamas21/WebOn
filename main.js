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
let SESSION_ID = sessionStorage.getItem("sessionId");

if (!SESSION_ID) {
  SESSION_ID = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2);
  sessionStorage.setItem("sessionId", SESSION_ID);
}

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
  "OFDB","Missing Content","Idol Time","404","Orch Entry Missing","Minify CSS & JS","Darkmode",
  "Do Not Sell","Permalink","Dropdown","Hover","DSHRBD & SEO","Cred Details Acc","Cookies",
  "Fav Icon","Break Task","Check List","Page Not Found","?s-desc","Alt Value","Forms",
  "Highlight","HTML & CSS Validation","Pages Trash","Feature","Dummy Img PREM","Banner",
  "Fonts","Logo","Responsive","301","Gtrans","Theme"
];

const devs = [
  { team: "KEPPEL", name: "Xaviery Batucan", remarks: "DEV 3" },
  { team: "KEPPEL", name: "Clariss Ann Ladica", remarks: "DEV 2" },
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
  if (sessionStorage.getItem("loggedIn") !== "true") {
    location.replace("index.html");
  }
}

// =======================
// PRESENCE / ONLINE USERS
// =======================
function initPresence() {
  if (!SESSION_ID) return;

  const email = sessionStorage.getItem("email") || "Guest User";
  const presenceRef = db.ref(`presence/${SESSION_ID}`);

  presenceRef.onDisconnect().remove();

  presenceRef.set({
    email,
    onlineAt: Date.now(),
    activity: null
  });

  console.log("Presence initialized with ID:", SESSION_ID);

  db.ref("presence").on("value", snap => {
    const users = snap.val() || {};
    renderOnlineUsers(users);
    applyUserHighlights(users);
  });
}

function renderOnlineUsers(users) {
  const ul = document.getElementById("onlineUsers");
  if (!ul) return;

  ul.innerHTML = "";
  Object.values(users).forEach(user => {
    if (!user?.email) return;
    const li = document.createElement("li");
    li.textContent = user.email;
    ul.appendChild(li);
  });
}

function applyUserHighlights(users) {
  document.querySelectorAll(".user-highlight").forEach(el => {
    el.classList.remove("user-highlight");
    el.style.outline = "";
    el.removeAttribute("data-user");
  });

  Object.entries(users).forEach(([id, user]) => {
    if (!user?.activity || id === SESSION_ID) return;

    const { tableId, row, col } = user.activity;
    const table = document.getElementById(tableId);
    if (!table) return;

    const tr = table.querySelectorAll("tbody tr")[row];
    if (!tr) return;

    const td = tr.querySelectorAll("td")[col + 3];
    if (!td) return;

    td.classList.add("user-highlight");
    td.style.outline = "3px solid #2196f3";
    td.dataset.user = user.email;
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
    <input type="date" value="${savedData?.date?.start || new Date().toISOString().split("T")[0]}">
    <span style="margin:0 5px;">to</span>
    <input type="date" value="${savedData?.date?.end || new Date().toISOString().split("T")[0]}">
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

const graphBtn = document.createElement("button");
graphBtn.textContent = "Show Graph";
graphBtn.className = "btn btn-primary";
graphBtn.style.marginBottom = "10px";
graphBtn.addEventListener("click", () => showGraph(table));
wrapper.insertBefore(graphBtn, table);

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
      ta.style.display = "none";

      // Load saved data
      if (savedData?.rows?.[r]) {
        cb.checked = savedData.rows[r].checkboxes?.[c] || false;
        ta.value = savedData.rows[r].comments?.[c] || "";
        td.classList.toggle("has-comment", ta.value.trim() !== "");
      }

      // Checkbox toggle
      cb.addEventListener("change", () => {
        ta.style.display = cb.checked ? "block" : "none";
        if (cb.checked) ta.focus();
      });

      // Highlight indicator
      ta.addEventListener("input", () => {
        td.classList.toggle("has-comment", ta.value.trim() !== "");
        saveTables();
      });

      // Toggle when clicking cell indicator
      td.addEventListener("click", (e) => {
        if (e.target === cb || e.target === ta) return;
        if (td.classList.contains("has-comment")) {
          ta.style.display = ta.style.display === "none" ? "block" : "none";
          if (ta.style.display === "block") ta.focus();
        }
      });

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

    updateUserActivity({
      tableId: table.id,
      row: tr.rowIndex - 1,
      col: td.cellIndex - 3,
      field: e.target.tagName === "TEXTAREA" ? "comment" : "checkbox"
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => updateUserActivity(null), 2000);

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
    date: {
  start: wrapper.querySelector("input[type='date']:first-of-type")?.value || "",
  end: wrapper.querySelector("input[type='date']:last-of-type")?.value || ""
},
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
// BUTTON ACTIONS
// =======================
document.getElementById("addTableBtn")?.addEventListener("click", () => {
  const container = document.getElementById("tablesContainer");
  generateTable(container);
  saveTables();
});

document.getElementById("saveTablesBtn")?.addEventListener("click", () => {
  saveTables();
  alert("Tables saved successfully!");
});

// =======================
// CLICK OUTSIDE TO HIDE COMMENT
// =======================
document.addEventListener("click", (e) => {
  document.querySelectorAll(".comment-box").forEach(ta => {
    const td = ta.closest("td");
    if (ta.style.display === "block" && !td.contains(e.target)) {
      ta.style.display = "none";
    }
  });
});

function showGraph(table) {
  const modal = document.getElementById("graphModal");
  const canvas = document.getElementById("graphCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Destroy previous chart instance if exists
  if (window.graphChart) window.graphChart.destroy();

  // Errors per Dev
  const devNames = [...table.querySelectorAll("tbody tr td:nth-child(2)")].map(td => td.textContent);
  const devErrors = [...table.querySelectorAll("tbody tr td.errors")].map(td => parseInt(td.textContent));

  // Errors per Concern (column totals)
  const concernErrors = [...table.querySelectorAll(".column-total")].map(td => parseInt(td.textContent));

  // Resize canvas
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  window.graphChart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: devNames,
    datasets: [
      {
        label: "Errors per Developer",
        data: devErrors,
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
        borderRadius: 5,
        yAxisID: 'y1',
        hoverBackgroundColor: "rgba(255, 99, 132, 0.9)"
      },
      {
        label: "Errors per Concern (Overall)",
        data: concernErrors,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        borderRadius: 5,
        yAxisID: 'y2',
        hoverBackgroundColor: "rgba(54, 162, 235, 0.9)"
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "top", 
        labels: { boxWidth: 20, padding: 15, color: "#000" }  // black legend labels
      },
      title: { 
        display: true, 
        text: "Developer Errors & Overall Concern Errors",
        font: { size: 18 },
        color: "#000" // black title
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 60,   // rotate longer names
          minRotation: 45,
          autoSkip: false,
          color: "#000",      // black font for developer names
          font: { size: 12 }  // adjust font size if needed
        },
        grid: { display: false }
      },
      y1: {
        beginAtZero: true,
        position: 'left',
        title: { display: true, text: 'Errors per Dev', color: '#000' },
        grid: { color: 'rgba(200,200,200,0.2)' },
        ticks: { stepSize: 1, color: '#000' }
      },
      y2: {
        beginAtZero: true,
        position: 'right',
        title: { display: true, text: 'Errors per Concern', color: '#000' },
        grid: { drawOnChartArea: false },
        ticks: { stepSize: 1, color: '#000' }
      }
    }
  }
});
  modal.style.display = "flex";
}
// Close modal
document.getElementById("closeGraphModal").addEventListener("click", () => {
  document.getElementById("graphModal").style.display = "none";
});
