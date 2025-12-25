import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        print("🟢 APP DELEGATE: App has launched!") // <--- If you don't see this, the app is dead on arrival.
        return true
    }

    // MARK: UISceneSession Lifecycle
    // MARK: UISceneSession Lifecycle
        func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
            
            print("🟢 APP DELEGATE: Manually connecting to Scene...")
            
            // 1. Create a manual configuration
            let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
            
            // 2. HARDCODE the link to your SceneDelegate class
            config.delegateClass = SceneDelegate.self
            
            return config
        }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {}
}
