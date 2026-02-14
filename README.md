# HMIS Shelter Management System

A mobile-first, FY 2026 HUD HMIS Data Standards compliant web application for small-to-medium nonprofit homeless shelters.

## 🎯 Project Mission

Reduce administrative burden on front-line shelter staff through an intuitive, mobile-first interface that allows intakes and check-ins directly on the floor, while maintaining strict HUD compliance and privacy standards.

## ✨ Key Features

- **Real-time Bed Board** - Live updates across all devices when beds are assigned
- **FY 2026 HUD Compliant** - Updated demographic fields (Sex vs Gender Identity)
- **Mobile-First Design** - Optimized for tablets and phones used in the field
- **Privacy-Focused** - Encryption, audit logs, and role-based access control
- **Trauma-Informed** - "Client doesn't know" and "Client prefers not to answer" options

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Deployment**: Github Pages (Frontend) + Supabase (Database)

## 📋 Prerequisites

- Node.js 18+ and npm
- A free Supabase account ([sign up here](https://supabase.com))
- Basic understanding of React and SQL

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from Settings > API
3. Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Initialize Database

1. Open your Supabase project's SQL Editor
2. Copy the entire contents of `supabase-schema.sql`
3. Paste and run it in the SQL Editor
4. Enable Realtime for `beds` and `bed_assignments` tables in Database > Replication

### 4. Create Your First User

1. In Supabase Dashboard, go to Authentication > Users
2. Click "Add User" and create an account
3. Copy the user's UUID
4. Run this SQL query to make them an admin:

```sql
INSERT INTO user_profiles (id, email, role, first_name, last_name)
VALUES (
  'paste-user-uuid-here',
  'your.email@example.com',
  'admin',
  'Your',
  'Name'
);
```

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with your credentials!

## 📱 MVP Features (Current)

- ✅ Real-time Bed Board with occupancy tracking
- ✅ Client Search & Basic Intake (Universal Data Elements)
- ✅ Dashboard with capacity metrics and alerts
- ✅ Role-based authentication (Admin, Staff, Volunteer)
- ✅ Mobile-responsive UI with bottom navigation
- ✅ FY 2026 compliant demographic collection

## 🗓️ Planned Features (Phase 2)

- [ ] Household Management (family grouping)
- [ ] HUD Exit Assessments
- [ ] Digital ROI/Consent signatures
- [ ] CSV exports for HUD reporting
- [ ] Service Entry & Case Notes
- [ ] Enrollment workflow with entry assessments

## 🗂️ Project Structure

```
hmis/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Layout.jsx
│   │   ├── BedCard.jsx
│   │   └── LoadingSpinner.jsx
│   ├── pages/            # Main application pages
│   │   ├── Dashboard.jsx
│   │   ├── BedBoard.jsx
│   │   ├── ClientList.jsx
│   │   ├── ClientProfile.jsx
│   │   ├── Login.jsx
│   │   └── Settings.jsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.js
│   │   └── useRealtimeBeds.js
│   ├── lib/              # Utilities and constants
│   │   ├── supabaseClient.js
│   │   └── hudConstants.js
│   ├── App.jsx           # Root component with routing
│   ├── main.jsx          # Application entry point
│   └── index.css         # Global styles
├── supabase-schema.sql   # Database schema
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🔐 Security & Compliance

- **Encryption**: SSN and PII are encrypted at rest (AES-256)
- **Audit Logging**: Every view/edit action is logged with timestamp and user ID
- **Row-Level Security**: Supabase RLS policies enforce role-based access
- **Privacy Flags**: Clients fleeing DV can have records hidden from non-authorized staff

## 🎨 Design Philosophy

- **Touch-friendly**: All buttons meet 44x44px minimum touch target
- **High contrast**: WCAG 2.1 AA compliant color ratios
- **Large text**: 16px base font prevents iOS zoom on input focus
- **Progressive disclosure**: Forms broken into manageable steps

## 📊 HUD FY 2026 Compliance Notes

This system implements the October 2025 HUD HMIS Data Standards updates:

- **Sex** field replaces the legacy "Gender" field
- **Gender Identity** is now a separate, optional field
- Updated dropdown values for living situations and destinations
- "Data not collected" option for all non-mandatory fields

## 🤝 Contributing

This is a reference implementation for nonprofit shelters. Feel free to fork and adapt to your organization's needs.

## 📄 License

MIT License - Free to use and modify

## 💡 Support

For questions about HUD HMIS standards, consult the [HUD Exchange](https://www.hudexchange.info/programs/hmis/).

For technical issues, please open an issue on GitHub.

---

**Built with ❤️ for shelter staff who work tirelessly to support those experiencing homelessness.**
