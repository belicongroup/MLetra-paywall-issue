# M Letras Payment Test

Minimal app to test only in-app subscription purchase flow on physical Android/iOS devices.

## Product IDs used

- `com.mletras.pro.monthly`
- `com.mletras.yearly`

## Important for Google Play testing

- `appId` is set to `com.mletras.com` so billing matches your Play listing product IDs.
- Use an internal/closed testing track in Play Console.
- Install this app build from Play (or build signed with the same app id/signing setup used for testing).
- Log in on device with a Play test account.

## Quick start

```bash
npm install
npm run cap:add:android
npm run cap:sync:android
npm run cap:open:android
```

Then in Android Studio:

1. Connect your physical Android phone (USB debugging on).
2. Select the phone target.
3. Run the app.
4. Use buttons in app:
   - `Get Product` (checks if SKU is available)
   - `Purchase` (starts subscription flow)
   - `Restore` (reads active subscriptions)

## iOS quick start (optional)

```bash
npm run cap:add:ios
npm run cap:sync
npm run cap:open:ios
```

## Notes

- Web browser testing will not complete real purchases.
- If you already have another app with `com.mletras.com` installed, uninstall it first from the device before installing this debug test app.
