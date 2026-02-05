// =======================
// Firebase
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyD2i8d1usAifaTvqkNzgylOLU2XDtakAUk",
  authDomain: "webcon-concerns.firebaseapp.com",
  projectId: "webcon-concerns",
  storageBucket: "webcon-concerns.appspot.com",
  messagingSenderId: "416233156932",
  appId: "1:416233156932:web:78a1dfce6c61cf030f2711",
  measurementId: "G-L6LFLKHP6P"
};

firebase.initializeApp(firebaseConfig);
firebase.analytics();
const db = firebase.firestore();

// Use a fixed doc id for all sessions (or adjust per user)
const CLOUD_DOC_ID = "default-checklist";

// =======================
// Access control
// =======================
if (sessionStorage.getItem("isLoggedIn") !== "Webconadmin") {
    window.location.replace("Login.html");
}

history.pushState(null, null, location.href);
window.onpopstate = () => { history.pushState(null, null, location.href); };

// =======================
// Concerns & Devs
// =======================
const concerns = [ "OFDB","Missing Content","Idol Time","404","Orch Entry Missing","Minify CSS/JS","Darkmode","Do Not Sell","Permalink","Dropdown","Hover","DSHRBD/SEO","Cred Details Acc","Cookies","Fav Icon","Break Task","Check List","Page Not Found","?s-desc","Alt Value","Forms","Highlight","HTML & CSS Validation","Pages Trash","Feature","Dummy Img PREM","Banner","Fonts","Logo","Responsive","301","Gtrans","Theme" ];

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
// Globals
// =======================
let tableCount = 0;
const STORAGE_KEY = "devChecklistTables";

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
  saveToCloud(); // cloud sync
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

  const headerRow = document.getElementById(`${tableId}-headers`);
  concerns.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c;
    headerRow.appendChild(th);
  });

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
  const count = [...row.querySelectorAll("input[type='checkbox']")]
    .filter(cb => cb.checked).length;
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
async function saveToCloud() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  try {
    await db.collection("devChecklists").doc(CLOUD_DOC_ID).set({
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      tables: data
    });
    console.log("☁️ Cloud sync complete");
  } catch (err) {
    console.error("❌ Cloud save failed:", err);
  }
}

async function loadFromCloud() {
  try {
    const doc = await db.collection("devChecklists").doc(CLOUD_DOC_ID).get();
    if (!doc.exists) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc.data().tables || []));
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
  document.getElementById("tablesContainer").innerHTML = "";
  await loadFromCloud();
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (saved.length) saved.forEach(data => generateTable("tablesContainer", data));
  else generateTable("tablesContainer");
})();

// =======================
// Buttons
// =======================
document.getElementById("addTableBtn").addEventListener("click", () => { generateTable("tablesContainer"); saveTables(); });
document.getElementById("saveTablesBtn").addEventListener("click", () => { saveTables(); alert("All tables saved successfully!"); });
