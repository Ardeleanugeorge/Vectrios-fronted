path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\dashboard\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = 'href="/pricing" className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition">'
new = 'href="/pricing?from=trial_expired" className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition">'

if old in c:
    c = c.replace(old, new)
    print("Button fixed")
else:
    print("NOT FOUND")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
