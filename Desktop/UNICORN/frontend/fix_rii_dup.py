file = r"components/dashboard/MonitoringLayer.tsx"
with open(file, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '            {typeof revenueDelta.delta_rii === "number" && revenueDelta.delta_rii !== 0 && (\n              <p className="text-xs text-gray-600 mt-1">\n                RII {revenueDelta.delta_rii > 0 ? `+${revenueDelta.delta_rii}` : revenueDelta.delta_rii} pts since last scan\n              </p>\n            )}',
    ''
)
print("Done")
with open(file, "w", encoding="utf-8") as f:
    f.write(content)
