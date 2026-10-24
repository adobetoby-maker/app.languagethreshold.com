import Capacitor
import UIKit
import Speech
import AVFoundation
import WatchConnectivity

/// The web view retains authentication. Watch messages contain only an expiring opaque mission ID.
@objc(WatchTalkPlugin)
final class WatchTalkPlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    let identifier = "WatchTalkPlugin"
    let jsName = "WatchTalk"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setContext", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledge", returnType: CAPPluginReturnPromise)
    ]
    private var enabled = false
    private var context: [String: Any] = [:]
    private var seen = Set<String>()
    private var task: SFSpeechRecognitionTask?
    private var recognitionID: String?
    private var audioURL: URL?
    private var deadline: Timer?
    private var observers: [NSObjectProtocol] = []

    override func load() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
        observers.append(NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.clear()
        })
        // Crash leftovers are only this feature's temporary audio, never learner library data.
        try? FileManager.default.removeItem(at: clipDirectory)
    }
    private var clipDirectory: URL { FileManager.default.temporaryDirectory.appendingPathComponent("lt-watch-talk", isDirectory: true) }
    private func emitFailure(_ message: String) { notifyListeners("failure", data: ["message": message]) }
    private func publish(_ extra: [String: Any] = [:]) {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
        var payload = context
        payload["version"] = 1
        for (key, value) in extra { payload[key] = value }
        try? WCSession.default.updateApplicationContext(payload)
        if WCSession.default.isReachable { WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: nil) }
    }
    private func cancelRecognition() {
        deadline?.invalidate(); deadline = nil
        let previous = task; task = nil
        recognitionID = nil
        previous?.cancel()
        if let url = audioURL { try? FileManager.default.removeItem(at: url) }
        audioURL = nil
    }
    private func clear() {
        enabled = false
        context = ["ready": false, "expiresAt": 0]
        cancelRecognition()
        publish()
    }
    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard WCSession.isSupported(), WCSession.default.activationState == .activated else {
                call.reject("Apple Watch is still connecting. Open both apps and try again."); return
            }
            SFSpeechRecognizer.requestAuthorization { permission in
                DispatchQueue.main.async {
                    guard permission == .authorized, UIApplication.shared.applicationState == .active else { call.reject("Allow Speech Recognition in iPhone Settings to transcribe your Watch recording."); return }
                    self.enabled = true
                    call.resolve(["paired": WCSession.default.isPaired, "installed": WCSession.default.isWatchAppInstalled])
                }
            }
        }
    }
    @objc func stop(_ call: CAPPluginCall) { DispatchQueue.main.async { self.clear(); call.resolve() } }
    @objc func setContext(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.enabled, UIApplication.shared.applicationState == .active,
                  let id = call.getString("contextId"), UUID(uuidString: id) != nil,
                  let locale = call.getString("locale"), locale.count <= 30,
                  let expires = call.getDouble("expiresAt"), expires > Date().timeIntervalSince1970 * 1000,
                  expires <= Date().timeIntervalSince1970 * 1000 + 50000 else {
                call.reject("Watch mission is not active."); return
            }
            if self.context["contextId"] as? String != id { self.cancelRecognition(); self.seen.removeAll() }
            let interrupted = (call.getBool("ready") != true) ? self.recognitionID : nil
            if interrupted != nil { self.cancelRecognition() }
            self.context = ["contextId": id, "locale": locale, "title": String((call.getString("title") ?? "Speaking practice").prefix(100)), "ready": call.getBool("ready") ?? false, "expiresAt": expires]
            if let interrupted { self.publish(["requestId": interrupted, "state": "error"]) }
            else { self.publish() }
            call.resolve()
        }
    }
    @objc func acknowledge(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let id = call.getString("requestId"), self.seen.contains(id) { self.publish(["requestId": id, "state": "received"]) }
            call.resolve()
        }
    }
    private func validContext(_ id: String) -> Bool {
        enabled && UIApplication.shared.applicationState == .active && context["contextId"] as? String == id
        && context["ready"] as? Bool == true && (context["expiresAt"] as? Double ?? 0) > Date().timeIntervalSince1970 * 1000
    }
    func session(_ session: WCSession, didReceive file: WCSessionFile) {
        // The OS removes file.fileURL after this delegate returns; copy before dispatching.
        guard let meta = file.metadata, let id = meta["contextId"] as? String,
              let request = meta["requestId"] as? String, UUID(uuidString: request) != nil,
              let created = meta["createdAt"] as? Double,
              created <= Date().timeIntervalSince1970 * 1000 + 5000,
              Date().timeIntervalSince1970 * 1000 - created < 60000,
              let size = try? file.fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize,
              size > 0, size <= 1_000_000 else { return }
        let destination = clipDirectory.appendingPathComponent(UUID().uuidString).appendingPathExtension("m4a")
        do { try FileManager.default.createDirectory(at: clipDirectory, withIntermediateDirectories: true); try FileManager.default.copyItem(at: file.fileURL, to: destination) }
        catch { return }
        DispatchQueue.main.async {
            guard self.validContext(id), self.recognitionID == nil, !self.seen.contains(request) else {
                try? FileManager.default.removeItem(at: destination); return
            }
            guard let audio = try? AVAudioPlayer(contentsOf: destination), audio.duration > 0, audio.duration <= 31 else {
                try? FileManager.default.removeItem(at: destination); self.emitFailure("Watch recording is invalid or too long."); return
            }
            self.seen.insert(request)
            if self.seen.count > 64 { self.clear(); try? FileManager.default.removeItem(at: destination); return }
            guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: self.context["locale"] as? String ?? "")), recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else {
                try? FileManager.default.removeItem(at: destination)
                self.emitFailure("On-device transcription is unavailable for this language. Use the iPhone microphone instead.")
                self.publish(["requestId": request, "state": "error"]); return
            }
            self.audioURL = destination; self.recognitionID = request
            self.publish(["requestId": request, "state": "transcribing", "ready": false])
            let recognition = SFSpeechURLRecognitionRequest(url: destination)
            recognition.requiresOnDeviceRecognition = true
            recognition.shouldReportPartialResults = false
            self.deadline = Timer.scheduledTimer(withTimeInterval: 25, repeats: false) { [weak self] _ in
                guard let self, self.recognitionID == request else { return }
                self.cancelRecognition(); self.emitFailure("Watch transcription timed out. Try a shorter turn.")
                self.publish(["requestId": request, "state": "error"])
            }
            self.task = recognizer.recognitionTask(with: recognition) { result, error in
                DispatchQueue.main.async {
                    guard self.recognitionID == request else { return }
                    guard self.validContext(id) else { self.cancelRecognition(); return }
                    if let result, result.isFinal {
                        let text = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
                        self.cancelRecognition()
                        guard !text.isEmpty, text.count <= 2000 else { self.emitFailure("No clear Watch speech was returned. Try again."); self.publish(["state": "error"]); return }
                        self.notifyListeners("transcript", data: ["contextId": id, "requestId": request, "text": text, "createdAt": created])
                    } else if error != nil {
                        self.cancelRecognition(); self.emitFailure("Could not transcribe your Watch turn. Try again or use the iPhone microphone.")
                        self.publish(["requestId": request, "state": "error"])
                    }
                }
            }
        }
    }
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async { replyHandler(self.context) }
    }
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) { DispatchQueue.main.async { self.publish() } }
    func sessionDidBecomeInactive(_ session: WCSession) { DispatchQueue.main.async { self.clear() } }
    func sessionDidDeactivate(_ session: WCSession) { DispatchQueue.main.async { self.clear(); session.activate() } }
}
