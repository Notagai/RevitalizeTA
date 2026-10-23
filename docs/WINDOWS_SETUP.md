# Windows development environment

RevitalizeTA is currently in planning. **There is no Android application to run yet.** This guide prepares a Windows machine to build the planned React Native + Expo + TypeScript prototype. The framework choice remains provisional until Phase 0 is validated.

## Install

1. Install [Git for Windows](https://git-scm.com/downloads/win) and optionally [GitHub Desktop](https://desktop.github.com/).
2. Install [Visual Studio Code](https://code.visualstudio.com/) and [Node.js LTS](https://nodejs.org/en/download).
3. Install [Android Studio](https://developer.android.com/studio) using its Standard setup, including the Android SDK and emulator.
4. In Android Studio's **Settings > Languages & Frameworks > Android SDK**, install Android SDK Platform **36 (Android 16)**, plus Android SDK Platform-Tools, Build-Tools, and Android Emulator. Recheck [Expo's current Android instructions](https://docs.expo.dev/workflow/android-studio-emulator/) if requirements change.
5. Open **Device Manager > Create virtual device** and create a Pixel-like phone with a supported Google APIs or Google Play system image. Launch it once.
6. In Windows Task Manager > Performance > CPU, verify **Virtualization: Enabled**. If the emulator reports missing acceleration, follow [Google's Windows Hypervisor Platform instructions](https://developer.android.com/studio/run/emulator-acceleration). This may require a reboot.
7. Install VS Code extensions: **React Native Tools (Microsoft)**, **ESLint**, and **Prettier**.

## Windows Android SDK environment

Use the actual **Android SDK Location** displayed in Android Studio. The usual default is `%LOCALAPPDATA%\Android\Sdk`.

Under **Edit environment variables for your account**, set:
- `ANDROID_HOME` to that SDK path.
- Add `%LOCALAPPDATA%\Android\Sdk\platform-tools` and `%LOCALAPPDATA%\Android\Sdk\emulator` to your user `Path` when using the default location. Substitute your actual SDK location if different.

Reopen PowerShell/VS Code after changing environment variables.

## Verify in PowerShell

```powershell
git --version
node --version
npm --version
code --version
adb version
adb devices
```

With the emulator running, `adb devices` should show an emulator entry with state `device`. An empty list means it is not connected; `unauthorized` or `offline` means further setup is needed.

## Clone and open

Clone **Notagai/RevitalizeTA** with GitHub Desktop (File > Clone repository), then choose **Repository > Open in Visual Studio Code**.

At this stage, there is **no `package.json`**, so do not run `npm install`, `npx expo start`, or `npx expo run:android` in this repository yet. Those commands become meaningful after an Expo app is scaffolded and dependencies are committed.

## First working-app milestone

After the environment checks pass, scaffold an Expo TypeScript application into this repository, install dependencies, then run a local Android development build. For that milestone, use the then-current [Expo development build documentation](https://docs.expo.dev/develop/development-builds/introduction/). The first screen should use **synthetic demo content only**, with no TeachAssist credentials or real student data.

## Troubleshooting

- `adb` not found: correct the SDK Platform-Tools installation and PATH; reopen the shell.
- Emulator fails to start: verify CPU virtualization and Windows Hypervisor Platform, then review the emulator's error output.
- Multiple `adb` versions: confirm `where.exe adb` selects the SDK Platform-Tools binary.
- Slow emulator: close extra virtual devices, confirm hardware acceleration and free RAM.
- Keep SDKs, Gradle caches, virtual devices, credentials and machine-specific paths out of Git.
