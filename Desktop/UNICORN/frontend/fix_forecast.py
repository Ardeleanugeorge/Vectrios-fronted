file = r"components/dashboard/MonitoringLayer.tsx"
with open(file, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "      .then(r => r.ok ? r.json() : null)\n      .then(data => { if (data) setForecast(data) })\n      .catch(() => {})\n      .finally(() => setForecastFetchDone(true))",
    "      .then(r => (r.ok && r.status !== 404) ? r.json() : null)\n      .then(data => { if (data) setForecast(data) })\n      .catch(() => {})\n      .finally(() => setForecastFetchDone(true))"
)

print(f"Done")

with open(file, "w", encoding="utf-8") as f:
    f.write(content)
