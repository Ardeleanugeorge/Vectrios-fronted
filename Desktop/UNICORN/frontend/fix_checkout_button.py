path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\dashboard\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = '''              <a href="/pricing?from=trial_expired" className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition">
                Upgrade to Scale &mdash; $299/mo &rarr;
              </a>'''

new = '''              <button
                onClick={async () => {
                  const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
                  const companyId = localStorage.getItem("company_id") || sessionStorage.getItem("company_id")
                  if (!token || !companyId) { window.location.href = "/login"; return; }
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/create-checkout-session`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ company_id: companyId, billing_cycle: "monthly" })
                    })
                    const data = await res.json()
                    if (data?.checkout_url) { window.location.href = data.checkout_url; }
                    else { window.location.href = "/pricing"; }
                  } catch { window.location.href = "/pricing"; }
                }}
                className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition"
              >
                Upgrade to Scale &mdash; $299/mo &rarr;
              </button>'''

if old in c:
    c = c.replace(old, new)
    print("Done")
else:
    print("NOT FOUND")
    idx = c.find("pricing?from=trial_expired")
    print(repr(c[idx-50:idx+100]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
