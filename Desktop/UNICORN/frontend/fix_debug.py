content = open("components/dashboard/ActionableInsights.tsx", encoding="utf-8").read()

old = '  const mergedFixes = dedupeBuyerHeroPlaybookFixes(combined)'
new = '  const mergedFixes = dedupeBuyerHeroPlaybookFixes(combined)\n  if (typeof window !== "undefined") console.log("[AI] mergedFixes:", mergedFixes.length, "combined:", combined.length, "actionLayer fixes:", actionLayer?.fixes?.length)'

content = content.replace(old, new)
print("Done" if "[AI]" in content else "NOT FOUND")
open("components/dashboard/ActionableInsights.tsx", "w", encoding="utf-8").write(content)
