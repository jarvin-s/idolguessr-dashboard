"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { AccessModal } from "@/components/access-modal";
import {
  fetchAllDailies,
  organizeDailiesByGroup,
  GroupWithIdols,
  IdolDailyStatus,
} from "@/lib/fetch-all-dailies";
import groupsData from "@/data/groups.json";

type FilterMode = "all" | "boy-group" | "girl-group";

function IdolBadge({ idol }: { idol: IdolDailyStatus }) {
  const statusStyles = {
    past: "bg-gray-100 text-gray-700 border-gray-300",
    today: "bg-purple-500 text-white border-purple-600",
    upcoming: "bg-green-100 text-green-700 border-green-300",
  };

  const statusLabels = {
    past: "Played",
    today: "Today",
    upcoming: "Upcoming",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 border ${statusStyles[idol.status]}`}
    >
      <span className="font-medium">{idol.name}</span>
      <span className="text-xs opacity-75">
        {idol.status === "today" ? statusLabels[idol.status] : idol.formattedDate}
      </span>
    </div>
  );
}

function GroupSection({ group }: { group: GroupWithIdols }) {
  const pastIdols = group.idols.filter((i) => i.status === "past");
  const todayIdols = group.idols.filter((i) => i.status === "today");
  const upcomingIdols = group.idols.filter((i) => i.status === "upcoming");

  return (
    <div className="border overflow-hidden">
      <div
        className={`px-4 py-3 font-semibold text-white ${
          group.groupType === "boy-group" ? "bg-blue-500" : "bg-pink-500"
        }`}
      >
        <div className="flex items-center justify-between">
          <span>{group.groupName}</span>
          <span className="text-sm opacity-75">
            {group.idols.length} {group.idols.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {todayIdols.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-purple-600 mb-2">Today</h4>
            <div className="flex flex-wrap gap-2">
              {todayIdols.map((idol, idx) => (
                <IdolBadge key={`today-${idol.name}-${idx}`} idol={idol} />
              ))}
            </div>
          </div>
        )}

        {upcomingIdols.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-600 mb-2">Upcoming</h4>
            <div className="flex flex-wrap gap-2">
              {upcomingIdols.map((idol, idx) => (
                <IdolBadge key={`upcoming-${idol.name}-${idx}`} idol={idol} />
              ))}
            </div>
          </div>
        )}

        {pastIdols.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Previously played</h4>
            <div className="flex flex-wrap gap-2">
              {pastIdols.map((idol, idx) => (
                <IdolBadge key={`past-${idol.name}-${idx}`} idol={idol} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyGroupSection({
  groupName,
  groupType,
}: {
  groupName: string;
  groupType: "boy-group" | "girl-group";
}) {
  return (
    <div className="border border-dashed overflow-hidden opacity-50">
      <div
        className={`px-4 py-3 font-semibold text-white ${
          groupType === "boy-group" ? "bg-blue-500" : "bg-pink-500"
        }`}
      >
        <div className="flex items-center justify-between">
          <span>{groupName}</span>
          <span className="text-sm opacity-75">No entries</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          No idols from this group have been in the daily yet.
        </p>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [groups, setGroups] = useState<GroupWithIdols[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showEmptyGroups, setShowEmptyGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  // Clear selected group if it doesn't match the new filter mode
  const handleFilterModeChange = (newMode: FilterMode) => {
    if (selectedGroup && newMode !== "all") {
      const selectedGroupData = groupsData.find((g) => g.name === selectedGroup);
      if (selectedGroupData && selectedGroupData.type !== newMode) {
        setSelectedGroup("");
      }
    }
    setFilterMode(newMode);
  };

  useEffect(() => {
    const accessGranted = sessionStorage.getItem("access_granted");
    setHasAccess(accessGranted === "true");
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const dailies = await fetchAllDailies();
        const organized = organizeDailiesByGroup(dailies);
        setGroups(organized);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    if (hasAccess) {
      loadData();
    }
  }, [hasAccess]);

  if (hasAccess === null) {
    return null;
  }

  if (!hasAccess) {
    return <AccessModal onAccessGranted={() => setHasAccess(true)} />;
  }

  // Get all groups from groupsData for the combobox
  const comboboxGroups = groupsData
    .filter((g) => filterMode === "all" || g.type === filterMode)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

  // Get all groups from groupsData and merge with fetched data
  const allGroups = groupsData
    .filter((g) => filterMode === "all" || g.type === filterMode)
    .filter((g) => !selectedGroup || g.name === selectedGroup)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

  const groupsWithData = new Set(groups.map((g) => g.groupName));

  const filteredGroupsWithData = groups
    .filter((g) => filterMode === "all" || g.groupType === filterMode)
    .filter((g) => !selectedGroup || g.groupName === selectedGroup);

  // Statistics
  const totalIdols = groups.reduce((sum, g) => sum + g.idols.length, 0);
  const pastCount = groups.reduce(
    (sum, g) => sum + g.idols.filter((i) => i.status === "past").length,
    0
  );
  const todayCount = groups.reduce(
    (sum, g) => sum + g.idols.filter((i) => i.status === "today").length,
    0
  );
  const upcomingCount = groups.reduce(
    (sum, g) => sum + g.idols.filter((i) => i.status === "upcoming").length,
    0
  );

  return (
    <div className="min-h-screen p-4">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dailies Overview</h1>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to dashboard
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-lg">Idols by Group</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-muted p-1 gap-1">
                    <button
                      onClick={() => handleFilterModeChange("all")}
                      className={`px-3 py-1 text-sm cursor-pointer transition-colors ${
                        filterMode === "all"
                          ? "bg-purple-400 text-white"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => handleFilterModeChange("boy-group")}
                      className={`px-3 py-1 text-sm cursor-pointer transition-colors ${
                        filterMode === "boy-group"
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      Boy Groups
                    </button>
                    <button
                      onClick={() => handleFilterModeChange("girl-group")}
                      className={`px-3 py-1 text-sm cursor-pointer transition-colors ${
                        filterMode === "girl-group"
                          ? "bg-pink-500 text-white"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      Girl Groups
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showEmptyGroups}
                      onChange={(e) => setShowEmptyGroups(e.target.checked)}
                    />
                    Show empty groups
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter by group:</span>
                <div className="w-64">
                  <Combobox
                    value={selectedGroup}
                    onValueChange={setSelectedGroup}
                    options={comboboxGroups}
                    placeholder="All groups"
                    emptyText="No group found."
                    searchPlaceholder="Search group..."
                  />
                </div>
                {selectedGroup && (
                  <button
                    onClick={() => setSelectedGroup("")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-muted">
                <div className="text-2xl font-bold">{totalIdols}</div>
                <div className="text-sm text-muted-foreground">Total Entries</div>
              </div>
              <div className="text-center p-3 bg-gray-100">
                <div className="text-2xl font-bold text-gray-700">{pastCount}</div>
                <div className="text-sm text-muted-foreground">Played</div>
              </div>
              <div className="text-center p-3 bg-purple-100">
                <div className="text-2xl font-bold text-purple-700">{todayCount}</div>
                <div className="text-sm text-muted-foreground">Today</div>
              </div>
              <div className="text-center p-3 bg-green-100">
                <div className="text-2xl font-bold text-green-700">{upcomingCount}</div>
                <div className="text-sm text-muted-foreground">Upcoming</div>
              </div>
            </div>

            {isLoading && (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            )}

            {error && (
              <p className="text-destructive text-center py-8">{error}</p>
            )}

            {!isLoading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showEmptyGroups
                  ? allGroups.map((g) => {
                      const groupData = filteredGroupsWithData.find(
                        (gd) => gd.groupName === g.name
                      );
                      if (groupData) {
                        return (
                          <GroupSection key={g.name} group={groupData} />
                        );
                      }
                      return (
                        <EmptyGroupSection
                          key={g.name}
                          groupName={g.name}
                          groupType={g.type as "boy-group" | "girl-group"}
                        />
                      );
                    })
                  : filteredGroupsWithData.map((group) => (
                      <GroupSection key={group.groupName} group={group} />
                    ))}

                {!showEmptyGroups && filteredGroupsWithData.length === 0 && (
                  <p className="text-muted-foreground text-center py-8 col-span-2">
                    No groups with dailies found.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300"></div>
                <span>Previously played</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 border border-purple-600"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300"></div>
                <span>Upcoming</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500"></div>
                <span>Boy group</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-pink-500"></div>
                <span>Girl group</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
