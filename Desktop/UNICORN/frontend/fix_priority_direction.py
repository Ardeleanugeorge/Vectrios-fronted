p = "app/scan-results/page.tsx"
c = open(p, encoding="utf-8").read(); o = c

old = '''/** 0'100 score ? plain-English impact tier (matches example bands: ~20 / ~38 / ~59) */
function metricImpactLabel(v: number): string {
  if (v >= 59) return "High structural priority"
  if (v >= 34) return "Medium structural priority"
  return "Lower structural priority"
}'''

new = '''/**
 * How urgently a dimension needs attention.
 *
 * On these four dimensions a higher score is a stronger result, so the ones
 * that need work are the low ones. Reading the bands the other way marked a
 * company's strongest dimension as its most urgent, and set the page against
 * the primary signal, which the backend derives from the weakest score.
 */
function metricImpactLabel(v: number): string {
  if (v < 40) return "High structural priority"
  if (v < 60) return "Medium structural priority"
  return "Lower structural priority"
}'''

assert old in c, "impact label not found"
c = c.replace(old, new)

assert c != o
open(p, "w", encoding="utf-8").write(c)
print("Priority follows the weak scores, as the backend does")
