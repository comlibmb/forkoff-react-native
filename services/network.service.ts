import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

type NetworkListener = (isConnected: boolean) => void;

class NetworkService {
  private listeners: NetworkListener[] = [];
  private subscription: NetInfoSubscription | null = null;
  private _isConnected: boolean = true;

  get isConnected(): boolean {
    return this._isConnected;
  }

  async initialize(): Promise<void> {
    // Get initial state
    const state = await NetInfo.fetch();
    this._isConnected = state.isConnected ?? true;

    // Subscribe to network changes
    this.subscription = NetInfo.addEventListener(this.handleNetworkChange);
  }

  private handleNetworkChange = (state: NetInfoState): void => {
    const isConnected = state.isConnected ?? true;

    if (this._isConnected !== isConnected) {
      this._isConnected = isConnected;
      console.log('[NetworkService] Connection changed:', isConnected ? 'online' : 'offline');
      this.notifyListeners(isConnected);
    }
  };

  private notifyListeners(isConnected: boolean): void {
    this.listeners.forEach((listener) => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('[NetworkService] Listener error:', error);
      }
    });
  }

  subscribe(listener: NetworkListener): () => void {
    this.listeners.push(listener);

    // Immediately notify with current state
    listener(this._isConnected);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this._isConnected = state.isConnected ?? true;
    return this._isConnected;
  }

  destroy(): void {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    this.listeners = [];
  }
}

export const networkService = new NetworkService();
export default networkService;
