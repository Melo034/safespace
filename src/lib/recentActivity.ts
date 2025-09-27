import supabase from "@/server/supabase";

export type RecentActivityType = "report" | "story" | "comment" | "support" | "system" | "resource";

export interface RecentActivityPayload {
  message: string;
  type?: RecentActivityType | string;
  status?: string;
}

function sanitizeMessage(message: string): string {
  return message.length > 280 ? `${message.slice(0, 277)}...` : message;
}

export async function logRecentActivity({ message, type, status }: RecentActivityPayload) {
  try {
    const payload = {
      message: sanitizeMessage(message.trim()),
      type: (type ?? "system").toLowerCase(),
      status: (status ?? "info").toLowerCase(),
    };

    if (!payload.message) return;

    const { error } = await supabase.from("recent_activity").insert(payload);
    if (error) throw error;
  } catch (error) {
    console.warn("Failed to log recent activity", error);
  }
}
