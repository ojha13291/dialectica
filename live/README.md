# Dialectica - A Platform for Structured Debates

Dialectica is a real-time web application that facilitates structured debates and discussions. It provides a platform for users to engage in meaningful conversations with moderated debate formats.

## Features

- **User Authentication**: Secure registration and login system
- **Admin Dashboard**: Comprehensive admin controls including user management
- **Debate Rooms**: Real-time debate environments with moderator controls
- **User Profiles**: Customizable user profiles with statistics
- **Real-time Communication**: Powered by Socket.io for instant messaging
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB
- **Frontend**: HTML, CSS, JavaScript with Bootstrap
- **Real-time Communication**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)

## Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/dialectica.git
   cd dialectica
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000
   ```

4. Start the application
   ```
   npm start
   ```

5. For development with auto-restart:
   ```
   npm run dev
   ```

## Deployment

This application can be deployed on various platforms:

- **Render**: Free tier with automatic deployments from GitHub
- **Railway**: Simple deployment with $5 free credit per month
- **Fly.io**: Free tier with 3 shared-cpu-1x 256mb VMs

For the database, MongoDB Atlas provides a free tier that works well with this application.

## License

Boost Software License - Version 1.0 - August 17th, 2003
