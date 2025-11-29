# MERN Stack Implementation Guide

This document provides a step-by-step guide to building the requested MERN application.

## Phase 1: Project Initialization & Structure

1.  **Create Project Directory**
    -   Create a main folder (e.g., `mern-auth-app`).
    -   Inside it, create two sub-folders: `server` (Backend) and `client` (Frontend).

## Phase 2: Backend Development (Node.js + Express)

### 1. Setup Server Environment
-   Navigate to `server` folder.
-   Run `npm init -y` to create `package.json`.
-   Install dependencies:
    -   `express` (Framework)
    -   `mongoose` (MongoDB ODM) or `pg` (PostgreSQL)
    -   `dotenv` (Environment variables)
    -   `cors` (Cross-Origin Resource Sharing)
    -   `bcrypt` (Password hashing)
    -   `jsonwebtoken` (Authentication)
    -   `nodemailer` (Sending emails for OTP/Reset links)
    -   `nodemon` (Dev dependency for auto-restart)

### 2. Database Connection
-   Create a `.env` file for `PORT`, `MONGO_URI` (or `DB_URL`), `JWT_SECRET`, and Email credentials.
-   Create `config/db.js`:
    -   Write a function to connect to MongoDB/PostgreSQL using the connection string.
-   Create `server.js` (Entry point):
    -   Initialize Express app.
    -   Connect to DB.
    -   Setup Middleware (`express.json()`, `cors()`).
    -   Define basic route `/` to test server.
    -   Listen on `PORT`.

### 3. Define Models
-   Create `models/User.js`:
    -   Fields: `name`, `email` (unique), `phone`, `password` (hashed), `profileImage` (optional).
-   Create `models/OTP.js`:
    -   Fields: `email`, `otp`, `createdAt`.
    -   Add TTL (Time-To-Live) index to auto-delete after 5 minutes.

### 4. Implement API Routes & Controllers
Create `routes/authRoutes.js` and `controllers/authController.js`:

-   **Signup (`POST /api/auth/signup`)**
    -   Check if user exists.
    -   Hash password using `bcrypt`.
    -   Create User record.
    -   Generate OTP (4-6 digits).
    -   Save OTP to DB.
    -   Send OTP via Email/SMS.
    -   Return success message.

-   **Verify OTP (`POST /api/auth/verify-otp`)**
    -   Find OTP record by email.
    -   Validate OTP matches.
    -   If valid, verify user (if needed) or generate JWT token.
    -   Delete OTP record.
    -   Return JWT token + User data.

-   **Login (`POST /api/auth/login`)**
    -   Find user by email.
    -   Compare password using `bcrypt.compare()`.
    -   If valid, generate JWT.
    -   Return token.

-   **Forgot Password (`POST /api/auth/forgot-password`)**
    -   Find user by email.
    -   Generate OTP/Reset Link.
    -   Save to DB (or update User model with reset token).
    -   Send via Email.

-   **Reset Password (`POST /api/auth/reset-password`)**
    -   Validate OTP/Token.
    -   Hash new password.
    -   Update User password.
    -   Clear reset token/OTP.

Create `routes/userRoutes.js` and `controllers/userController.js`:

-   **Middleware (`middleware/authMiddleware.js`)**
    -   Verify JWT token from headers.
    -   Attach user to request object.

-   **Get Profile (`GET /api/user/profile`)**
    -   Use Middleware.
    -   Find user by ID (exclude password).
    -   Return user data.

-   **Update Profile (`PUT /api/user/profile`)**
    -   Use Middleware.
    -   Update allowed fields (name, phone, etc.).
    -   If password change, hash new password.
    -   Save and return updated user.

## Phase 3: Frontend Development (React + TailwindCSS)

### 1. Setup React App
-   Navigate to `client` folder.
-   Run `npx create-vite@latest .` (select React + JavaScript/TypeScript).
-   Install dependencies:
    -   `axios` (API requests)
    -   `react-router-dom` (Navigation)
    -   `react-hook-form` (Form handling - optional but recommended)
    -   `react-hot-toast` (Notifications)

### 2. Configure TailwindCSS
-   Install Tailwind: `npm install -D tailwindcss postcss autoprefixer`.
-   Init Tailwind: `npx tailwindcss init -p`.
-   Configure `tailwind.config.js` to scan your files.
-   Add directives to `index.css`.

### 3. Setup Project Structure
-   `src/components`: Reusable UI (Button, Input, Navbar, ProtectedRoute).
-   `src/pages`: Page components (Signup, Login, OTP, etc.).
-   `src/context`: AuthContext (manage user state/token).
-   `src/services`: API functions (axios instances).

### 4. Implement Pages (UI + Logic)

-   **Signup Page**
    -   Form: Name, Email, Phone, Password, Confirm Password.
    -   Validation: Check empty fields, email format, passwords match.
    -   Submit: Call `POST /api/auth/signup`.
    -   On Success: Redirect to OTP Page.

-   **OTP Verification Page**
    -   UI: 4-6 input boxes.
    -   Logic: Auto-focus next box on type.
    -   Timer: `useEffect` countdown (30-60s).
    -   Resend: Call API to resend OTP.
    -   Submit: Call `POST /api/auth/verify-otp`.
    -   On Success: Store Token (localStorage), Redirect to Profile/Dashboard.

-   **Login Page**
    -   Form: Email, Password.
    -   Feature: Eye icon to toggle password visibility.
    -   Link: "Login with OTP" (redirects to a flow similar to Forgot Password but for login).
    -   Submit: Call `POST /api/auth/login`.
    -   On Success: Store Token, Update Context, Redirect.

-   **Forgot & Reset Password Pages**
    -   **Forgot**: Input Email -> Submit -> Redirect to OTP/Reset UI.
    -   **Reset**: Input New Password, Confirm -> Submit -> Redirect to Login.

-   **Profile Page (Protected)**
    -   Use `ProtectedRoute` wrapper to check for Token.
    -   **View Mode**: Fetch data `GET /api/user/profile` on mount. Display Avatar, Info.
    -   **Edit Mode**: Toggle state. Show inputs.
    -   **Update**: Call `PUT /api/user/profile`. Update local state on success.

## Phase 4: Integration & Testing

1.  **Connect Frontend to Backend**
    -   Ensure Backend is running (e.g., port 5000).
    -   Ensure Frontend is running (e.g., port 5173).
    -   Setup Proxy in `vite.config.js` or use CORS in backend to allow frontend origin.

2.  **Test Flows**
    -   **Happy Path**: Signup -> OTP -> Login -> Profile -> Edit Profile.
    -   **Error Handling**: Try invalid emails, wrong passwords, expired OTPs. Ensure UI shows error messages (Toasts).
    -   **Security**: Check if protected routes redirect unauthenticated users.

## Phase 5: Final Polish

-   **Styling**: Ensure responsive design (Mobile/Desktop) using Tailwind classes.
-   **Loading States**: Add spinners/skeleton loaders during API calls.
-   **Cleanup**: Remove console logs, format code.
