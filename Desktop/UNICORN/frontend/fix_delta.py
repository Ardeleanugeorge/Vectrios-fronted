file = r"components/dashboard/MonitoringLayer.tsx"
with open(file, "r", encoding="utf-8") as f:
    content = f.read()

old = '''              {revenueDelta.delta_monthly_loss > 0
                ? `+$${Math.round(Math.abs(revenueDelta.delta_monthly_loss)).toLocaleString()} pts structural deterioration`
                : revenueDelta.delta_monthly_loss < 0
                ? `↓ ${Math.round(Math.abs(revenueDelta.delta_monthly_loss)).toLocaleString()} pts structural improvement`
                : "No change vs last scan"}'''

new = '''              {typeof revenueDelta.delta_rii === "number" && revenueDelta.delta_rii !== 0
                ? revenueDelta.delta_rii > 0
                  ? `RII +${revenueDelta.delta_rii.toFixed(1)} pts — structural deterioration`
                  : `RII ${revenueDelta.delta_rii.toFixed(1)} pts — structural improvement`
                : "No change vs last scan"}'''

if old in content:
    content = content.replace(old, new, 1)
    print("Replaced OK")
else:
    print("NOT FOUND")

with open(file, "w", encoding="utf-8") as f:
    f.write(content)
