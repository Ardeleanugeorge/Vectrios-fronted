path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\upgrade\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Inlocuim upgrade direct cu Stripe Checkout
old_block = '''      // Paid Scale in DB (monthly/annual) \u00e2\u20ac\u201d replaces trial; persisted for GET /subscription + header cache.
      const upRes = await apiFetch(`/subscription/${cid}/upgrade-scale`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billing_cycle: billing }),
      })
      if (!upRes.ok) {
        const err = await upRes.json().catch(() => ({}))
        const msg = typeof err?.detail === 'string' ? err.detail : Array.isArray(err?.detail) ? err.detail.map((x: { msg?: string }) => x?.msg).filter(Boolean).join(' ') : 'Upgrade failed. Please try again.'
        alert(msg || 'Upgrade failed. Please try again.')
        return
      }'''

new_block = '''      // Redirect to Stripe Checkout
      const checkoutRes = await apiFetch(`/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company_id: cid, billing_cycle: billing }),
      })
      if (!checkoutRes.ok) {
        const err = await checkoutRes.json().catch(() => ({}))
        alert(err?.detail || 'Could not start checkout. Please try again.')
        return
      }
      const { url } = await checkoutRes.json()
      if (url) {
        window.location.href = url
        return
      }'''

if old_block in c:
    c = c.replace(old_block, new_block)
    print('Fixed - Stripe Checkout redirect')
else:
    print('Block not found - checking...')
    idx = c.find('upgrade-scale')
    print(f'upgrade-scale found at index: {idx}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
