import SwiftUI
import WatchConnectivity
import AVFoundation
import WatchKit

@main
struct LanguageThresholdWatchApp: App {
    @StateObject private var talk = WatchTalkModel()
    @Environment(\.scenePhase) private var phase
    var body: some Scene {
        WindowGroup {
            ScrollView {
                VStack(spacing: 12) {
                    Text("Language Threshold").font(.headline)
                    Text(talk.title).font(.caption).multilineTextAlignment(.center)
                    Button(action: { talk.recording ? talk.finish() : talk.begin() }) {
                        Label(talk.recording ? "Stop & send" : "Talk", systemImage: talk.recording ? "stop.fill" : "mic.fill")
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }.tint(talk.recording ? .red : .orange).disabled(!talk.recording && !talk.canRecord)
                    if talk.recording { Text("\(talk.seconds) / 30 seconds").monospacedDigit(); Button("Cancel", role: .cancel) { talk.cancel() } }
                    Text(talk.notice).font(.caption).multilineTextAlignment(.center).accessibilityLabel(talk.notice)
                    if !talk.recording { Button("Refresh connection") { talk.refresh() }.font(.caption) }
                    Text("Keep the speaking mission open on your iPhone. Replies play there.").font(.footnote).foregroundStyle(.secondary)
                }.padding(.horizontal, 8)
            }.onChange(of: phase) { _, new in
                if new == .active { talk.refresh() } else { talk.cancel() }
            }
        }
    }
}

final class WatchTalkModel: NSObject, ObservableObject, WCSessionDelegate, AVAudioRecorderDelegate {
    @Published var title = "Open a speaking mission on iPhone"
    @Published var notice = "Enable Apple Watch microphone in your iPhone mission."
    @Published var recording = false
    @Published var seconds = 0
    @Published var canRecord = false
    private var context: [String: Any] = [:]
    private var clipContext = ""
    private var requestID: String?
    private var recorder: AVAudioRecorder?
    private var clipURL: URL?
    private var transfer: WCSessionFileTransfer?
    private var startedAt = Date()
    private var ticker: Timer?
    private var sendDeadline: Timer?
    private var cancelling = false
    private var busy = false
    private var folder: URL { FileManager.default.temporaryDirectory.appendingPathComponent("lt-watch-talk", isDirectory: true) }

