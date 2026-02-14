# HMIS Setup Guide

## Complete Setup Checklist

Follow these steps in order to get your HMIS system up and running.

### ✅ Step 1: Install Dependencies

```bash
npm install
```

### ✅ Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose a name (e.g., "hmis-shelter")
4. Set a database password (save this!)
5. Select a region close to your shelter
6. Wait for the project to be created (~2 minutes)

### ✅ Step 3: Get Your API Credentials

1. In your Supabase project, go to **Settings** (gear icon in sidebar) > **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public key** (under "Project API keys")

### ✅ Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and paste your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### ✅ Step 5: Initialize Database Schema

1. In your Supabase project, go to **SQL Editor** (in the sidebar)
2. Click "New query"
3. Open the file `supabase-schema.sql` from this project
4. Copy **all** the SQL code and paste it into the Supabase SQL Editor
5. Click "Run" (or press CMD/CTRL + Enter)
6. Wait for all statements to execute (you should see "Success" messages)

### ✅ Step 6: Enable Realtime

1. In Supabase, go to **Database** > **Replication**
2. Find the `beds` table and toggle **Realtime** to ON
3. Find the `bed_assignments` table and toggle **Realtime** to ON
4. These enable live bed updates across all devices!

### ✅ Step 7: Create Your First Admin User

#### 7a. Create Auth User
1. In Supabase, go to **Authentication** > **Users**
2. Click **"Add user"** > **"Create new user"**
3. Enter your email and password
4. Click "Create user"
5. **Copy the user's UUID** (long string like `123e4567-e89b-12d3-a456-426614174000`)

#### 7b. Create Admin Profile
1. Go back to **SQL Editor** in Supabase
2. Run this query (replace values with your info):

```sql
INSERT INTO user_profiles (id, email, role, first_name, last_name)
VALUES (
  'paste-the-uuid-from-step-7a-here',
  'your.email@example.com',
  'admin',
  'Your First Name',
  'Your Last Name'
);
```

3. Click "Run"

### ✅ Step 8: Start the Development Server

```bash
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:5173/
```

### ✅ Step 9: Sign In

1. Open http://localhost:5173 in your browser
2. Use the email and password from Step 7a
3. You should see the dashboard!

## 🧪 Testing the System

### Test the Bed Board
1. Navigate to "Beds" in the navigation
2. You should see 8 sample beds (created by the schema)
3. All should show "Available" status

### Test Realtime Updates
1. Open the bed board in two browser windows side-by-side
2. In one window, assign a bed (future feature - currently shows placeholder)
3. Both windows should update automatically!

### Test Client Management
1. Navigate to "Clients"
2. Click the + button to add a client (placeholder for now)

## 🔧 Troubleshooting

### "Invalid API key" error
- Double-check your `.env` file has the correct Supabase URL and anon key
- Make sure there are no extra spaces or quotes
- Restart the dev server after changing `.env`

### "relation does not exist" errors
- The database schema wasn't run correctly
- Re-run the entire `supabase-schema.sql` file in SQL Editor
- Make sure all statements completed successfully

### Can't sign in
- Make sure you created both the auth user AND the user_profiles entry
- Check that the UUID in user_profiles matches the auth user's UUID exactly
- Try resetting the password in Supabase Auth dashboard

### Beds not showing on Bed Board
- Check that the seed data was inserted (last few lines of schema file)
- Run this query to check: `SELECT * FROM beds;`
- If empty, re-run just the INSERT statements from the schema

## 🎉 Next Steps

Once everything is working:

1. **Add More Beds**: Update the seed data in the schema or add via Settings (future)
2. **Create Staff Accounts**: Follow Step 7 but use `role = 'staff'` instead of `'admin'`
3. **Customize Agency Info**: Edit in Settings (future feature)
4. **Start Adding Clients**: Use the intake workflow (to be implemented)

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [HUD HMIS Data Standards](https://www.hudexchange.info/programs/hmis/hmis-data-and-technical-standards/)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)

---

**Need help?** Check the README.md or reach out to your technical support contact.
