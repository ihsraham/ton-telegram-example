import { useEffect, useState } from "react";
import {
  Web3Auth,
  WEB3AUTH_NETWORK,
  WALLET_CONNECTORS,
  AUTH_CONNECTION,
} from "@web3auth/modal";
import TonRPC from "./tonRpc";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import { useTelegramMock } from "./hooks/useMockTelegramInitData";
import {
  Sun,
  Moon,
  Copy,
  Check,
  Wallet,
  Shield,
  Zap,
  User,
  Hash,
  MessageSquare,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Bug,
} from "lucide-react";
import Loading from "./components/Loading";
import TelegramLogo from "./assets/TelegramLogo.svg";
import web3AuthLogoLight from "./assets/web3AuthLogoLight.svg";
import web3AuthLogoDark from "./assets/web3AuthLogoDark.svg";
import "./App.css";

const authConnectionId = "w3a-telegram-demo";
const clientId =
  "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

const generateGenericAvatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=random`;

const getFallbackAvatar = (user: any) => {
  if (!user) return generateGenericAvatarUrl("User");

  const name =
    `${user.firstName || user.first_name || ""} ${
      user.lastName || user.last_name || ""
    }`.trim() ||
    user.username ||
    "User";
  return user.photoUrl || user.photo_url || generateGenericAvatarUrl(name);
};

// Platform detection helper
const isMobilePlatform = () => {
  // Check if Telegram WebApp is available
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp as any;
    const platform = webApp.platform;
    if (platform) {
      return platform === "android" || platform === "ios";
    }
  }

  // Fallback to user agent detection
  if (typeof window !== "undefined") {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  return false;
};

function App() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [web3Auth, setWeb3Auth] = useState<Web3Auth | null>(null);
  const [web3AuthInitialized, setWeb3AuthInitialized] = useState(false);
  const [userData, setUserData] = useState<any | null>(null);
  const [tonAccountAddress, setTonAccountAddress] = useState<string | null>(
    null
  );
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({
    account: false,
    message: false,
  });

  const { initDataRaw, initData } = useLaunchParams() || {};

  useTelegramMock();

  // Debug logging function
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  // Detect mobile platform
  useEffect(() => {
    const mobile = isMobilePlatform();
    setIsMobile(mobile);

    // Add debug logs
    addDebugLog(`Platform detection: ${mobile ? "Mobile" : "Desktop"}`);
    addDebugLog(
      `Telegram platform: ${
        window.Telegram?.WebApp
          ? (window.Telegram.WebApp as any).platform || "unknown"
          : "not available"
      }`
    );
    addDebugLog(`User agent: ${navigator.userAgent.substring(0, 50)}...`);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark-mode");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.body.classList.remove("dark-mode");
    }
  }, [isDarkMode]);

  // Add mobile class to body for CSS targeting
  useEffect(() => {
    if (isMobile) {
      document.body.classList.add("mobile-platform");
    } else {
      document.body.classList.remove("mobile-platform");
    }
  }, [isMobile]);

  useEffect(() => {
    const initializeWeb3Auth = async () => {
      try {
        const web3authInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
        });

        setWeb3Auth(web3authInstance);
        await web3authInstance.init();
        setWeb3AuthInitialized(true);
      } catch (error) {
        console.error("Error initializing Web3Auth:", error);
      }
    };

    initializeWeb3Auth();
  }, []);

  useEffect(() => {
    const connectWeb3Auth = async () => {
      if (web3Auth && web3AuthInitialized && initDataRaw) {
        setIsLoggingIn(true);
        try {
          if (web3Auth.status === "connected") {
            await web3Auth.logout();
            addDebugLog("Logged out from previous session");
          }

          addDebugLog("Getting ID token from server...");
          const idToken = await getIdTokenFromServer(
            initDataRaw,
            initData?.user.photoUrl
          );
          if (!idToken) {
            addDebugLog("Failed to get ID token");
            return;
          }

          addDebugLog("Connecting to Web3Auth...");
          await web3Auth.connectTo(WALLET_CONNECTORS.AUTH, {
            authConnectionId,
            authConnection: AUTH_CONNECTION.CUSTOM,
            idToken,
            extraLoginOptions: {
              isUserIdCaseSensitive: true,
            },
          });

          setIsLoggedIn(true);
          addDebugLog("Web3Auth connection successful");

          const tonRpc = new TonRPC(web3Auth.provider);
          addDebugLog("Getting TON wallet address...");
          const tonAddress = await tonRpc.getAccounts();
          setTonAccountAddress(tonAddress);
          addDebugLog(`TON address: ${tonAddress.substring(0, 20)}...`);

          addDebugLog("Signing test message...");
          const messageToSign = "Hello, TON!";
          const signedMsg = await tonRpc.signMessage(messageToSign);
          setSignedMessage(signedMsg);
          addDebugLog("Message signed successfully");
        } catch (error) {
          console.error("Error during Web3Auth connection:", error);
          addDebugLog(
            `Error: ${error instanceof Error ? error.message : String(error)}`
          );
        } finally {
          setIsLoggingIn(false);
        }
      }
    };

    if (web3AuthInitialized && initDataRaw) {
      connectWeb3Auth();
    }
  }, [initDataRaw, web3Auth, web3AuthInitialized, initData?.user.photoUrl]);

  useEffect(() => {
    if (initData?.user) {
      setUserData(initData.user);
    }
  }, [initData]);

  const getIdTokenFromServer = async (
    initDataRaw: string,
    photoUrl: string | undefined
  ) => {
    const isMocked = !!sessionStorage.getItem("____mocked");
    const response = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/auth/telegram`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ initDataRaw, isMocked, photoUrl }),
      }
    );
    const data = await response.json();
    return data.token;
  };

  const copyToClipboard = async (text: string, type: "account" | "message") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({
        ...prev,
        [type]: true,
      }));

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates((prev) => ({
          ...prev,
          [type]: false,
        }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="app-container">
      {/* Animated Background */}
      <div className="background-animation">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      <div className="container">
        {/* Hero Header */}
        <div className="hero-header">
          <div className="logo-section">
            <div className="logo-wrapper">
              <img
                src={isDarkMode ? web3AuthLogoDark : web3AuthLogoLight}
                alt="Web3Auth Logo"
                className="web3auth-logo"
              />
              <div className="logo-glow"></div>
            </div>
            <div className="header-controls">
              <button
                onClick={() => setShowDebugLogs(!showDebugLogs)}
                className="debug-toggle"
                aria-label="Toggle debug logs">
                <Bug className="debug-icon" />
                {debugLogs.length > 0 && (
                  <span className="debug-count">{debugLogs.length}</span>
                )}
              </button>
              <button
                onClick={toggleDarkMode}
                className="theme-toggle"
                aria-label="Toggle dark mode">
                {isDarkMode ? (
                  <Sun className="theme-icon" />
                ) : (
                  <Moon className="theme-icon" />
                )}
              </button>
            </div>
          </div>

          <div className="hero-content">
            <div className="title-section">
              <h1 className="main-title">
                <Sparkles className="title-icon" />
                Web3Auth Telegram MiniApp
              </h1>
              <div className="status-badge">
                <CheckCircle2 size={16} />
                <span>Powered by TON</span>
              </div>
            </div>

            <p className="hero-description">
              Experience the future of Web3 authentication. Seamlessly connect
              your Telegram identity to blockchain wallets with enterprise-grade
              security.
              {isMobile && (
                <span
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--accent-success)",
                    marginTop: "0.5rem",
                    opacity: 0.7,
                  }}>
                  📱 Mobile-optimized UI active
                </span>
              )}
            </p>

            {isLoggedIn && (
              <div className="connection-status">
                <div className="status-indicator">
                  <div className="pulse-dot"></div>
                  <span>Connected & Secured</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Debug Logs Panel */}
        {showDebugLogs && (
          <div className="debug-panel">
            <div className="debug-header">
              <h3>Debug Logs</h3>
              <button
                onClick={() => setDebugLogs([])}
                className="clear-logs-btn">
                Clear
              </button>
            </div>
            <div className="debug-logs">
              {debugLogs.length === 0 ? (
                <p className="no-logs">No logs yet...</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="debug-log-item">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {isLoggingIn ? (
          <div className="loading-section">
            <Loading />
            <p className="loading-text">Establishing secure connection...</p>
          </div>
        ) : (
          <div className="content-grid">
            {isLoggedIn && (
              <>
                {/* User Profile Card */}
                <div className="profile-card">
                  <div className="card-header">
                    <User className="card-icon" />
                    <h3>Your Identity</h3>
                    <div className="verified-badge">
                      <Shield size={14} />
                      <span>Verified</span>
                    </div>
                  </div>

                  <div className="profile-content">
                    <div className="avatar-section">
                      <div className="avatar-wrapper">
                        <img
                          src={getFallbackAvatar(userData)}
                          alt="User avatar"
                          className="user-avatar"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = generateGenericAvatarUrl(
                              userData?.firstName ||
                                userData?.username ||
                                "User"
                            );
                          }}
                        />
                        <div className="avatar-ring"></div>
                        <div className="online-indicator"></div>
                      </div>
                    </div>

                    <div className="user-details">
                      <div className="detail-row">
                        <Hash className="detail-icon" />
                        <div className="detail-content">
                          <span className="detail-label">Telegram ID</span>
                          <span className="detail-value">{userData?.id}</span>
                        </div>
                        <img
                          src={TelegramLogo}
                          alt="Telegram"
                          className="telegram-badge"
                        />
                      </div>

                      <div className="detail-row">
                        <User className="detail-icon" />
                        <div className="detail-content">
                          <span className="detail-label">Username</span>
                          <span className="detail-value">
                            @{userData?.username}
                          </span>
                        </div>
                      </div>

                      <div className="detail-row">
                        <span className="detail-icon">👤</span>
                        <div className="detail-content">
                          <span className="detail-label">Full Name</span>
                          <span className="detail-value">
                            {userData?.firstName} {userData?.lastName || ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet Card */}
                <div className="wallet-card">
                  <div className="card-header">
                    <Wallet className="card-icon" />
                    <h3>TON Wallet</h3>
                    <div className="network-badge">
                      <Zap size={14} />
                      <span>Mainnet</span>
                    </div>
                  </div>

                  <div className="wallet-content">
                    <div className="address-section">
                      <div className="address-label">
                        <span>Wallet Address</span>
                        <div className="security-indicator">
                          <Shield size={12} />
                          <span>Secured</span>
                        </div>
                      </div>
                      <div className="address-display">
                        <code className="address-text">
                          {tonAccountAddress}
                        </code>
                        <button
                          className={`copy-button ${
                            copiedStates.account ? "copied" : ""
                          }`}
                          onClick={() =>
                            copyToClipboard(tonAccountAddress || "", "account")
                          }>
                          {copiedStates.account ? (
                            <Check className="copy-icon success" size={18} />
                          ) : (
                            <Copy className="copy-icon" size={18} />
                          )}
                        </button>
                      </div>
                      {copiedStates.account && (
                        <div className="copy-feedback">
                          <Check size={16} />
                          <span>Address copied to clipboard!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message Card */}
                <div className="message-card">
                  <div className="card-header">
                    <MessageSquare className="card-icon" />
                    <h3>Signed Message</h3>
                    <div className="signature-badge">
                      <CheckCircle2 size={14} />
                      <span>Verified</span>
                    </div>
                  </div>

                  <div className="message-content">
                    <div className="message-section">
                      <div className="message-label">
                        <span>Cryptographic Signature</span>
                        <div className="timestamp">
                          <span>Just now</span>
                        </div>
                      </div>
                      <div className="message-display">
                        <code className="message-text">{signedMessage}</code>
                        <button
                          className={`copy-button ${
                            copiedStates.message ? "copied" : ""
                          }`}
                          onClick={() =>
                            copyToClipboard(signedMessage || "", "message")
                          }>
                          {copiedStates.message ? (
                            <Check className="copy-icon success" size={18} />
                          ) : (
                            <Copy className="copy-icon" size={18} />
                          )}
                        </button>
                      </div>
                      {copiedStates.message && (
                        <div className="copy-feedback">
                          <Check size={16} />
                          <span>Signature copied to clipboard!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Enhanced Footer */}
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-info">
              <p>Built with Web3Auth & TON Blockchain</p>
              <div className="tech-badges">
                <span className="tech-badge">🔐 Enterprise Security</span>
                <span className="tech-badge">⚡ Lightning Fast</span>
                <span className="tech-badge">🌐 Cross-Platform</span>
              </div>
            </div>
            <a
              href="https://web3auth.io/community/t/build-powerful-telegram-mini-apps-with-web3auth/9244"
              target="_blank"
              rel="noopener noreferrer"
              className={`cta-button ${isMobile ? "mobile-friendly" : ""}`}>
              <span>Learn More</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
