// Extend the global Window interface to include Telegram WebApp
interface Window {
  Telegram?: {
    WebApp?: {
      initData: string;
      initDataUnsafe: any;
      platform: string;
      close: () => void;
      // Add other WebApp methods if needed
    };
  };
}
