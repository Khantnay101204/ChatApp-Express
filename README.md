# ChatApp-Express

This is a chat application built with Express.js that uses WebSockets for real-time messaging and a MongoDB database for storage.

## Features

- **User Authentication**: The application includes routes for user sign up and login. User passwords are encrypted using bcrypt.
- **Message Management**: Messages are encrypted and can be created, retrieved, and edited. The application uses `encryptMsg` and `decryptMsg` utilities for handling message encryption.
- **Real-time Communication**: The application utilizes `socket.io` to provide real-time messaging functionality. Users can send and edit messages in real-time.
- **Database**: The application connects to a MongoDB database using Mongoose.

## Installation

To run this project locally, follow these steps:

1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Start the server using `npm start`. This command uses `nodemon` to automatically restart the server on file changes.

## API Endpoints

The API routes are prefixed with `/api/v1/`.

### Users

- `POST /api/v1/users/signup`: Creates a new user.
- `POST /api/v1/users/login`: Logs in a user.

### Messages

- `POST /api/v1/messages`: Creates a new message. Requires authentication.
- `GET /api/v1/messages`: Retrieves all messages. Requires authentication.
- `GET /api/v1/messages/:id`: Retrieves a specific message by ID. Requires authentication.
- `PATCH /api/v1/messages/:id`: Edits a specific message by ID. Requires authentication and ownership of the message.
