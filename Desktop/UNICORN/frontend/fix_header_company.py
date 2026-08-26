path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\components\DashboardHeader.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    '''        const needsProfileRefresh = !local?.company_id
        if (!needsProfileRefresh) {
          loadSubscriptionForCompany(String(local.company_id))
          return
        }''',
    '''        // Enterprise fix: always verify company_id from server
        // localStorage is only used as optimistic UI, server is source of truth
        const needsProfileRefresh = true
        if (local?.company_id) {
          loadSubscriptionForCompany(String(local.company_id))
          // Continue to server refresh to verify
        }'''
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Done')
