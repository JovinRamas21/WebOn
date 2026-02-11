// =======================
// Firebase Setup
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyBRVLorTAm3XWTzI7cZsGVStu1B1q5L5-0",
  authDomain: "errorgallery-64645.firebaseapp.com",
  databaseURL: "https://errorgallery-64645-default-rtdb.firebaseio.com",
  projectId: "errorgallery-64645",
  storageBucket: "errorgallery-64645.firebasestorage.app",
  messagingSenderId: "939840905725",
  appId: "1:939840905725:web:ece66c8096da673514f994",
  measurementId: "G-7GNLHR2WLY"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =======================
// Developers & Errors
// =======================
const developers = [
  { name: "Clariss Ann Ladica", img: "Images/Clariss.jpg" },
  { name: "Rich Rhynor Austria", img: "Images/Rich.jpg" },
  { name: "Steve Wilben Saceda", img: "Images/Steve.jpg" },
  { name: "Jemuel Rivero", img: "Images/Jemuel.jpg" },
  { name: "Hachi Drake Merto", img: "Images/Hachi.jpg" },
  { name: "Ian Jhon Cubatcha", img: "Images/Ian.jpg" },
  { name: "Khirt Manatad", img: "Images/Khirt.jpg" },
  { name: "Don Johnson Atillo", img: "Images/Don.jpg" },
  { name: "Jahmel Anne Junto", img: "Images/Jahm.jpg" },
  { name: "Justin Romera", img: "Images/Justin.jpg" },
  { name: "Jomar Jade Ballebas", img: "Images/Jomar.jpg" },
  { name: "Hinlorie Rebaño", img: "Images/Hinlorie.jpg" },
  { name: "Xaviery", img: "Images/Xav.jpg" }
];

const errors = [
  "OFDB","Missing Content","Idol Time","404","Orch Entry Missing",
  "Minify CSS/JS","Darkmode","Do Not Sell","Permalink","Dropdown",
  "Hover","DSHRBD/SEO","Cred Details Acc","Cookies","Fav Icon",
  "Break Task","Check List","Page Not Found","?s-desc","Alt Value",
  "Forms","Highlight","HTML & CSS Validation","Pages Trash",
  "Feature","Dummy Img PREM","Banner","Fonts","Logo","Responsive",
  "301","Gtrans","Theme"
];

// =======================
// DOM Elements
// =======================
const developerContainer = document.getElementById('developerContainer');
const devModal = document.getElementById('devModal');
const modalName = document.getElementById('modalDeveloperName');
const modalErrorsContainer = document.getElementById('modalErrorsContainer');

const errorModal = document.getElementById('errorModal');
const expandedErrorTitle = document.getElementById('expandedErrorTitle');
const errorImageGallery = document.getElementById('errorImageGallery');

const closeDevBtn = document.querySelector('.close');
const closeErrorBtn = document.querySelector('.close-error');

const attachImageTrigger = document.getElementById('attachImageTrigger');
const attachImageBtn = document.getElementById('attachImageBtn');
const rankingList = document.getElementById('rankingList');


let activeError = null;

// =======================
// Initialize Modals Hidden
// =======================
devModal.style.display = 'none';
errorModal.style.display = 'none';

// =======================
// Create Developer Cards
// =======================
developers.forEach(dev => {
  const card = document.createElement('div');
  card.classList.add('developer-card');

  const img = document.createElement('img');
  img.src = dev.img;

  const p = document.createElement('p');
  p.textContent = dev.name;

  // 🔴 Create Badge
  const badge = document.createElement('div');
  badge.classList.add('dev-count-badge');
  badge.textContent = "0";
  card.appendChild(badge);

  card.append(img, p);
  developerContainer.appendChild(card);

  // 🔥 Listen to ALL images of this developer
  const devRef = db.ref(`developers/${dev.name}/errors`);
  devRef.on('value', snapshot => {
    let totalImages = 0;

    const errorsData = snapshot.val();
    if (errorsData) {
      Object.values(errorsData).forEach(errorObj => {
        if (errorObj.images) {
          totalImages += Object.keys(errorObj.images).length;
        }
      });
    }

    badge.textContent = totalImages;

    // Hide badge if 0
    badge.style.display = totalImages > 0 ? "block" : "none";
  });

  card.addEventListener('click', () => openDeveloperModal(dev.name));
});

// =======================
// Open Developer Modal
// =======================
function openDeveloperModal(developer) {
  devModal.style.display = 'block';
  modalName.textContent = developer;
  modalErrorsContainer.innerHTML = '';

  errors.forEach(err => {
  const errorDiv = document.createElement('div');
  errorDiv.classList.add('error-item');

  const label = document.createElement('span');
  label.textContent = err;

  // 🔴 Create badge
  const badge = document.createElement('div');
  badge.classList.add('error-count-badge');
  badge.textContent = "0";
  errorDiv.appendChild(badge);

  const ref = db.ref(`developers/${developer}/errors/${err}/images`);

  ref.on('value', snapshot => {
    const data = snapshot.val();
    const images = data ? Object.values(data) : [];

    // Update count badge
    badge.textContent = images.length;
    badge.style.display = images.length > 0 ? "block" : "none";

    // Remove existing preview image if any
    const existingImg = errorDiv.querySelector("img");
    if (existingImg) existingImg.remove();

    // Show first image preview
    if (images.length > 0) {
      const img = document.createElement('img');
      img.src = images[0];
      img.alt = err;
      errorDiv.prepend(img);
    }
  });

  errorDiv.appendChild(label);

  errorDiv.addEventListener('click', () => openErrorModal(developer, err));

  modalErrorsContainer.appendChild(errorDiv);
});

}

