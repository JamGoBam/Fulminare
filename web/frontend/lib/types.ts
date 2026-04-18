export type Recommendation = "Transfer Now" | "Wait" | "Escalate";
export type RiskLevel = "High" | "Medium" | "Low";
export type DcStatus = "healthy" | "low" | "critical" | "overstock";

export interface TransferDetails {
  sourceDC: string;
  unitsAvailable: number;
  leadTime: string;
  estimatedArrival: string;
  cost: number;
  postTransferHealth: string;
  confidence: number;
}

export interface InboundDetails {
  poEta: string;
  delayRisk: string;
  complianceFlags: string[];
  stockoutWindow: string;
  penaltyRisk: number;
  confidence: number;
}

export interface ActionItem {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  brand: string;
  atRiskDC: string;
  daysUntilStockout: number;
  companyWideInventory: number;
  recommendation: Recommendation;
  riskLevel: RiskLevel;
  potentialPenalty: number;
  reason: string;
  confidence: number;
  updatedAt: string;
  transferDetails: TransferDetails;
  inboundDetails: InboundDetails;
  reasoning: string[];
}
