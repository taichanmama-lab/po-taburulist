
export interface Appliance {
  id: string;
  name: string;
  category: string;
  wattage: number;
}

export interface PowerStation {
  maker: string;
  model: string;
  price: number;
  capacity: number; // Wh
  output: number;   // W
  maxOutput: number; // 瞬間最大出力
  weight: number;   // kg
  noise: number;    // dB
  hasLed: boolean;
  hasChildLock: boolean;
  amazonUrl: string;
  rakutenUrl: string;
  imageUrl?: string;
  batteryType?: string; // バッテリー種類
  warranty?: string;    // 保証期間
}

export interface FilterCriteria {
  capacity: string;
  output: string;
  weight: string;
  noise: string;
  led: string;
  lock: string;
}
