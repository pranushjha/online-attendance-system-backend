# Online Attendance System - Backend

Backend API for the **Online Attendance System**, built with Node.js, Express.js, MongoDB, Mongoose, and JWT authentication.

The backend provides authentication, user management, class management, student management, attendance tracking, dashboards, and reporting APIs.

---

## 🌐 Live Deployment

**Live Backend:**  
https://online-attendance-system-yctb.onrender.com

**Production API:**  
https://online-attendance-system-yctb.onrender.com/api

**Backend Repository:**  
https://github.com/pranushjha/online-attendance-system

**Frontend Repository:**  
https://github.com/pranushjha/online-attendence-system-frontend

---

## ✨ Features

- Admin authentication
- Teacher authentication
- JWT-based authentication
- Protected API routes
- Role-based authorization
- Teacher management
- Class management
- Student management
- Attendance management
- Attendance reports
- Dashboard statistics
- MongoDB database integration
- Mongoose data modeling
- CORS support
- Environment-based configuration

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Backend runtime |
| Express.js | REST API framework |
| MongoDB | Database |
| Mongoose | MongoDB ODM |
| JWT | Authentication |
| bcryptjs | Password hashing |
| dotenv | Environment variables |
| CORS | Cross-origin API access |

---

## 📁 Project Structure

```text
backend/
│
├── config/
│   └── database configuration
│
├── controllers/
│   ├── authentication
│   ├── attendance
│   ├── class
│   ├── student
│   └── teacher
│
├── middleware/
│   └── authMiddleware.js
│
├── models/
│   ├── teacher.js
│   ├── student.js
│   ├── class.js
│   └── attendance.js
│
├── routes/
│   ├── auth
│   ├── attendance
│   ├── class
│   ├── student
│   └── teacher
│
├── .env
├── package.json
├── server.js
└── README.md