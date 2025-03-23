# JWT Authentication with Multi-Device Active Sessions and Token Rotation

## 🚀 Overview
This project implements JWT-based authentication with support for multiple active sessions across multiple devices. It also includes token rotation, automatic login after registration, and secure handling of access and refresh tokens.

## ✨ Features
- 🔐 **JWT Authentication** using Access and Refresh Tokens
- 📱 **Multiple Active Sessions** across multiple devices
- 🔄 **Token Rotation** (Old refresh token is cleared once a new one is issued)
- 🔄 **Auto Login After Registration**
- 🍪 **Secure Cookie Handling** (Refresh token stored in HTTP-only cookies)
- ❌ **Session Management** (Logout from the current device or all devices)

## 🛠️ Tech Stack
- **Node.js**
- **Express.js**
- **MongoDB & Mongoose**
- **jsonwebtoken (JWT)**
- **cookie-parser**

## 📌 Installation
```sh
# Clone the repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Install dependencies
npm install

# Create a .env file and add the required environment variables
cp .env.example .env

# Start the server
npm start



