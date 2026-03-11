# OWNER

Standalone browser toy app in its own folder. It does not replace the existing root app.
This version includes an explicit consent-based upload flow for the app owner.

## Run

1. `cd "/Users/VIP/Documents/New project/tonight-fun-camera"`
2. `npm run launch`
3. The app opens automatically at `http://localhost:4173`
4. Open `http://localhost:4173/owner.html` to view uploaded photos

Manual alternative:

1. `cd "/Users/VIP/Documents/New project/tonight-fun-camera"`
2. `node server.js`
3. Open `http://localhost:4173`

## Behavior

- `Enable Camera` requests browser camera permission.
- `Choose Photo` lets the user explicitly pick an image file.
- After a photo is uploaded with explicit consent, the app unlocks a random playful prediction for tonight.
- The UI clearly states the prediction is fake and for fun.
- The app does not and cannot browse the entire media library from browser permission alone.
- The user must check a consent box and press `Send Photo to Owner` before any upload happens.
- Uploaded images are stored in `tonight-fun-camera/uploads/`.

## Put it online

Recommended host: Render, because this app needs a Node server and file uploads.

1. Push this project to GitHub.
2. In Render, create a new Blueprint and point it at `tonight-fun-camera/render.yaml`.
3. Let Render create the `owner-app` web service.
4. Open the generated `.onrender.com` URL for the app.
5. Open `/owner.html` on that same domain for the owner inbox.

Notes:

- This blueprint uses a persistent disk, so Render needs a paid web service plan for the upload storage.
- The app now supports `PORT` and `UPLOADS_DIR`, which hosting platforms commonly provide/configure.
