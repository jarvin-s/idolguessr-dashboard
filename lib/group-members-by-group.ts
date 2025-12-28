export interface MemberWithDate {
  name: string;
  lastPlayed: Date;
  daysAgo: number;
}

export interface UpcomingMember {
  name: string;
  scheduledDate: Date;
  daysUntil: number;
}

export interface GroupedDailies {
  groupName: string;
  members: MemberWithDate[];
  mostRecentDaysAgo: number;
  hasUpcoming: boolean;
  upcomingMembers: UpcomingMember[];
}

export interface GroupingResult {
  grouped: GroupedDailies[];
}

interface DailyWithDate {
  name: string;
  play_date: string;
  group_name?: string;
}

export function groupMembersByGroup(
  dailies: DailyWithDate[],
  upcomingDailies: DailyWithDate[] = []
): GroupingResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingByGroup = new Map<string, UpcomingMember[]>();
  for (const daily of upcomingDailies) {
    const groupName = daily.group_name;
    if (groupName) {
      const scheduledDate = new Date(daily.play_date);
      const daysUntil = Math.ceil(
        (scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (!upcomingByGroup.has(groupName)) {
        upcomingByGroup.set(groupName, []);
      }
      upcomingByGroup.get(groupName)!.push({
        name: daily.name,
        scheduledDate,
        daysUntil,
      });
    }
  }

  const memberLastPlayed = new Map<string, Date>();

  for (const daily of dailies) {
    if (!daily.group_name) continue;
    const playDate = new Date(daily.play_date);
    const memberKey = `${daily.group_name}:${daily.name.toLowerCase()}`;
    const existing = memberLastPlayed.get(memberKey);

    if (!existing || playDate > existing) {
      memberLastPlayed.set(memberKey, playDate);
    }
  }

  const groupMap = new Map<string, Map<string, MemberWithDate>>();

  for (const daily of dailies) {
    const groupName = daily.group_name;
    if (!groupName) continue;

    const memberKey = `${groupName}:${daily.name.toLowerCase()}`;
    const lastPlayed = memberLastPlayed.get(memberKey)!;
    const daysAgo = Math.floor(
      (today.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, new Map());
    }
    const members = groupMap.get(groupName)!;
    if (!members.has(memberKey)) {
      members.set(memberKey, {
        name: daily.name,
        lastPlayed,
        daysAgo,
      });
    }
  }

  const grouped: GroupedDailies[] = Array.from(groupMap.entries())
    .map(([groupName, membersMap]) => {
      const members = Array.from(membersMap.values()).sort(
        (a, b) => b.daysAgo - a.daysAgo
      );
      const mostRecentDaysAgo = Math.min(...members.map((m) => m.daysAgo));
      const upcomingMembers = upcomingByGroup.get(groupName) || [];
      return {
        groupName,
        members,
        mostRecentDaysAgo,
        hasUpcoming: upcomingMembers.length > 0,
        upcomingMembers,
      };
    })
    // Sort: groups without upcoming first (by mostRecentDaysAgo desc), then groups with upcoming
    .sort((a, b) => {
      if (a.hasUpcoming !== b.hasUpcoming) {
        return a.hasUpcoming ? 1 : -1;
      }
      return b.mostRecentDaysAgo - a.mostRecentDaysAgo;
    });

  return {
    grouped,
  };
}
