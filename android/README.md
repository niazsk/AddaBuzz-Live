# AddaBuzz Live — Native Android App (Kotlin + Jetpack Compose + Firebase)

This directory contains the Native Android (Kotlin + Jetpack Compose + Material 3) client for **AddaBuzz Live**, configured to share the exact same Firebase project (`addabuzz-live-usa`) and named Cloud Firestore database (`ai-studio-addabuzzlive-ecc1d7d4-659c-4060-9ada-c9001252a23f`) as the Web/PWA client.

> **Important Environment Note:** The AI Studio Web workspace runs in a Node.js + Vite container without a JDK, Gradle, or Android SDK installed, so `.apk` binary compilation cannot be run inside this container. Use either **Option A (Cloud APK Build via GitHub Actions)** without installing Android Studio, or **Option B (Local Android Studio)**.

---

## Step 1: Download `google-services.json` from Firebase

1. Open **Firebase Console** → Project **`addabuzz-live-usa`** (`593716749745`).
2. Go to **Project Settings → Your apps → Add app → Android**.
3. Register Android package name: `com.addabuzz.live`.
4. Download `google-services.json`.

---

## Option A: Build APK in the Cloud (No Android Studio Needed)

1. Push this project to a GitHub repository.
2. Add your `google-services.json` either:
   - Directly at `android/app/google-services.json`, **or**
   - Base64-encoded as a GitHub Repository Secret named `GOOGLE_SERVICES_JSON_BASE64`.
3. Go to the repository's **Actions** tab → **Build AddaBuzz Live Android APK** → **Run workflow**.
4. Once finished (~2 minutes), download the **`AddaBuzz-Live-debug-apk`** artifact (`app-debug.apk`) directly onto your Android phone and install it.

---

## Option B: Build APK Locally with Android Studio

1. Place `google-services.json` at `android/app/google-services.json`.
2. Open the `android/` folder in **Android Studio** (Ladybug or newer recommended).
3. Wait for Gradle sync to finish, then click **Build → Build Bundle(s) / APK(s) → Build APK(s)** (or run `gradle assembleDebug`).
4. Locate `android/app/build/outputs/apk/debug/app-debug.apk` and transfer/install it on your phone.
