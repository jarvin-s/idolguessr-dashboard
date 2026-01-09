"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchRecentDailies,
  fetchUpcomingDailies,
} from "@/lib/fetch-recent-dailies";
import {
  groupMembersByGroup,
  GroupingResult,
  GroupedDailies,
  MemberWithDate,
  UpcomingMember,
} from "@/lib/group-members-by-group";

type ViewMode = "last-played" | "upcoming";

interface UpcomingGroup {
  groupName: string;
  members: UpcomingMember[];
  nextDaysUntil: number;
}

function GroupCard({ group }: { group: GroupedDailies }) {
  return (
    <div
      className={`border p-3 ${
        group.hasUpcoming ? "opacity-50 border-dashed" : ""
      }`}
    >
      <h4 className="font-bold text-md mb-2 p-2 bg-purple-400 flex justify-between items-center">
        <span className="flex items-center gap-2 text-[#f3f3f3]">
          {group.groupName}
          {group.hasUpcoming && (
            <span className="text-xs font-normal bg-green-700 text-[#f3f3f3] px-2 py-0.5">
              Upcoming:{" "}
              {group.upcomingMembers
                .map((m) => `${m.name} (${m.daysUntil}d)`)
                .join(", ")}
            </span>
          )}
        </span>
        <span className="text-md text-[#f3f3f3]">
          {group.mostRecentDaysAgo}d ago
        </span>
      </h4>
      <div className="flex flex-wrap gap-2">
        {group.members
          .slice()
          .reverse()
          .map((member: MemberWithDate) => (
            <span
              key={member.name}
              className="px-2 py-1 text-md flex items-center gap-1"
            >
              {member.name}
              <span className="text-sm text-muted-foreground">
                ({member.daysAgo}d)
              </span>
            </span>
          ))}
      </div>
    </div>
  );
}

function UpcomingGroupCard({ group }: { group: UpcomingGroup }) {
  return (
    <div className="border p-3">
      <h4 className="font-bold text-md mb-2 p-2 bg-[#03972f] flex justify-between items-center">
        <span className="text-[#f3f3f3]">{group.groupName}</span>
        <span className="text-md text-[#f3f3f3]">
          in {group.nextDaysUntil}d
        </span>
      </h4>
      <div className="flex flex-wrap gap-2">
        {group.members.map((member: UpcomingMember) => (
          <span
            key={member.name}
            className="px-2 py-1 text-md flex items-center gap-1"
          >
            {member.name}
            <span className="text-sm text-muted-foreground">
              ({member.daysUntil}d)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function RecentDailiesOverview() {
  const [groupingResult, setGroupingResult] = useState<GroupingResult | null>(
    null
  );
  const [upcomingGroups, setUpcomingGroups] = useState<UpcomingGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("last-played");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [dailies, upcoming] = await Promise.all([
          fetchRecentDailies("all"),
          fetchUpcomingDailies(),
        ]);
        const result = groupMembersByGroup(dailies, upcoming);
        setGroupingResult(result);

        // Process upcoming dailies into grouped format
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingByGroup = new Map<string, UpcomingMember[]>();
        for (const daily of upcoming) {
          const groupName = daily.group_name || "Unknown";
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

        const grouped: UpcomingGroup[] = Array.from(upcomingByGroup.entries())
          .map(([groupName, members]) => ({
            groupName,
            members: members.sort((a, b) => a.daysUntil - b.daysUntil),
            nextDaysUntil: Math.min(...members.map((m) => m.daysUntil)),
          }))
          .sort((a, b) => a.nextDaysUntil - b.nextDaysUntil);

        setUpcomingGroups(grouped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <Card className="w-full h-[620px] flex flex-col">
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle>Dailies overview</CardTitle>
          <div className="flex-full bg-muted p-1 gap-1">
            <button
              onClick={() => setViewMode("last-played")}
              className={`px-3 py-1 text-sm cursor-pointer-full ${
                viewMode === "last-played"
                  ? "bg-purple-400 text-white hover:bg-purple-400/90"
                  : "hover:bg-gray-200"
              }`}
            >
              Last played
            </button>
            <button
              onClick={() => setViewMode("upcoming")}
              className={`px-3 py-1 text-sm cursor-pointer-full ${
                viewMode === "upcoming"
                  ? "bg-[#03972f] text-white hover:bg-[#03972f]/90"
                  : "hover:bg-gray-200"
              }`}
            >
              Upcoming idols
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading && <p className="text-muted-foreground">Loading...</p>}

        {error && <p className="text-destructive">{error}</p>}

        {!isLoading &&
          !error &&
          viewMode === "last-played" &&
          groupingResult && (
            <div className="space-y-3">
              {groupingResult.grouped.map((group) => (
                <GroupCard key={group.groupName} group={group} />
              ))}

              {/* Empty state */}
              {groupingResult.grouped.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No dailies found.
                </p>
              )}
            </div>
          )}

        {!isLoading && !error && viewMode === "upcoming" && (
          <div className="space-y-3">
            {upcomingGroups.map((group) => (
              <UpcomingGroupCard key={group.groupName} group={group} />
            ))}

            {/* Empty state */}
            {upcomingGroups.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No upcoming idols scheduled.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
