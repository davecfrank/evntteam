# Capacitor Setup — Native App Store Distribution

This document outlines how to wrap evnt.team in Capacitor for iOS App Store and Google Play distribution.

## 2.1 Initial Setup

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npx cap init "evnt.team" "team.evnt.app"
npx cap add ios
npx cap add android
```

## 2.2 capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'team.evnt.app',
  appName: 'evnt.team',
  webDir: 'out', // Next.js static export output
  server: {
    // For development live reload:
    // url: 'http://192.168.1.X:3000',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'evntteam',
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
```

**Note:** Next.js must be configured for static export. Add `output: 'export'` to `next.config.ts` for Capacitor builds.

## 2.3 Native Plugins to Install

```bash
# Push notifications (replaces web push with APNs/FCM)
npm install @capacitor/push-notifications

# Camera for photo uploads from camera roll
npm install @capacitor/camera

# Native share sheet for sharing event links
npm install @capacitor/share

# Haptic feedback on key interactions
npm install @capacitor/haptics

# Local notifications for countdown reminders
npm install @capacitor/local-notifications

# Status bar color matching
npm install @capacitor/status-bar

# Branded splash screen
npm install @capacitor/splash-screen

# Deep linking for invite URLs
npm install @capacitor/app

# Keyboard management for chat
npm install @capacitor/keyboard

# In-app browser for external links
npm install @capacitor/browser
```

## 2.4 Build and Sync Workflow

```bash
# Build the web app (static export)
npm run build

# Copy web assets to native projects
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio (Android)
npx cap open android
```

### Development Workflow

```bash
# Start dev server
npm run dev

# Live reload in simulator (update capacitor.config.ts server.url first)
npx cap run ios --livereload --external
npx cap run android --livereload --external
```

## 2.5 App Store Requirements Checklist

### Apple App Store (iOS)
- [ ] Apple Developer Account ($99/year) — [developer.apple.com](https://developer.apple.com)
- [ ] Privacy Policy URL (required)
- [ ] App Store screenshots at required sizes:
  - 6.7" (iPhone 15 Pro Max): 1290 x 2796
  - 6.1" (iPhone 15 Pro): 1179 x 2556
  - 5.5" (iPhone 8 Plus): 1242 x 2208
- [ ] App description, keywords, category (Social Networking or Travel)
- [ ] Age rating questionnaire completed
- [ ] Push notification entitlements in Xcode:
  - Enable "Push Notifications" capability
  - Generate APNs key in Apple Developer Portal
- [ ] App icon: 1024x1024 PNG (no alpha, no rounded corners)
- [ ] Bundle ID: `team.evnt.app`

### Google Play Store (Android)
- [ ] Google Play Developer Account ($25 one-time) — [play.google.com/console](https://play.google.com/console)
- [ ] Privacy Policy URL (required)
- [ ] Screenshots:
  - Phone: minimum 2, recommended 4-8
  - 7" tablet (optional)
  - 10" tablet (optional)
- [ ] Feature graphic: 1024 x 500 PNG/JPEG
- [ ] App description (short: 80 chars, full: 4000 chars)
- [ ] Content rating questionnaire
- [ ] Firebase project for FCM push notifications
- [ ] App signing by Google Play enabled
- [ ] Target API level meets current Play Store requirements

## 2.6 PWA-to-Capacitor Migration Notes

When moving from PWA to native Capacitor app, these changes are needed:

### Push Notifications
Replace `navigator.serviceWorker` push with `@capacitor/push-notifications`:
```typescript
import { PushNotifications } from '@capacitor/push-notifications'

// Request permission
await PushNotifications.requestPermissions()

// Register for push
await PushNotifications.register()

// Listen for token
PushNotifications.addListener('registration', token => {
  // Send token.value to your backend
})

// Handle notification received while app is open
PushNotifications.addListener('pushNotificationReceived', notification => {
  // Show in-app notification
})

// Handle notification tap
PushNotifications.addListener('pushNotificationActionPerformed', action => {
  // Navigate to relevant event
  const eventId = action.notification.data?.eventId
  router.push(`/prototype/event?id=${eventId}`)
})
```

### Share
Replace Web Share API with `@capacitor/share`:
```typescript
import { Share } from '@capacitor/share'

await Share.share({
  title: 'Join my event on evnt.team',
  text: 'Check out this event!',
  url: `https://evnt.team/prototype/invite/${eventId}`,
  dialogTitle: 'Share Event',
})
```

### Camera
Replace `<input type="file" accept="image/*">` with `@capacitor/camera`:
```typescript
import { Camera, CameraResultType } from '@capacitor/camera'

const image = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Base64,
})
```

### Other Changes
- **Service worker**: Disable SW registration in Capacitor builds (native handles caching)
- **Install prompt**: Remove PWA install banner (user installed via app store)
- **Deep links**: Configure `applinks` (iOS) and `intent-filter` (Android) for `evnt.team/prototype/invite/*`
- **URLs**: Ensure all API calls use absolute URLs (`https://evnt.team/api/...`), not relative paths
- **Status bar**: Use `@capacitor/status-bar` to match `#0A0A0A` background
- **Splash screen**: Configure branded splash in `capacitor.config.ts`

### Detecting Capacitor at Runtime
```typescript
import { Capacitor } from '@capacitor/core'

if (Capacitor.isNativePlatform()) {
  // Native-only code (use native plugins)
} else {
  // Web/PWA code (use web APIs)
}
```
