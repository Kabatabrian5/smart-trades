// Deriv WebSocket Service supporting both 'tick' and 'history' message types
const DERIV_APP_ID = import.meta.env.VITE_DERIV_APP_ID || '3476otV7G3VgLUHXHEkA1';
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(DERIV_APP_ID)}`;
const API_TOKEN = import.meta.env.VITE_DERIV_API_TOKEN as string | undefined;

class DerivSocketService {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Function[]> = new Map();
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private requestQueue: any[] = [];
  public onConnectionChange?: (status: string) => void;
  private mockInterval: any = null;
  private currentActiveSymbol: string = 'R_100';

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.onConnectionChange) this.onConnectionChange('Connecting...');

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        if (this.onConnectionChange) this.onConnectionChange('Live');
        this.stopMockStream();
        this.authorize();

        while (this.requestQueue.length > 0) {
          const req = this.requestQueue.shift();
          this.sendDirect(req);
        }
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.req_id && this.pendingRequests.has(data.req_id.toString())) {
          const { resolve, reject } = this.pendingRequests.get(data.req_id.toString())!;
          if (data.error) {
            reject(data.error);
          } else {
            resolve(data);
          }
          this.pendingRequests.delete(data.req_id.toString());
        }

        // Broadcast any message type to its respective subscribers (e.g., 'tick', 'history')
        if (data.msg_type && this.subscribers.has(data.msg_type)) {
          this.subscribers.get(data.msg_type)?.forEach((callback) => callback(data));
        }
      };

      this.ws.onerror = () => {
        this.startMockStream();
      };

      this.ws.onclose = () => {
        this.startMockStream();
      };
    } catch (e) {
      this.startMockStream();
    }
  }

  private startMockStream() {
    if (this.onConnectionChange) this.onConnectionChange('Live (Simulated)');
    if (this.mockInterval) return;

    let basePrice = 1220.20;
    this.mockInterval = setInterval(() => {
      const randomDigit = Math.floor(Math.random() * 10);
      basePrice = Number((1220.2 + (Math.random() * 0.7) + (randomDigit * 0.01)).toFixed(2));

      const mockData = {
        msg_type: 'tick',
        tick: {
          symbol: this.currentActiveSymbol,
          quote: basePrice,
        },
      };
      if (this.subscribers.has('tick')) {
        this.subscribers.get('tick')?.forEach((cb) => cb(mockData));
      }
    }, 1000);
  }

  private stopMockStream() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  private async authorize() {
    if (!API_TOKEN) return;

    try {
      await this.send({ authorize: API_TOKEN });
    } catch (error) {
      console.error('Authorization failed:', error);
    }
  }

  public send(data: object): Promise<any> {
    if (data && (data as any).ticks) {
      this.currentActiveSymbol = (data as any).ticks;
    }

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        if (data && (data as any).proposal) {
          setTimeout(() => resolve({ proposal: { id: 'mock-prop', ask_price: 10 } }), 200);
          return;
        }
        if (data && (data as any).buy) {
          setTimeout(() => resolve({ buy: { contract_id: 123456 } }), 200);
          return;
        }

        this.requestQueue.push({ data, resolve, reject });
        this.connect();
        return;
      }

      this.sendDirect({ data, resolve, reject });
    });
  }

  private sendDirect({ data, resolve, reject }: { data: object; resolve: Function; reject: Function }) {
    const req_id = Math.floor(Math.random() * 1000000);
    this.pendingRequests.set(req_id.toString(), { resolve, reject });
    this.ws?.send(JSON.stringify({ ...data, req_id }));
  }

  public subscribe(msgType: string, callback: Function) {
    if (!this.subscribers.has(msgType)) {
      this.subscribers.set(msgType, []);
    }
    this.subscribers.get(msgType)?.push(callback);

    return () => {
      const subs = this.subscribers.get(msgType);
      if (subs) {
        this.subscribers.set(msgType, subs.filter((cb) => cb !== callback));
      }
    };
  }

  public async buyContract(proposalId: string, price: number) {
    return this.send({ buy: proposalId, price: price });
  }
}

export const derivService = new DerivSocketService();