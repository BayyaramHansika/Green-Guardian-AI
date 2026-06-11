export interface PlantProfile {
  name: string;
  species: string;
  variety: string;
  location: string;
  plantedDate: string;
  growthStage: string;
  sunlight: "Full" | "Partial" | "Shade";
  watering: "Daily" | "Every 2 Days" | "Weekly";
  soilType: string;
  lastFertilized: string;
  symptoms: string;
  healthScore: number;
}

export interface TreatmentPlan {
  immediate: string[];
  chemical: string[];
  organic: string[];
  prevention: string[];
}

export interface AnalysisResult {
  disease: string;
  scientific: string;
  severity: "Mild" | "Moderate" | "Severe";
  confidence: number;
  symptoms: string[];
  spread_risk: number;
  treatment: TreatmentPlan;
  isFallback?: boolean;
}

export interface ScanRecord {
  id?: string;
  userId: string;
  plantName: string;
  result: AnalysisResult;
  date: string;
  imageData?: string; // base64 string of the analyzed leaf image
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