// =======================
// Close Developer Modal
// =======================
closeDevBtn.addEventListener('click', () => devModal.style.display = 'none');

// =======================
// Open Expanded Error Modal
// =======================
function openErrorModal(developer, error) {
  errorModal.style.display = 'flex';
  expandedErrorTitle.textContent = `${developer} - ${error}`;
  activeError = { developer, error };

  const ref = db.ref(`developers/${developer}/errors/${error}/images`);
  ref.on('value', snapshot => {
    const data = snapshot.val();
    const images = data ? Object.values(data) : [];
    renderGallery(images, ref);
  });
}

// =======================
// Render Image Gallery
// =======================
function renderGallery(images, ref) {
  errorImageGallery.innerHTML = '';

  images.forEach((src, index) => {
    const container = document.createElement('div');
    container.classList.add('error-gallery-container');

    const img = document.createElement('img');
    img.src = src;
    img.classList.add('error-gallery');

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.onclick = () => {
      ref.once('value', snap => {
        const keys = Object.keys(snap.val());
        ref.child(keys[index]).remove();
      });
    };

    container.append(img, removeBtn);
    errorImageGallery.appendChild(container);
  });
}

// =======================
// Attach Image Button
// =======================
attachImageTrigger.addEventListener('click', () => attachImageBtn.click());

attachImageBtn.addEventListener('change', (event) => {
  if (!activeError) return;
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    db.ref(`developers/${activeError.developer}/errors/${activeError.error}/images`)
      .push(e.target.result);
  };
  reader.readAsDataURL(file);

  attachImageBtn.value = '';
});

// =======================
// Paste Images from Clipboard
// =======================
window.addEventListener('paste', e => {
  if (!activeError || errorModal.style.display === 'none') return;

  for (let item of e.clipboardData.items) {
    if (item.type.includes("image")) {
      const reader = new FileReader();
      reader.onload = function(event) {
        db.ref(`developers/${activeError.developer}/errors/${activeError.error}/images`)
          .push(event.target.result);
      };
      reader.readAsDataURL(item.getAsFile());
    }
  }
});

// =======================
// Close Modals
// =======================
closeErrorBtn.addEventListener('click', () => {
  errorModal.style.display = 'none';
  activeError = null;
});

window.addEventListener('click', e => {
  if (e.target === devModal) devModal.style.display = 'none';
  if (e.target === errorModal) {
    errorModal.style.display = 'none';
    activeError = null;
  }
});

const removeAllImagesBtn = document.getElementById('removeAllImagesBtn');

removeAllImagesBtn.addEventListener('click', () => {
  if (!activeError) return;

  if (confirm(`Are you sure you want to remove ALL images for ${activeError.developer} - ${activeError.error}?`)) {
    const ref = db.ref(`developers/${activeError.developer}/errors/${activeError.error}/images`);
    ref.remove().then(() => {
      errorImageGallery.innerHTML = ''; // clear gallery immediately
      alert("All images removed successfully!");
    }).catch(err => {
      console.error("Error removing images:", err);
      alert("Failed to remove images.");
    });
  }
});

// =======================
// Top 3 Ranking System
// =======================

const developerTotals = {}; // store totals dynamically

developers.forEach(dev => {
  const ref = db.ref(`developers/${dev.name}/errors`);

  ref.on('value', snapshot => {
    let totalImages = 0;

    const errorsData = snapshot.val();
    if (errorsData) {
      Object.values(errorsData).forEach(errorObj => {
        if (errorObj.images) {
          totalImages += Object.keys(errorObj.images).length;
        }
      });
    }

    developerTotals[dev.name] = totalImages;

    updateRanking();
  });
});

function updateRanking() {
  rankingList.innerHTML = '';

  const sorted = Object.entries(developerTotals)
    .sort((a, b) => b[1] - a[1]) // sort descending
    .slice(0, 3); // top 3 only

  sorted.forEach(([name, count], index) => {
    if (count === 0) return; // skip zero-error devs

    const card = document.createElement('div');
    card.classList.add('ranking-card');

    const position = document.createElement('div');
    position.classList.add('ranking-position', `rank-${index + 1}`);
    position.textContent = `#${index + 1}`;

    const devName = document.createElement('div');
    devName.classList.add('ranking-name');
    devName.textContent = name;

    const errorCount = document.createElement('div');
    errorCount.classList.add('ranking-count');
    errorCount.textContent = `${count} Total Errors`;

    card.append(position, devName, errorCount);
    rankingList.appendChild(card);
  });
}
