path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\dashboard\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: conditie mai simpla
old1 = 'const isTrialExpired = (currentPlan === null || subscriptionStatus === "cancelled") && !subscriptionLoading && monitoringStatus?.source !== undefined'
new1 = 'const isTrialExpired = (currentPlan === null || currentPlan === undefined) && !subscriptionLoading'

if old1 in c:
    c = c.replace(old1, new1)
    print("Condition fixed")
else:
    print("Condition NOT FOUND")

# Fix 2: buton direct la checkout in loc de /pricing
old2 = '              <a href="/pricing" className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition">\n                Upgrade to Scale \u00e2\u20ac\u201d $299/mo \u00e2\u20ac\u00a0\u00e2\u2020\u2019\n              </a>'
new2 = '              <a href="/pricing?from=trial_expired&focus=upgrade" className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition">\n                Upgrade to Scale &mdash; $299/mo &rarr;\n              </a>'

if old2 in c:
    c = c.replace(old2, new2)
    print("Button fixed")
else:
    print("Button NOT FOUND - trying alternative")
    # Try direct search
    idx = c.find('href="/pricing"')
    if idx > 0:
        print(repr(c[idx:idx+150]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
