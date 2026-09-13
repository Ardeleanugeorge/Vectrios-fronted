file = r"components/dashboard/RevenueTrajectorySimulation.tsx"
with open(file, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "      .then(r => r.ok ? r.json() : null)\n      .then(d => { if (d) setData(d) })\n      .catch(() => {})\n      .finally(() => setLoading(false))",
    "      .then(r => (r.ok && r.status !== 404) ? r.json() : null)\n      .then(d => { if (d) setData(d) })\n      .catch(() => {})\n      .finally(() => setLoading(false))"
)
print("Done")

with open(file, "w", encoding="utf-8") as f:
    f.write(content)
