# Apple Watch push-to-talk

Status: implemented for native iPhone + paired Apple Watch. Device audio-transfer acceptance is pending. It does not turn Apple Watch into a Safari/Bluetooth microphone.

## How to use

1. Install the updated native iPhone app and its embedded Language Threshold Watch app. Pair the Watch normally; no second app login or credentials are sent to the Watch.
2. On iPhone, sign in normally, open Speak, choose a speaking mission, select an audible partner voice and start through the existing speaking confirmation/access checks.
3. In the running mission, tap **Enable Watch microphone** and allow iPhone Speech Recognition. On the Watch, open Language Threshold and tap **Refresh connection** if needed.
4. Tap **Talk**, allow Watch microphone access, speak, then tap **Stop & send**. Recording stops at 30 seconds. **Cancel** discards the recording.
5. Keep the iPhone unlocked with the mission visible. Quick response sends the transcript through the usual AI gate; Review mode puts it in the answer field for approval. The partner's reply plays on the iPhone through the selected existing audio path. Select Quick response for hands-free turns between Watch taps.

This first version requires the iPhone mission to stay in the foreground. It does not play replies on the Watch, support standalone Watch conversations, or queue turns for later delivery after reconnecting. Some languages/devices lack on-device speech recognition; the iPhone reports that explicitly and offers its normal microphone instead. There is no fallback that uploads raw Watch recordings to a transcription service.

## Native source and builds

The existing locally maintained Capacitor iPhone wrapper is now tracked under `ios/`, including its existing speech plugin and app/push/status/biometric package references. The original local checkout was not modified. Its bundle ID remains `com.languagethreshold.app`; the embedded Watch app uses `com.languagethreshold.app.watchkitapp`. Version 1.0 build 4. Native dependencies are pinned through the npm lockfile and the Swift package resolution; Capacitor uses 8.5.1, avoiding the 8.5.0 internal-proxy vulnerability.

- Run `npm ci` at the repository root.
- Open `ios/App/App.xcodeproj` in Xcode. Schemes: **App** and **LanguageThresholdWatch**.
- For device installation, select the existing developer team for both targets and a paired iPhone/Watch destination. The user must approve device Trust/Developer Mode prompts. Do not uninstall the existing iPhone app or clear its data.
- The committed wrapper loads `https://app.languagethreshold.com`. The web half must also be released before its Watch controls appear. For pre-release device QA, build a separate local artifact with `ios/App/App/capacitor.config.json` pointing to the verified PR preview; restore that local edit afterward and never commit a preview destination. Sign in through the normal preview UI. Do not copy tokens between origins.
- Build without signing for simulator:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/lt-watch-build CODE_SIGNING_ALLOWED=NO build
```

- Compile for physical device architecture without provisioning:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/lt-watch-device-build CODE_SIGNING_ALLOWED=NO build
```

Unsigned artifacts prove compilation only; they are not device-installable/TestFlight distributions. WatchConnectivity file transfers must be tested on real paired devices. Apple documents that the Simulator does not support `transferFile`.

## Privacy and turn ownership

A started mission owns a fresh opaque context ID, refreshed every ten seconds with a 45-second expiry. No Supabase session, user ID, password, AI key, conversation history or reply content is sent to the Watch. The Watch records mono AAC locally; the phone accepts at most a 1 MB, 31-second file with a recent UUID-tagged request. Both sides remove their temporary files after use, cancellation or timeout, and clear this feature's crash leftovers on startup.

The phone performs on-device Speech recognition only. The existing server receives the resulting text through the normal authenticated speaking request, consent and AI entitlement checks; no new speech API/storage/schema/policy is introduced. Late/duplicate turns are rejected and the receiving JS checks the active practice lease again. Leaving the mission, changing account/module/language, disabling Watch input or backgrounding revokes it. Raw audio is never added to learner history or the Reader library. No progress is reset or deleted by this feature.

## Validation completed

- iPhone + embedded Watch simulator build and Release device-architecture build pass (Xcode 26.6; iOS/watchOS 26.5 SDKs).
- 2,355 Node tests pass, including actual Watch envelope validation, stale/wrong-context rejection, deduplication and bounded inbox checks.
- Typecheck, changed-file lint and production dependency audit pass; zero audit vulnerabilities.
- Web stage build and Vercel artifact validation pass, 26.32 MiB server bundle. Existing dependency/build deprecation warnings remain.
- Eleven browser cases including setup pass with two deliberate duplicate-project skips, covering Watch controls and walkthrough regression on desktop/iPhone-sized Chromium. Watch bridge tests use an explicitly synthetic native plugin, no authentication, real microphone, real AI or learner records. They are not real-device voice proof.
- Phone/tablet/desktop control captures reviewed at 390/768/1440/1920 widths; Watch simulator UI inspected, including disabled Talk when no live phone mission is connected.

## Real-device acceptance still required

- [ ] Install signed native build and matching web code without uninstalling or clearing progress.
- [ ] Normal sign-in, speaking confirmation and existing access checks; enable Watch permissions normally.
- [ ] Spanish Quick response: Watch recording → actual file transfer → on-device transcript → one AI turn → audible reply on iPhone.
- [ ] Review mode: no AI turn until Send; editing the transcript works.
- [ ] Cancel, short/empty clip, 30-second cap, denied permissions and unavailable on-device recognizer.
- [ ] Lock/background iPhone, disconnect Watch, leave/change mission, sign out/sign in as another test account: no delayed turn crosses contexts; reconnect manually.
- [ ] Repeat turns produce exactly one learner/partner exchange each and temporary audio is removed; existing saved learning data remains.

Sources: [Watch Connectivity](https://developer.apple.com/documentation/watchconnectivity), [transferFile device testing requirement](https://developer.apple.com/documentation/watchconnectivity/wcsession/transferfile(_:metadata:)), [on-device recognition](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition).
