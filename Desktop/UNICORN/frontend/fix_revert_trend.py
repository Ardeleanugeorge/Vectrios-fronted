c = open("components/dashboard/MonitoringLayer.tsx", encoding="utf-8").read(); o = c

broken = '''                  {/* A direction needs at least two comparable readings. Saying
                      "improving" on the strength of one would describe a trend
                      that has not happened yet. */}
                  {(riiTrend?.entries?.length ?? 0) < 2
                    ? "Baseline established — direction follows the next scan"
                    : monitoringStatus.trend_direction === "improving"'''

fixed = '''                  {monitoringStatus.trend_direction === "improving"'''

assert broken in c, "broken block not found"
c = c.replace(broken, fixed)

assert c != o
open("components/dashboard/MonitoringLayer.tsx", "w", encoding="utf-8").write(c)
print("Reverted")
