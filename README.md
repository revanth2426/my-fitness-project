# Gym Management System

A full-stack web application for managing gym members, memberships, trainers, and attendance.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
    - [1. Backend Setup (Spring Boot)](#1-backend-setup-spring-boot)
    - [2. Frontend Setup (React, Vite, TailwindCSS)](#2-frontend-setup-react-vite-tailwindcss)
- [Database Setup](#database-setup)
- [Deployment Guide](#deployment-guide)
    - [Backend Deployment (Render)](#backend-deployment-render)
    - [Frontend Deployment (Netlify)](#frontend-deployment-netlify)
- [Admin Credentials](#admin-credentials)

## Features
- User Management (CRUD for gym members: name, age, gender, contact, membership status, joining date)
- Attendance System (Check-in via UserID manual entry)
- Membership Plans (CRUD for plans: name, price, duration, features)
- Trainer Management (CRUD for trainers: name, experience, specialization, availability)
- Dashboard (Admin view: active members, expiring memberships, total trainers, daily attendance chart, plan distribution chart, user search/filter)
- Admin Login/Authentication (JWT-based)
- Responsive UI

## Tech Stack
- **Frontend:** Vite, React, TypeScript, TailwindCSS, Axios, React Router DOM, Recharts, html5-qrcode (for potential future QR scanning)
- **Backend:** Java 17, Spring Boot, Spring Data JPA, MySQL Connector, Spring Security (JWT), Lombok, Auth0 Java-JWT
- **Database:** MySQL (Cloud-hosted: db4free.net or Planetscale, or local during development)
- **Deployment:** Netlify (Frontend), Render (Backend)

## Prerequisites
- Java 17+ JDK installed (e.g., OpenJDK, Oracle JDK)
- Maven installed
- Node.js (LTS version) and npm installed
- MySQL Server (local or cloud)
- Git (optional, but recommended for version control)
- Postman or Insomnia (for testing backend APIs)
- VS Code (recommended IDE)

## Local Development Setup

### 1. Backend Setup (Spring Boot)
1.  **Clone the repository:**
    ```bash
    git clone <your-backend-repo-url>
    cd gym-management-system
    ```
    (If not using Git, navigate to your `gym-management-system` folder)

2.  **Database Configuration:**
    * Ensure a MySQL server is running (e.g., via XAMPP/WAMP/MAMP, Docker, or direct install).
    * Create a database named `gym_db`:
        ```sql
        CREATE DATABASE gym_db;
        ```
    * Update `src/main/resources/application.properties` with your MySQL credentials:
        ```properties
        spring.datasource.url=jdbc:mysql://localhost:3306/gym_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
        spring.datasource.username=root
        spring.datasource.password=your_mysql_password
        spring.jpa.hibernate.ddl-auto=update
        spring.jpa.show-sql=true
        spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
        server.port=8088
        application.security.jwt.secret-key=aVeryStrongRandomSecretKeyOfAtLeast32CharactersForProduction
        application.security.jwt.expiration-in-ms=3600000
        ```
        **Note:** Replace `your_mysql_password` and generate a strong `application.security.jwt.secret-key`.

3.  **Build and Run Backend:**
    ```bash
    cd gym-management-system
    mvn clean install -DskipTests
    mvn spring-boot:run
    ```
    The backend should start on `http://localhost:8088`.

### 2. Frontend Setup (React, Vite, TailwindCSS)
1.  **Navigate to the project root (parent of `gym-management-system`):**
    ```bash
    cd D:\Gym-Project\Project\ # or wherever your main project folder is
    ```
2.  **Clone the frontend repository / navigate to it:**
    ```bash
    git clone <your-frontend-repo-url>
    cd gym-frontend
    ```
    (If not using Git, navigate to your `gym-frontend` folder)

3.  **Install Node dependencies:**
    ```bash
    npm install
    ```
    **Important:** If you encounter `ERESOLVE` errors during `npm install`, try `npm install --legacy-peer-deps` or ensure your `react` and `react-dom` versions are compatible with `html5-qrcode` and `recharts` (current versions provided in `package.json`).

4.  **Configure TailwindCSS:**
    * Ensure `tailwind.config.js` in the project root has:
        ```javascript
        // tailwind.config.js
        /** @type {import('tailwindcss').Config} */
        export default {
          content: [
            "./index.html",
            "./src/**/*.{js,ts,jsx,tsx}",
          ],
          theme: {
            extend: {},
          },
          plugins: [],
        }
        ```
    * Ensure `postcss.config.js` in the project root has:
        ```javascript
        // postcss.config.js
        export default {
          plugins: {
            tailwindcss: {},
            autoprefixer: {},
          },
        }
        ```
    * Ensure `src/index.css` has only:
        ```css
        @tailwind base;
        @tailwind components;
        @tailwind utilities;
        ```

5.  **Set up Frontend Environment Variable:**
    * Create a file named `.env.development` in your `gym-frontend` project root.
    * Add your backend API URL:
        ```env
        VITE_API_BASE_URL=http://localhost:8088/api
        ```

6.  **Run Frontend Development Server:**
    ```bash
    npm run dev
    ```
    The frontend should start on `http://localhost:5173/`.

## Database Setup
The backend uses `spring.jpa.hibernate.ddl-auto=update` for development, which automatically creates/updates tables.
Initial admin user creation:
* Once the backend is running, use Postman/Insomnia to register an admin user:
    * `POST` to `http://localhost:8088/api/auth/register-admin`
    * Body (JSON): `{"username": "admin", "password": "password123"}`

## Deployment Guide

### Backend Deployment (Render)
1.  **Create a Git Repository:** Push your `gym-management-system` project to a Git provider (GitHub, GitLab, Bitbucket).
2.  **Sign up/Login to Render.com.**
3.  **Create a New Web Service:** Connect your Git repository.
4.  **Configuration:**
    * **Build Command:** `mvn clean package -DskipTests`
    * **Start Command:** `java -jar target/<your-jar-name>.jar` (e.g., `java -jar target/gym-management-system-0.0.1-SNAPSHOT.jar`)
    * **Environment Variables:** Add your database credentials (from your cloud MySQL host) and JWT secret key:
        * `SPRING_DATASOURCE_URL=jdbc:mysql://[YOUR_DB_HOST]:3306/[YOUR_DB_NAME]?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC`
        * `SPRING_DATASOURCE_USERNAME=[YOUR_DB_USERNAME]`
        * `SPRING_DATASOURCE_PASSWORD=[YOUR_DB_PASSWORD]`
        * `APPLICATION_SECURITY_JWT_SECRET_KEY=your_strong_production_secret_key`
        * `APPLICATION_SECURITY_JWT_EXPIRATION_IN_MS=3600000`
    * Select a plan (Free tier might be available for basic testing).
5.  **Deploy.**

### Frontend Deployment (Netlify)
1.  **Create a Git Repository:** Push your `gym-frontend` project to a Git provider.
2.  **Sign up/Login to Netlify.com.**
3.  **Add New Site:** Select "Import an existing project" and connect your Git repository.
4.  **Build Settings:**
    * **Build command:** `npm run build`
    * **Publish directory:** `dist`
5.  **Environment Variables:** Add your deployed backend API URL:
    * `VITE_API_BASE_URL=https://[YOUR_RENDER_BACKEND_URL]/api` (Replace with your actual Render backend URL)
6.  **Deploy site.**

## Admin Credentials
* **Username:** `admin`
* **Password:** `password123`
*(Recommended to register a new, stronger password via the API once deployed.)*