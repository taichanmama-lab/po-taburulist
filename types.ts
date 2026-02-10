
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
  weight: number;   // kg
  noise: number;    // dB
  hasLed: boolean;
  hasChildLock: boolean;
  amazonUrl: string;
  rakutenUrl: string;
  imageUrl?: string;
}

export interface FilterCriteria {
  capacity: string;
  output: string;
  weight: string;
  noise: string;
  led: string;
  lock: string;
}
