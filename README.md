# Online Attendance System - Backend

Backend API for the **Online Attendance System**, built with Node.js, Express.js, MongoDB, Mongoose, and JWT authentication.

## 🚀 Live Deployment

**Live Backend API:**  
https://online-attendance-system-yctb.onrender.com

**Production API Base URL:**  
https://online-attendance-system-yctb.onrender.com/api

**Deployment Platform:** Render

## Features

- Admin and teacher authentication
- JWT-based authentication
- Role-based access control
- Protected API routes
- Teacher management
- Class management
- Student management
- Attendance management
- Attendance history
- Attendance reports
- Dashboard statistics
- MongoDB database integration
- CORS support
- Environment-based configuration

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Backend web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB object modeling
- **JSON Web Token (JWT)** - Authentication
- **bcryptjs** - Password hashing
- **dotenv** - Environment configuration
- **CORS** - Cross-origin resource sharing
- **Nodemon** - Development server

## Project Structure

```text
backend/
├── config/
├── controllers/
├── middleware/
├── models/
│   ├── Admin.js
│   ├── Attendance.js
│   ├── Class.js
│   ├── Student.js
│   └── teacher.js
├── routes/
├── utils/
├── server.js
├── package.json
├── package-lock.json
├── .env.example
└── README.md