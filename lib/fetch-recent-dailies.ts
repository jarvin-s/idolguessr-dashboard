import { getSupabaseClient } from "./supabase-client";

export type TimeRange = "7days" | "30days" | "all";

export interface DailyRecord {
  name: string;
  play_date: string;
  group_type: "boy-group" | "girl-group";
  group_name?: string;
}

export async function fetchRecentDailies(
  timeRange: TimeRange
): Promise<DailyRecord[]> {
  const supabase = getSupabaseClient();
  const now = new Date();

  let query = supabase
    .from("dailies")
    .select("name, play_date, group_type, group_name")
    .lte("play_date", now.toISOString())
    .order("play_date", { ascending: false });

  if (timeRange !== "all") {
    const daysAgo = timeRange === "7days" ? 7 : 30;
    const fromDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    query = query.gte("play_date", fromDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching recent dailies:", error);
    throw new Error(`Failed to fetch recent dailies: ${error.message}`);
  }

  return data || [];
}

export async function fetchUpcomingDailies(): Promise<DailyRecord[]> {
  const supabase = getSupabaseClient();
  const now = new Date();

  const { data, error } = await supabase
    .from("dailies")
    .select("name, play_date, group_type, group_name")
    .gt("play_date", now.toISOString())
    .order("play_date", { ascending: true });

  if (error) {
    console.error("Error fetching upcoming dailies:", error);
    throw new Error(`Failed to fetch upcoming dailies: ${error.message}`);
  }

  return data || [];
}
