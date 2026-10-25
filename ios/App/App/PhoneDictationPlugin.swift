import Capacitor
import UIKit
import Speech
import AVFoundation

/// Foreground, on-device iPhone dictation. Every tap owns a fresh engine/task.
@objc(PhoneDictationPlugin)
final class PhoneDictationPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "PhoneDictationPlugin"
    let jsName = "PhoneDictation"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]
    private var requestID: String?
    private var engine: AVAudioEngine?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var tapped = false
    private var previousAudioConfiguration: (category: AVAudioSession.Category, mode: AVAudioSession.Mode, options: AVAudioSession.CategoryOptions)?
    private var latestText = ""
    private var limit: Timer?
    private var finishDeadline: Timer?
    private var backgroundObserver: NSObjectProtocol?

    override func load() {
        backgroundObserver = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            self?.finish(error: "aborted")
        }
    }
    deinit { if let backgroundObserver { NotificationCenter.default.removeObserver(backgroundObserver) } }
    private func emit(_ id: String, _ fields: [String: Any]) {
        var event = fields; event["requestId"] = id
        notifyListeners("dictation", data: event)
    }
    private func releaseInput() {
        engine?.stop()
        if tapped { engine?.inputNode.removeTap(onBus: 0); tapped = false }
        request?.endAudio()
        engine = nil
        // Do this before telling JS it may play the partner's reply.
        if let previous = previousAudioConfiguration {
            previousAudioConfiguration = nil
            let session = AVAudioSession.sharedInstance()
            try? session.setActive(false, options: .notifyOthersOnDeactivation)
            try? session.setCategory(previous.category, mode: previous.mode, options: previous.options)
        }
    }
    private func finish(error: String? = nil) {
        guard let id = requestID else { return }
        requestID = nil // Reject callbacks produced synchronously by cancellation.
        limit?.invalidate(); limit = nil
        finishDeadline?.invalidate(); finishDeadline = nil
        let text = latestText
        latestText = ""
        releaseInput()
        request = nil
        let previous = task; task = nil; previous?.cancel()
        if let error { emit(id, ["error": error, "ended": true]) }
        else { emit(id, ["text": text, "final": true, "ended": true]) }
    }
    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let id = call.getString("requestId"), UUID(uuidString: id) != nil,
                  let locale = call.getString("locale"), locale.count <= 30,
                  UIApplication.shared.applicationState == .active else { call.reject("Recording is not active.", "aborted"); return }
            guard self.requestID == nil else { call.reject("Another microphone turn is active.", "audio-capture"); return }
            self.requestID = id
            SFSpeechRecognizer.requestAuthorization { permission in
                DispatchQueue.main.async {
                    guard self.requestID == id else { call.reject("Recording cancelled.", "aborted"); return }
                    guard permission == .authorized else { self.finish(error: "not-allowed"); call.reject("Allow Speech Recognition in Settings.", "not-allowed"); return }
                    let granted: (Bool) -> Void = { allowed in
                        DispatchQueue.main.async {
                            guard self.requestID == id else { call.reject("Recording cancelled.", "aborted"); return }
                            guard allowed else { self.finish(error: "not-allowed"); call.reject("Allow microphone access in Settings.", "not-allowed"); return }
                            self.record(id: id, locale: locale, call: call)
                        }
                    }
                    if #available(iOS 17.0, *) { AVAudioApplication.requestRecordPermission(completionHandler: granted) }
                    else { AVAudioSession.sharedInstance().requestRecordPermission(granted) }
                }
            }
        }
    }
    private func record(id: String, locale: String, call: CAPPluginCall) {
        guard UIApplication.shared.applicationState != .background else { finish(error: "aborted"); call.reject("Keep the mission open.", "aborted"); return }
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale)), recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else {
            finish(error: "language-not-supported"); call.reject("On-device speech recognition is unavailable for this language.", "language-not-supported"); return
        }
        do {
            let audioSession = AVAudioSession.sharedInstance()
            previousAudioConfiguration = (audioSession.category, audioSession.mode, audioSession.categoryOptions)
            try audioSession.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetoothHFP])
            try audioSession.setActive(true)
            let engine = AVAudioEngine()
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.requiresOnDeviceRecognition = true
            request.shouldReportPartialResults = true
            self.engine = engine; self.request = request; latestText = ""
            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0 else { throw NSError(domain: "PhoneDictation", code: 1) }
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
            tapped = true
            task = recognizer.recognitionTask(with: request) { result, error in
                DispatchQueue.main.async {
                    guard self.requestID == id else { return }
                    if let result {
                        self.latestText = String(result.bestTranscription.formattedString.prefix(2000))
                        if result.isFinal { self.finish(); return }
                        self.emit(id, ["text": self.latestText, "final": false])
                    }
                    if error != nil {
                        // Stop can complete with a recognizer cancellation and a valid partial.
                        if self.finishDeadline != nil && !self.latestText.isEmpty { self.finish() }
                        else { self.finish(error: "no-speech") }
                    }
                }
            }
            engine.prepare(); try engine.start()
            limit = Timer.scheduledTimer(withTimeInterval: 60, repeats: false) { [weak self] _ in self?.stopInput(id: id) }
            call.resolve()
        } catch { finish(error: "audio-capture"); call.reject("The microphone could not start.", "audio-capture") }
    }
    private func stopInput(id: String) {
        guard requestID == id, finishDeadline == nil else { return }
        // A Stop during permission setup must cancel; it must never start recording later.
        guard engine != nil else { finish(error: "aborted"); return }
        releaseInput()
        limit?.invalidate(); limit = nil
        finishDeadline = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: false) { [weak self] _ in
            guard let self, self.requestID == id else { return }
            self.finish()
        }
    }
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { if let id = call.getString("requestId") { self.stopInput(id: id) }; call.resolve() }
    }
    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let id = call.getString("requestId"), self.requestID == id { self.finish(error: "aborted") }
            call.resolve()
        }
    }
}
