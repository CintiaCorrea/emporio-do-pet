export interface Board {
  id: string;
  name: string;
  description?: string;
  color: string;
  favorite: boolean;
  progress: number;
  totalDeals: number;
  updatedAt: string;
}

export interface StatsCard {
  label: string;
  value: string;
  color: 'blue' | 'yellow' | 'green' | 'purple';
}
