import { STATUS_COLORS, STATUS_BG_COLORS, STATUS_TEXT_COLORS } from "@/constants/status";

export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "border-l-gray-500";
};

export const getStatusBgColor = (status: string): string => {
  return STATUS_BG_COLORS[status as keyof typeof STATUS_BG_COLORS] || "bg-gray-100";
};

export const getStatusTextColor = (status: string): string => {
  return STATUS_TEXT_COLORS[status as keyof typeof STATUS_TEXT_COLORS] || "text-gray-800";
};
