path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\login\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = '''      // Existing paying / trial customer ? dashboard first (skip resume scan + scan-results nudge)
      if (hasActivePlan) {
        router.push("/dashboard")
        return
      }'''

new = '''      // Existing paying / trial customer ? dashboard first (skip resume scan + scan-results nudge)
      // Also send trial-expired users to dashboard (they see upgrade banner there)
      if (hasActivePlan || companyIdForSub) {
        router.push("/dashboard")
        return
      }'''

if old in c:
    c = c.replace(old, new)
    print("Done")
else:
    print("NOT FOUND")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
