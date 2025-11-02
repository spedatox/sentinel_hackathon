# 🚀 5-Minute Multi-User Setup

## What You're Getting
✅ **Multi-user safe database** (no race conditions)  
✅ **Automatic fallback** (works with or without Supabase)  
✅ **Zero breaking changes** (all existing code works)  
✅ **Production ready** (500MB free storage)  

---

## Setup (Choose One)

### Option A: Full Setup (5 minutes)
**For production with multiple users:**

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com) → Sign up/in
   - Click "New Project"
   - Name: `sentinel-ai`, Region: closest to you
   - Wait 2 minutes for provisioning

2. **Get API Keys**
   - Dashboard → Settings → API
   - Copy:
     - Project URL
     - `anon` public key  
     - `service_role` secret key

3. **Add to `.env.local`**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   
   # Keep existing
   OPENAI_API_KEY=sk-...
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   ```

4. **Create Schema**
   - Dashboard → SQL Editor
   - Copy `supabase-schema.sql` contents
   - Paste → Run
   - Verify 8 tables created

5. **Test**
   ```bash
   npm install dotenv
   node test-supabase.mjs
   # Should see: ✅ All tests passed!
   ```

6. **Start**
   ```bash
   npm run dev
   # Check console for: ✅ Created pending tx in Supabase
   ```

---

### Option B: Keep File Storage (30 seconds)
**For development/single-user:**

1. **Do nothing!**
   - App automatically uses `./sentinel.db` file storage
   - All features work exactly the same
   - Just not safe for multiple concurrent users

2. **Console will show:**
   ```
   ⚠️ Supabase not configured. Using fallback file storage.
   ```

3. **Upgrade later:**
   - Follow Option A when ready for production
   - No code changes needed!

---

## Verify It Works

### Check Console Logs
```bash
npm run dev
```

**With Supabase configured:**
```
✅ Created pending tx in Supabase: abc-123-def
```

**Without Supabase (fallback):**
```
⚠️ Supabase not configured. Using fallback file storage.
⚠️ Created pending tx in file storage: abc-123-def
```

### Test Multi-User Safety
```bash
# Terminal 1: Create transaction for User A
curl -X POST http://localhost:3000/api/guardian/prepare \
  -H "Content-Type: application/json" \
  -d '{"account": "GDSR...A", "xdr": "...", "riskScore": 0.8}'

# Terminal 2: Create transaction for User B (simultaneously)
curl -X POST http://localhost:3000/api/guardian/prepare \
  -H "Content-Type: application/json" \
  -d '{"account": "GDSR...B", "xdr": "...", "riskScore": 0.8}'

# With Supabase: ✅ Both succeed, no conflicts
# With file storage: ⚠️ Race condition possible
```

---

## What Changed?

### Code Changes
- ✅ `src/lib/storage.ts` - Now uses Supabase with file fallback
- ✅ All functions are now `async` (use `await`)
- ✅ No other code changes needed (already using `await`)

### New Files
- ✅ `supabase-schema.sql` - Database schema
- ✅ `src/lib/supabase.ts` - Supabase client
- ✅ `test-supabase.mjs` - Connection test
- ✅ Docs: Migration guides

### Breaking Changes
**NONE!** App works exactly the same with or without Supabase.

---

## Troubleshooting

### "Supabase not configured"
✅ **Normal** - App is using file storage fallback  
🔧 **To fix**: Add env vars to `.env.local`

### "relation does not exist"
🔧 **Fix**: Run `supabase-schema.sql` in SQL Editor

### "row level security policy violation"
🔧 **Fix**: Use `SUPABASE_SERVICE_ROLE_KEY` (not anon key)

### Tests still using file storage
✅ **Check**: `.env.local` exists (not just `.env.example`)  
✅ **Check**: Env vars are set correctly  
✅ **Restart**: `npm run dev`

---

## Summary

### Without Supabase
```
Storage: ./sentinel.db (file)
Users: Single user only
Safety: ⚠️ Race conditions possible
Setup: ✅ Zero config needed
```

### With Supabase
```
Storage: PostgreSQL (cloud)
Users: Unlimited, concurrent
Safety: ✅ ACID transactions, RLS
Setup: 🕐 5 minutes one-time
```

---

## Next Steps

**Development:**
- ✅ Start coding immediately (uses file storage)
- ✅ Add Supabase later when ready

**Production:**
- ✅ Set up Supabase first (5 minutes)
- ✅ Deploy with env vars configured
- ✅ Monitor in Supabase dashboard

---

**Questions?** See:
- `SUPABASE_MIGRATION_GUIDE.md` - Full guide
- `MULTI_USER_MIGRATION_COMPLETE.md` - Technical details
- `SENTINEL_COMPLETE_GUIDE.md` - Overall system docs

**Ready to go!** 🚀
