path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\login\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = '''            hasActivePlan =
              sub?.has_full_access === true ||
              (!!plan &&
                (sub?.has_active_subscription === true ||
                  sub?.is_trial_active === true))'''

new = '''            hasActivePlan =
              sub?.has_full_access === true ||
              (!!plan &&
                (sub?.has_active_subscription === true ||
                  sub?.is_trial_active === true)) ||
              (!!companyIdForSub && sub !== null)'''

if old in c:
    c = c.replace(old, new)
    print("Done")
else:
    print("NOT FOUND")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
