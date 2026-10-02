c = open("components/dashboard/MonitoringLayer.tsx", encoding="utf-8").read(); o = c

old = '''                  {monitoringStatus.trend_direction === "improving"
                    ? "Improving across recent scans"
                    : monitoringStatus.trend_direction === "escalating"
                    ? "Escalating across recent scans"
                    : "No clear direction across recent scans"}'''

new = '''                  {/* A direction needs at least two comparable readings. Saying
                      "improving" on the strength of one would describe a trend
                      that has not happened yet. */}
                  {(riiTrend?.entries?.length ?? 0) < 2
                    ? "Baseline established — direction follows the next scan"
                    : monitoringStatus.trend_direction === "improving"
                    ? "Improving across recent scans"
                    : monitoringStatus.trend_direction === "escalating"
                    ? "Escalating across recent scans"
                    : "No clear direction across recent scans"}'''

assert old in c, "trend line not found"
c = c.replace(old, new)

assert c != o
open("components/dashboard/MonitoringLayer.tsx", "w", encoding="utf-8").write(c)
print("Trend text waits for a second reading")