    override init() {
        super.init()
        try? FileManager.default.removeItem(at: folder)
        WCSession.default.delegate = self
        WCSession.default.activate()
        ticker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            self.seconds = self.recording ? min(30, Int(Date().timeIntervalSince(self.startedAt))) : 0
            self.updateReady()
        }
    }
    private func updateReady() {
        canRecord = !busy && WCSession.default.isReachable && context["ready"] as? Bool == true
            && (context["expiresAt"] as? Double ?? 0) > Date().timeIntervalSince1970 * 1000
        if !canRecord && !recording && !busy { notice = "Open the mission on your iPhone and enable Watch microphone." }
        if recording && ((context["contextId"] as? String != clipContext || context["ready"] as? Bool != true || (context["expiresAt"] as? Double ?? 0) <= Date().timeIntervalSince1970 * 1000 || !WCSession.default.isReachable)) { cancel(); notice = "Connection changed. Recording cancelled." }
    }
    func refresh() {
        guard WCSession.default.activationState == .activated, WCSession.default.isReachable else { updateReady(); return }
        WCSession.default.sendMessage(["action": "context"], replyHandler: { payload in DispatchQueue.main.async { self.apply(payload) } }, errorHandler: { _ in DispatchQueue.main.async { self.notice = "Could not reach your iPhone. Open both apps." } })
    }
    private func apply(_ payload: [String: Any]) {
        if (recording || busy) && payload["contextId"] as? String != clipContext { cancel() }
        context = payload
        title = payload["title"] as? String ?? "Speaking practice"
        if let state = payload["state"] as? String {
            if state == "received" { busy = false; sendDeadline?.invalidate(); cleanup(); notice = "Turn received. Listen on your iPhone."; WKInterfaceDevice.current().play(.success) }
            if state == "transcribing" { notice = "Transcribing on your iPhone…" }
            if state == "error" { busy = false; sendDeadline?.invalidate(); cleanup(); notice = "That turn could not be processed. Check your iPhone." }
        }
        updateReady()
        if canRecord && !recording && payload["state"] == nil { notice = "Tap Talk, speak, then Stop & send." }
    }
    func begin() {
        updateReady()
        guard canRecord, !recording, let id = context["contextId"] as? String else { return }
        AVAudioApplication.requestRecordPermission { allowed in
            DispatchQueue.main.async {
                guard allowed else { self.notice = "Allow microphone access in Watch Settings."; return }
                self.updateReady()
                guard WKExtension.shared().applicationState == .active, self.canRecord, self.context["contextId"] as? String == id else { return }
                do {
                    try AVAudioSession.sharedInstance().setCategory(.record, mode: .default)
                    try AVAudioSession.sharedInstance().setActive(true)
                    try FileManager.default.createDirectory(at: self.folder, withIntermediateDirectories: true)
                    let url = self.folder.appendingPathComponent(UUID().uuidString).appendingPathExtension("m4a")
                    self.clipURL = url
                    self.clipContext = id
                    self.recorder = try AVAudioRecorder(url: url, settings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 16000, AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 32000])
                    self.recorder?.delegate = self
                    self.cancelling = false; self.startedAt = Date(); self.seconds = 0
                    guard self.recorder?.record(forDuration: 30) == true else { throw NSError(domain: "WatchTalk", code: 1) }
                    self.recording = true; self.notice = "Recording. Tap Stop & send when finished."
                    WKInterfaceDevice.current().play(.start)
                } catch { self.cancel(); self.notice = "Microphone unavailable. Try again." }
            }
        }
    }
    func finish() { guard recording else { return }; recorder?.stop() }
    func cancel() {
        cancelling = true; recording = false
        recorder?.stop(); recorder = nil
        transfer?.cancel(); transfer = nil
        busy = false; sendDeadline?.invalidate(); sendDeadline = nil
        cleanup()
        try? AVAudioSession.sharedInstance().setActive(false)
        updateReady()
    }
    private func cleanup() { if let url = clipURL { try? FileManager.default.removeItem(at: url) }; clipURL = nil }
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        guard self.recorder === recorder else { return }
        recording = false; self.recorder = nil
        try? AVAudioSession.sharedInstance().setActive(false)
        guard !cancelling, flag, Date().timeIntervalSince(startedAt) >= 0.4,
              WCSession.default.isReachable, context["contextId"] as? String == clipContext,
              context["ready"] as? Bool == true,
              let url = clipURL else { cleanup(); notice = "Recording cancelled or too short. Try again."; updateReady(); return }
        let id = UUID().uuidString
        requestID = id; busy = true; canRecord = false
        transfer = WCSession.default.transferFile(url, metadata: ["contextId": clipContext, "requestId": id, "createdAt": Date().timeIntervalSince1970 * 1000])
        notice = "Sending to your iPhone…"
        sendDeadline = Timer.scheduledTimer(withTimeInterval: 60, repeats: false) { [weak self] _ in
            self?.cancel(); self?.notice = "Turn expired. Reopen the iPhone mission and try again."
        }
    }
    func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
        DispatchQueue.main.async {
            guard fileTransfer.file.metadata?["requestId"] as? String == self.requestID else { return }
            self.cleanup(); self.transfer = nil
            if error != nil { self.busy = false; self.sendDeadline?.invalidate(); self.notice = "Could not send. Check the iPhone connection."; self.updateReady() }
        }
    }
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) { DispatchQueue.main.async { self.apply(applicationContext) } }
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) { DispatchQueue.main.async { self.apply(message) } }
    func sessionReachabilityDidChange(_ session: WCSession) { DispatchQueue.main.async { self.refresh(); self.updateReady() } }
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) { DispatchQueue.main.async { self.apply(session.receivedApplicationContext); self.refresh() } }
}
