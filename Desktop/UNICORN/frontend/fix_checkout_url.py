path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\dashboard\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    'if (data?.checkout_url) { window.location.href = data.checkout_url; }',
    'if (data?.checkout_url || data?.url) { window.location.href = data.checkout_url || data.url; }'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Done")
