const startCameraBtn = document.getElementById("startCameraBtn");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const photoInput = document.getElementById("photoInput");
const cameraFeed = document.getElementById("cameraFeed");
const photoPreview = document.getElementById("photoPreview");
const emptyState = document.getElementById("emptyState");
const captureCanvas = document.getElementById("captureCanvas");
const permissionStatus = document.getElementById("permissionStatus");
const helperText = document.getElementById("helperText");
const predictionTitle = document.getElementById("predictionTitle");
const predictionBody = document.getElementById("predictionBody");
const vibeTag = document.getElementById("vibeTag");
const uploadConsent = document.getElementById("uploadConsent");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");

const predictions = [
  {
    title: "A dramatic snack decision",
    body: "Tonight you will spend too long choosing between two snacks, then act like the final pick changed your destiny.",
    vibe: "Snack omen",
  },
  {
    title: "One message becomes a full conversation",
    body: "A quick check-in will turn into a longer-than-expected chat, and you will secretly enjoy it.",
    vibe: "Social spark",
  },
  {
    title: "A tiny victory appears",
    body: "You will fix or find something small tonight, and the satisfaction will be much bigger than the task itself.",
    vibe: "Mini win",
  },
  {
    title: "Late-night playlist moment",
    body: "One song will hit unusually hard tonight, and for a few minutes you will feel like the main character.",
    vibe: "Mood shift",
  },
  {
    title: "Unexpected craving",
    body: "Tonight your brain will suddenly demand a very specific food, and resisting it will become the evening's challenge.",
    vibe: "Hunger plot",
  },
  {
    title: "A memory resurfaces",
    body: "Something ordinary will remind you of an older moment tonight, and you will pause longer than expected.",
    vibe: "Soft nostalgia",
  },
  {
    title: "Plan drift",
    body: "Your original plan for tonight will change slightly, but the improvised version ends up being more fun.",
    vibe: "Chaotic good",
  },
  {
    title: "You notice something funny",
    body: "Tonight you will catch a detail other people miss and laugh about it more than anyone else.",
    vibe: "Inside joke energy",
  },
];

let activeStream = null;
let hasImage = false;
let latestImageDataUrl = "";
let predictionUnlocked = false;

function setStatus(mode, label) {
  permissionStatus.className = `status ${mode}`;
  permissionStatus.textContent = label;
}

function stopStream() {
  if (!activeStream) {
    return;
  }

  activeStream.getTracks().forEach((track) => track.stop());
  activeStream = null;
}

function showImage(src) {
  latestImageDataUrl = src;
  predictionUnlocked = false;
  photoPreview.src = src;
  photoPreview.hidden = false;
  cameraFeed.hidden = true;
  emptyState.hidden = true;
  hasImage = true;
  syncUploadButton();
  updatePrediction();
}

function updatePrediction() {
  if (!predictionUnlocked) {
    predictionTitle.textContent = hasImage ? "Prediction locked" : "Prediction locked";
    predictionBody.textContent =
      hasImage
        ? "The fake \"what happens tonight\" reading appears only after the photo is uploaded with explicit consent."
        : "Capture or choose a photo first, then complete the upload step to unlock the fake prediction.";
    vibeTag.textContent = hasImage ? "Waiting for upload" : "Upload first";
    shuffleBtn.disabled = true;
    syncUploadButton();
    return;
  }

  const pick = predictions[Math.floor(Math.random() * predictions.length)];
  predictionTitle.textContent = pick.title;
  predictionBody.textContent = `${pick.body} This is not real. It is just for fun.`;
  vibeTag.textContent = pick.vibe;
  shuffleBtn.disabled = false;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("blocked", "Unsupported");
    helperText.textContent = "This browser does not support live camera access.";
    return;
  }

  stopStream();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    activeStream = stream;
    cameraFeed.srcObject = stream;
    cameraFeed.hidden = false;
    photoPreview.hidden = true;
    emptyState.hidden = true;
    takePhotoBtn.disabled = false;
    setStatus("live", "Camera Live");
    helperText.textContent =
      "Camera access is active. The app still cannot browse the rest of the device gallery.";
  } catch (error) {
    setStatus("blocked", "Denied");
    takePhotoBtn.disabled = true;
    helperText.textContent =
      error?.name === "NotAllowedError"
        ? "Camera permission was denied."
        : "Camera could not be started on this device.";
  }
}

function takePhoto() {
  if (!cameraFeed.videoWidth || !cameraFeed.videoHeight) {
    helperText.textContent = "Wait for the camera preview to load, then try again.";
    return;
  }

  captureCanvas.width = cameraFeed.videoWidth;
  captureCanvas.height = cameraFeed.videoHeight;
  const context = captureCanvas.getContext("2d");
  context.drawImage(cameraFeed, 0, 0, captureCanvas.width, captureCanvas.height);
  showImage(captureCanvas.toDataURL("image/png"));
  helperText.textContent = "Photo captured locally in the browser.";
}

function handleFileSelection(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  stopStream();
  takePhotoBtn.disabled = true;
  setStatus("idle", "Photo Loaded");
  helperText.textContent =
    "Only the image you selected is available to the app. Nothing else in the gallery is exposed.";

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    showImage(String(reader.result));
  });
  reader.readAsDataURL(file);
}

function syncUploadButton() {
  const allowed = hasImage && uploadConsent.checked;
  uploadBtn.disabled = !allowed;
  if (!hasImage) {
    uploadStatus.textContent =
      "Upload is disabled until there is a photo and the consent box is checked.";
    return;
  }
  if (!uploadConsent.checked) {
    uploadStatus.textContent =
      "A photo is ready. Check the consent box if you want to send it to the app owner.";
    return;
  }
  uploadStatus.textContent =
    "Consent is active. Press \"Send Photo to Owner\" to upload this photo to the server.";
}

async function uploadPhoto() {
  if (!hasImage || !uploadConsent.checked || !latestImageDataUrl) {
    syncUploadButton();
    return;
  }

  uploadBtn.disabled = true;
  uploadStatus.textContent = "Uploading photo to the owner inbox...";

  try {
    const response = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageDataUrl: latestImageDataUrl,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Upload failed.");
    }

    predictionUnlocked = true;
    uploadStatus.textContent = `Uploaded successfully. File saved as ${payload.filename}.`;
    uploadConsent.checked = false;
    updatePrediction();
    syncUploadButton();
  } catch (error) {
    uploadStatus.textContent = error.message || "Upload failed.";
    syncUploadButton();
  }
}

startCameraBtn.addEventListener("click", startCamera);
takePhotoBtn.addEventListener("click", takePhoto);
photoInput.addEventListener("change", handleFileSelection);
shuffleBtn.addEventListener("click", updatePrediction);
uploadConsent.addEventListener("change", syncUploadButton);
uploadBtn.addEventListener("click", uploadPhoto);

window.addEventListener("beforeunload", stopStream);
