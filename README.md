# HMIS Shelter Management System

A modern, mobile-first, and HUD-compliant Shelter Management System designed to streamline operations for homeless shelters. Built with performance, privacy, and ease of use in mind, this application empowers shelter staff to focus on what matters most: helping people.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css&logoColor=white)

## 🌟 Key Features

*   **Real-time Bed Board**: Live visualization of bed availability and occupancy. Instant updates across all devices ensure staff always have the latest data.
*   **Comprehensive Client Management**:
    *   Detailed client profiles with demographic and contact information.
    *   History tracking for shelter stays and services.
    *   File management for essential documents.
*   **Efficient Intake & Processing**: Streamlined workflows for checking clients in and out, managing reservations, and assigning beds.
*   **Role-Based Access Control**: Secure environment with distinct roles for Admins, Staff, and Volunteers to ensure data privacy and appropriate access levels.
*   **Modern & Responsive UI**:
    *   **Mobile-First Design**: Fully optimized for tablets and smartphones, allowing staff to work from anywhere in the facility.
    *   **Polished Aesthetics**: Features a clean, modern interface with fluid animations and a focus on usability.
*   **Reporting & Analytics**: Built-in reporting tools to track occupancy rates, demographics, and other key performance indicators.
*   **HUD FY 2026 Compliance**: Designed to meet the latest HUD HMIS Data Standards (Sex vs Gender Identity, etc.).

## 🛠️ Technology Stack

*   **Frontend**: [React 18](https://reactjs.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL)
*   **State Management**: React Context & Hooks
*   **Routing**: React Router DOM
*   **Icons**: Lucide React

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)
*   A [Supabase](https://supabase.com/) account (Free tier works great)

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd hmis-shelter-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add your Supabase credentials. You can find these in your Supabase project settings under API.

    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```

4.  **Database Setup**
    *   Go to the SQL Editor in your Supabase dashboard.
    *   Copy the contents of `supabase-schema.sql` from this repository.
    *   Paste and run the SQL script to create the necessary tables, policies, and initial data.
    *   **Enable Realtime**: Go to *Database > Replication* in Supabase and enable Realtime for the `beds` and `bed_assignments` tables.

5.  **Create Admin User**
    *   Sign up a new user in the Authentication tab of your Supabase dashboard.
    *   Copy the `User UID` of the newly created user.
    *   Run the following SQL query in the Supabase SQL Editor to assign the admin role:
        ```sql
        INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
        VALUES ('<USER_UID>', 'admin@example.com', 'Admin', 'User', 'admin');
        ```

6.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## 📁 Project Structure

```
hmis/
├── src/
│   ├── components/       # Reusable UI components (Modals, Cards, Forms)
│   ├── context/          # React Context (Auth, Theme, etc.)
│   ├── hooks/            # Custom Hooks (useAuth, useDashboardActivity, etc.)
│   ├── lib/              # Utility functions and Supabase client
│   ├── pages/            # Main application pages
│   │   ├── Dashboard.jsx
│   │   ├── BedBoard.jsx
│   │   ├── ClientList.jsx
│   │   ├── ClientProfile.jsx
│   │   ├── Reports.jsx
│   │   ├── Settings.jsx
│   │   └── ...
│   ├── services/         # API service layers
│   ├── App.jsx           # Main App component & Routing
│   └── main.jsx          # Entry point
├── supabase-schema.sql   # Database schema definitions
├── tailwind.config.js    # Tailwind CSS configuration
└── vite.config.js        # Vite configuration
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
