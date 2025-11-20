# ⚡ QUICK START - Investor System

## 🚀 Run This First

```bash
# 1. Run database migration
python backend/add_investor_schema.py

# 2. Restart backend
python backend/app.py

# 3. Start frontend (if not running)
cd frontend && npm run dev
```

---

## 🎯 Test the Flow (5 Minutes)

### Step 1: Apply as Investor (2 min)
1. Login as any user → Go to `/` (feed)
2. See banner "Looking to invest in projects?"
3. Click "Become an Investor"
4. Choose "Free Tier" plan
5. Submit application

### Step 2: Approve as Admin (1 min)
1. Go to `/admin+validator`
2. Password: `Admin`
3. Click "Investor Requests" tab
4. Click "Approve" on your request

### Step 3: Request Intro (1 min)
1. Refresh page → banner disappears (you're investor now!)
2. Click any project
3. See "Request Intro" button
4. Send intro request

### Step 4: Accept & Chat (1 min)
1. Login as project owner (or use another account)
2. Go to `/intros`
3. Accept the intro request
4. Go to `/messages`
5. Start chatting!

---

## 📍 Key URLs

- `/investor-plans` - Apply for investor account
- `/admin+validator` - Approve requests (password: Admin)
- `/intros` - Manage intro requests
- `/messages` - Direct messages/chat

---

## 🔑 Key Features

✅ **3 User Roles**: Normal, Investor, Admin
✅ **Investor Application Flow**: Apply → Admin Approves → Get Access
✅ **Intro Requests**: Investors ping builders
✅ **Direct Messages**: Chat after intro accepted
✅ **Smart UI**: Buttons show/hide based on role
✅ **Admin Dashboard**: New "Investor Requests" tab

---

## 🎨 UI Components

| User Type | Sees CRM Banner? | Sees "Request Intro"? | Intros Tabs |
|-----------|------------------|----------------------|-------------|
| Normal    | ✅ Yes           | ❌ No                | Received only |
| Investor  | ❌ No            | ✅ Yes               | Sent + Received |
| Admin     | Varies           | ✅ Yes (if investor) | Sent + Received |

---

## 🐛 Troubleshooting

**"Request Intro" button not showing?**
- Make sure user's `is_investor = true` in database
- Check admin approved the request
- Refresh the page

**Messages not sending?**
- Check intro request was accepted first
- Verify both users have valid IDs
- Check browser console for errors

**Admin dashboard not loading investor requests?**
- Verify migration ran successfully
- Check `investor_requests` table exists
- Ensure token is valid in localStorage

---

## 📊 Database Quick Check

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('investor_requests', 'intro_requests', 'direct_messages');

-- Check investor requests
SELECT id, user_id, plan_type, status FROM investor_requests;

-- Make user an investor manually (testing)
UPDATE users SET is_investor = true WHERE email = 'test@example.com';
```

---

## ✅ Verification Checklist

- [ ] Migration completed without errors
- [ ] Backend server restarted
- [ ] Can access `/investor-plans`
- [ ] Can submit investor application
- [ ] Admin can see request in dashboard
- [ ] Approval updates `is_investor` flag
- [ ] "Request Intro" button appears for investors
- [ ] Intro request sends successfully
- [ ] Builder receives intro request
- [ ] Acceptance opens DM conversation
- [ ] Messages send and display correctly

---

## 🎉 That's It!

The system is ready. Follow the test flow above, and everything should work perfectly. If you encounter any issues, check the troubleshooting section or review the detailed documentation in `INVESTOR_ROLE_COMPLETE.md`.

**Happy Testing! 🚀**
