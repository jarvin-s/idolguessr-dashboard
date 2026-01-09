import { getSupabaseClient } from "./supabase-client";

export interface DailyEntry {
  name: string;
  play_date: string;
  group_type: "boy-group" | "girl-group";
  group_name: string;
}

export interface IdolDailyStatus {
  name: string;
  status: "past" | "today" | "upcoming";
  date: Date;
  formattedDate: string;
}

export interface GroupWithIdols {
  groupName: string;
  groupType: "boy-group" | "girl-group";
  idols: IdolDailyStatus[];
}

export async function fetchAllDailies(): Promise<DailyEntry[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("dailies")
    .select("name, play_date, group_type, group_name")
    .order("play_date", { ascending: true });

  if (error) {
    console.error("Error fetching all dailies:", error);
    throw new Error(`Failed to fetch all dailies: ${error.message}`);
  }

  return (data || []).filter((d) => d.group_name) as DailyEntry[];
}

export function organizeDailiesByGroup(dailies: DailyEntry[]): GroupWithIdols[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const groupMap = new Map<string, GroupWithIdols>();

  for (const daily of dailies) {
    const playDate = new Date(daily.play_date);
    playDate.setHours(0, 0, 0, 0);

    let status: "past" | "today" | "upcoming";
    if (playDate < today) {
      status = "past";
    } else if (playDate.getTime() === today.getTime()) {
      status = "today";
    } else {
      status = "upcoming";
    }

    const formattedDate = playDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const idolEntry: IdolDailyStatus = {
      name: daily.name,
      status,
      date: playDate,
      formattedDate,
    };

    if (!groupMap.has(daily.group_name)) {
      groupMap.set(daily.group_name, {
        groupName: daily.group_name,
        groupType: daily.group_type,
        idols: [],
      });
    }

    groupMap.get(daily.group_name)!.idols.push(idolEntry);
  }

  // Sort idols within each group by date (most recent first for past, soonest first for upcoming)
  for (const group of groupMap.values()) {
    group.idols.sort((a, b) => {
      // Today items first
      if (a.status === "today" && b.status !== "today") return -1;
      if (b.status === "today" && a.status !== "today") return 1;
      // Then upcoming (sorted by closest date)
      if (a.status === "upcoming" && b.status === "upcoming") {
        return a.date.getTime() - b.date.getTime();
      }
      if (a.status === "upcoming" && b.status !== "upcoming") return -1;
      if (b.status === "upcoming" && a.status !== "upcoming") return 1;
      // Then past (sorted by most recent)
      return b.date.getTime() - a.date.getTime();
    });
  }

  // Sort groups alphabetically
  return Array.from(groupMap.values()).sort((a, b) =>
    a.groupName.localeCompare(b.groupName, undefined, { sensitivity: "base" })
  );
}
