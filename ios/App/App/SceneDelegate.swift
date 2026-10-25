import UIKit
import Capacitor
@preconcurrency import AVFAudio

@objc(NativeSpeechPlugin)
final class NativeSpeechPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    let identifier = "NativeSpeechPlugin"
    let jsName = "NativeSpeech"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getVoices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let synthesizer = AVSpeechSynthesizer()
    private var pendingSpeechCall: CAPPluginCall?
    private var pendingUtterance: AVSpeechUtterance?

    override func load() {
        synthesizer.delegate = self
    }

    @objc func getVoices(_ call: CAPPluginCall) {
        let voices: [[String: Any]] = AVSpeechSynthesisVoice.speechVoices().map { voice in
            [
                "id": voice.identifier,
                "name": voice.name,
                "language": voice.language,
                "quality": qualityName(for: voice)
            ]
        }
        call.resolve(["voices": voices])
    }

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("Text is required")
            return
        }

        let locale = call.getString("locale") ?? Locale.current.identifier
        let requestedVoiceID = call.getString("voiceId")
        let requestedRate = call.getDouble("rate") ?? 1

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.finishPendingSpeech(cancelled: true)
            if self.synthesizer.isSpeaking {
                self.synthesizer.stopSpeaking(at: .immediate)
            }

            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = self.bestVoice(locale: locale, requestedID: requestedVoiceID)
            let scaledRate = Float(requestedRate) * AVSpeechUtteranceDefaultSpeechRate
            utterance.rate = min(max(scaledRate, AVSpeechUtteranceMinimumSpeechRate), AVSpeechUtteranceMaximumSpeechRate)

            self.pendingSpeechCall = call
            self.pendingUtterance = utterance
            self.synthesizer.speak(utterance)
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            if self.synthesizer.isSpeaking {
                self.synthesizer.stopSpeaking(at: .immediate)
            }
            self.finishPendingSpeech(cancelled: true)
            call.resolve()
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        guard pendingUtterance === utterance else { return }
        finishPendingSpeech(cancelled: false)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        guard pendingUtterance === utterance else { return }
        finishPendingSpeech(cancelled: true)
    }

    private func finishPendingSpeech(cancelled: Bool) {
        pendingSpeechCall?.resolve(["cancelled": cancelled])
        pendingSpeechCall = nil
        pendingUtterance = nil
    }

    private func qualityName(for voice: AVSpeechSynthesisVoice) -> String {
        if #available(iOS 16.0, *), voice.quality == .premium {
            return "premium"
        }
        return voice.quality == .enhanced ? "enhanced" : "default"
    }

    private func bestVoice(locale: String, requestedID: String?) -> AVSpeechSynthesisVoice? {
        let all = AVSpeechSynthesisVoice.speechVoices()
        if let requestedID, let requested = all.first(where: { $0.identifier == requestedID }) {
            return requested
        }

        let normalized = locale.replacingOccurrences(of: "_", with: "-").lowercased()
        let family = normalized.split(separator: "-").first.map(String.init) ?? normalized
        let candidates = all.filter { voice in
            let language = voice.language.replacingOccurrences(of: "_", with: "-").lowercased()
            return language == normalized || language.hasPrefix("\(family)-")
        }

        return candidates.sorted { lhs, rhs in
            let lhsExact = lhs.language.replacingOccurrences(of: "_", with: "-").lowercased() == normalized
            let rhsExact = rhs.language.replacingOccurrences(of: "_", with: "-").lowercased() == normalized
            if lhsExact != rhsExact { return lhsExact }
            let lhsQuality = qualityRank(for: lhs)
            let rhsQuality = qualityRank(for: rhs)
            if lhsQuality != rhsQuality { return lhsQuality > rhsQuality }
            return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
        }.first ?? AVSpeechSynthesisVoice(language: locale)
    }

    private func qualityRank(for voice: AVSpeechSynthesisVoice) -> Int {
        if #available(iOS 16.0, *), voice.quality == .premium { return 2 }
        if voice.quality == .enhanced { return 1 }
        return 0
    }
}

final class LanguageThresholdBridgeViewController: CAPBridgeViewController {
    override var preferredStatusBarStyle: UIStatusBarStyle {
        .lightContent
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NativeSpeechPlugin())
        bridge?.registerPluginInstance(WatchTalkPlugin())
        bridge?.registerPluginInstance(PhoneDictationPlugin())
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = LanguageThresholdBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
