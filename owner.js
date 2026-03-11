const refreshBtn = document.getElementById("refreshBtn");
const ownerStatus = document.getElementById("ownerStatus");
const uploadGrid = document.getElementById("uploadGrid");

function renderUploads(items) {
  uploadGrid.innerHTML = "";

  if (!items.length) {
    ownerStatus.textContent = "No uploads yet.";
    return;
  }

  ownerStatus.textContent = `${items.length} upload${items.length === 1 ? "" : "s"} stored on the server.`;

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "upload-card";

    const image = document.createElement("img");
    image.src = item.url;
    image.alt = `Uploaded on ${item.createdAt}`;

    const copy = document.createElement("div");
    copy.className = "upload-copy";

    const name = document.createElement("p");
    name.textContent = item.filename;

    const stamp = document.createElement("p");
    stamp.textContent = new Date(item.createdAt).toLocaleString();

    copy.append(name, stamp);
    card.append(image, copy);
    uploadGrid.append(card);
  });
}

async function loadUploads() {
  ownerStatus.textContent = "Loading uploads...";

  try {
    const response = await fetch("/api/uploads");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not load uploads.");
    }

    renderUploads(payload.uploads || []);
  } catch (error) {
    ownerStatus.textContent = error.message || "Could not load uploads.";
  }
}

refreshBtn.addEventListener("click", loadUploads);

loadUploads();
