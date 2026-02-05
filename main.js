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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =======================
// Session / Access Control
// =======================
if (sessionStorage.getItem("isLoggedIn") !== "Webconadmin") {
    window.location.replace("index.html");
}

// Prevent back button
history.pushState(null, null, location.href);
window.onpopstate = () => { history.pushState(null, null, location.href); };

// =======================
// Constants & Globals
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

let tableCount = 0;
const STORAGE_KEY = "devChecklistTables";
const CLOUD_DOC_ID = "default-checklist";
let cloudSaveTimeout;

// =======================
// Save / Load
// =======================
function saveTables() {
  const data = [];
  document.querySelectorAll(".table-wrapper").forEach(wrapper => {
    const date = wrapper.querySelector("input[type='date']").value;
    const rows = [];
    wrapper.querySelectorAll("tbody tr").forEach(tr => {
      rows.push({
        checkboxes: [...tr.querySelectorAll("input[type='checkbox']")].map(cb => cb.checked),
        comments: [...tr.querySelectorAll("textarea")].map(t => t.value)
      });
    });
    data.push({ date, rows });
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  // Debounce cloud save to reduce writes
  clearTimeout(cloudSaveTimeout);
  cloudSaveTimeout = setTimeout(saveToCloud, 1000);
}

function attachAutoSave(wrapper) {
  wrapper.addEventListener("change", e => {
    if (e.target.matches("input[type='checkbox'], input[type='date']")) {
      const row = e.target.closest("tr");
      if (row) updateErrorCount(row);
      updateColumnTotals(wrapper.querySelector("table").id);
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
// Table Generator
// =======================
function generateTable(containerId, savedData = null) {
  tableCount++;
  const tableId = `devTable_${tableCount}`;
  const container = document.getElementById(containerId);
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
// Calculations
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
  table.querySelector(".grand-total").textContent = totals.reduce((a,b)=>a+b,0);
}

// =======================
// Cloud Sync
// =======================
function saveToCloud() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  db.ref(`devChecklists/${CLOUD_DOC_ID}`).set({
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
    tables: data
  })
  .then(() => console.log("☁️ Cloud sync complete"))
  .catch(err => console.error("❌ Cloud save failed:", err));
}

// Optimized Real-time Listener
db.ref(`devChecklists/${CLOUD_DOC_ID}/tables`).on("value", snapshot => {
  const cloudTables = snapshot.val() || [];
  const container = document.getElementById("tablesContainer");
  const currentWrappers = [...container.querySelectorAll(".table-wrapper")];

  cloudTables.forEach((tableData, index) => {
    const wrapper = currentWrappers[index];

    if (wrapper) {
      // Update existing table
      const rows = wrapper.querySelectorAll("tbody tr");
      tableData.rows.forEach((rowData, rIndex) => {
        const tr = rows[rIndex];
        if (!tr) return;

        tr.querySelectorAll("input[type='checkbox']").forEach((cb, cIndex) => {
          if (cb.checked !== rowData.checkboxes[cIndex]) cb.checked = rowData.checkboxes[cIndex];
        });

        tr.querySelectorAll("textarea").forEach((ta, cIndex) => {
          if (ta.value !== rowData.comments[cIndex]) {
            ta.value = rowData.comments[cIndex];
            ta.closest("td").classList.toggle("has-comment", ta.value.trim() !== "");
          }
        });

        updateErrorCount(tr);
      });

      updateColumnTotals(wrapper.querySelector("table").id);
    } else {
      // Generate new table if missing
      generateTable("tablesContainer", tableData);
    }
  });

  // Remove extra tables if cloud has fewer tables
  if (currentWrappers.length > cloudTables.length) {
    for (let i = cloudTables.length; i < currentWrappers.length; i++) {
      currentWrappers[i].remove();
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudTables));
  tableCount = cloudTables.length;
});

// Load from cloud
async function loadFromCloud() {
  try {
    const snapshot = await db.ref(`devChecklists/${CLOUD_DOC_ID}`).get();
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
// Initialize
// =======================
(async function init() {
  const container = document.getElementById("tablesContainer");
  container.innerHTML = "";
  await loadFromCloud();
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (saved.length) saved.forEach(data => generateTable("tablesContainer", data));
  else generateTable("tablesContainer");
})();

// =======================
// Buttons
// =======================
document.getElementById("addTableBtn").addEventListener("click", () => { 
  generateTable("tablesContainer"); 
  saveTables(); 
});

document.getElementById("saveTablesBtn").addEventListener("click", () => { 
  saveTables(); 
  alert("All tables saved successfully!"); 
});
