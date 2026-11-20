# ChatApp-Express

Backend REST API and Socket.IO WebSocket server for a real-time, encrypted 1-on-1 and group messaging application built with Node.js, Express, and MongoDB.

## Features

- **Authentication & User Discovery**: JWT-based signup and login supporting both `Authorization: Bearer <token>` headers and browser cookies, plus user search by name or email.
- **Message Encryption**: Messages are encrypted with a unique initialization vector (`iv`) before being stored in MongoDB and decrypted when fetched by authorized chat participants.
- **1-on-1 Direct Messages**: Supports lazy room creation—direct message threads are created automatically in the database when the first message is sent to a recipient.
- **Group Chat Administration**: Create group chats, rename groups (admin-only), add members (admin-only), remove members, or leave groups voluntarily (with automatic admin reassignment if the admin leaves).
- **Encrypted System Announcements**: Membership changes (adding, removing, or leaving a group) generate persistent, encrypted `isSystem` messages inside the chat feed.
- **Real-Time WebSockets**: Powered by Socket.IO to broadcast live messages, inline message edits, inbox updates, group name changes, and membership updates without page refreshes.

---

## Project Structure

```text
ChatApp-Express/
├── controllers/
│   ├── authController.js      # Signup, login, and JWT route protection
│   ├── chatController.js      # Inbox retrieval, group creation, rename, add/remove members
│   ├── errorController.js     # Global Express error handler
│   ├── messageController.js   # Encrypted message creation, decryption, and inline editing
│   └── userController.js      # User search queries
├── models/
│   ├── chatModel.js           # 1-on-1 & group chat schema (users, groupAdmin, latestMessage)
│   ├── messageModel.js        # Encrypted message schema (iv, encryptedMsg, isSystem, edited)
│   └── userModel.js           # User schema & password hashing
├── routes/
│   ├── chatRoutes.js          # /api/v1/chats endpoints
│   ├── messageRoutes.js       # /api/v1/messages endpoints
│   └── userRoutes.js          # /api/v1/users endpoints
├── utils/
│   ├── appError.js            # Custom operational error class
│   ├── asyncCatcher.js        # Async controller wrapper
│   ├── decryptMsg.js          # Message decryption utility
│   └── encryptMsg.js          # Message encryption utility
├── app.js                     # Express middleware, CORS, and route mounting
├── config.env                 # Environment variables
├── package.json
└── server.js                  # HTTP server, MongoDB connection, and Socket.IO setup
```

---

## Setup & Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create or update `config.env` in the root directory with your database, JWT, and encryption credentials:

```env
PORT=8000
DATABASE=mongodb+srv://<username>:<password>@cluster.mongodb.net/chatapp
DB_PASSWORD=your_mongodb_password
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=90d
ENCRYPTION_KEY=your_32_byte_encryption_secret
```

### 3. Run the Server

```bash
npm start
```

---

## REST API Endpoints

All protected endpoints require a valid JWT token via either an `Authorization: Bearer <token>` header or a `jwt` cookie.

### Users & Authentication (`/api/v1/users`)

| Method | Endpoint                       | Access    | Description                     |
| :----- | :----------------------------- | :-------- | :------------------------------ |
| `POST` | `/api/v1/users/signup`         | Public    | Register a new user account     |
| `POST` | `/api/v1/users/login`          | Public    | Authenticate user and issue JWT |
| `GET`  | `/api/v1/users?search=<query>` | Protected | Search users by name or email   |

### Chats & Groups (`/api/v1/chats`)

| Method | Endpoint                    | Access       | Description                                                         |
| :----- | :-------------------------- | :----------- | :------------------------------------------------------------------ |
| `GET`  | `/api/v1/chats`             | Protected    | Fetch all 1-on-1 and group chats for the logged-in user             |
| `POST` | `/api/v1/chats/group`       | Protected    | Create a new group chat (`{ name, users }`)                         |
| `PUT`  | `/api/v1/chats/rename`      | Group Admin  | Rename a group (`{ chatId, chatName }`) and broadcast live          |
| `PUT`  | `/api/v1/chats/groupadd`    | Group Admin  | Add a user (`{ chatId, userId }`), update their inbox, and announce |
| `PUT`  | `/api/v1/chats/groupremove` | Admin / Self | Remove a member or leave a group (`{ chatId, userId }`)             |

### Messages (`/api/v1/messages`)

| Method  | Endpoint                      | Access      | Description                                                                      |
| :------ | :---------------------------- | :---------- | :------------------------------------------------------------------------------- |
| `GET`   | `/api/v1/messages/:chatId`    | Protected   | Fetch and decrypt all messages in a chat room                                    |
| `POST`  | `/api/v1/messages`            | Protected   | Encrypt and save a message (`{ chatId, message }` or `{ recipientId, message }`) |
| `PATCH` | `/api/v1/messages/single/:id` | Sender Only | Re-encrypt and update an existing message (`{ message }`)                        |

---

## Socket.IO Events

Socket.IO runs on the same HTTP server port configured in `server.js` (`cors.origin` set to `http://localhost:8080`).

### Client -> Server

- `setup` `(userId)`: Joins the user's personal socket room for inbox updates and group notifications.
- `join chat` `(chatId)`: Joins a specific conversation room when opened in the UI.
- `new message` `({ chat, message })`: Broadcasts a newly saved message to active room participants and triggers inbox refreshes.
- `edit message` `({ chatId, messageId, updatedText })`: Broadcasts an inline message edit to active room members.
- `group renamed` `(updatedChat)`: Fallback broadcast to sync updated group metadata across members.

### Server -> Client

- `connected`: Confirms the user's personal socket room registration.
- `message received` `({ chat, message })`: Delivers new messages and system announcements into the active chat feed.
- `inbox updated` `({ chat, message })`: Notifies participants to refresh their sidebar conversation list.
- `message edited` `({ chatId, messageId, updatedText })`: Updates an edited message bubble in real time.
- `group updated` `(updatedChat)`: Updates group title and member lists in real time across headers and sidebars.
- `added to group` `(updatedChat)`: Pushes a newly joined group directly into the added user's sidebar inbox.
- `removed from group` `({ chatId })`: Removes the group from a removed/departed user's inbox and closes the active chat window.
