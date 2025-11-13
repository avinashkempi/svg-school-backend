# SGV School Backend

A Node.js/Express backend API for the SGV School mobile application, providing authentication, event management, news management, school information, and user management features.

## Features

- **Authentication**: JWT-based authentication with role-based access control (admin, super admin, user)
- **News Management**: CRUD operations for school news with public/private visibility
- **Event Management**: Full event lifecycle management with notifications
- **School Information**: Centralized school data management
- **User Management**: User CRUD operations with role management
- **Automated Cleanup**: Cron jobs for maintaining data integrity

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Validation**: Express Validator
- **Password Hashing**: bcryptjs
- **Scheduling**: node-cron
- **Environment**: dotenv

## Installation

1. **Clone the repository** (if applicable) or navigate to the backend directory:
   ```bash
   cd svg-school-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/sgv-school
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d
   ```

4. **Start MongoDB**:
   Ensure MongoDB is running on your system or update `MONGODB_URI` to point to your MongoDB instance.

## Running the Application

### Development Mode
```bash
npm run dev
```
This starts the server with nodemon for automatic restarts on file changes.

### Production Mode
```bash
npm start
```
This starts the server normally.

The server will run on `http://localhost:5000` by default (or the port specified in your `.env` file).

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### News
- `GET /api/news` - Get all news items (public, filtered by authentication)
- `GET /api/news/:id` - Get a specific news item by ID
- `POST /api/news` - Create a new news item (admin only)
- `PUT /api/news/:id` - Update a news item (admin only)
- `DELETE /api/news/:id` - Delete a news item (admin only)

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get a specific event by ID
- `POST /api/events` - Create a new event (admin only)
- `PUT /api/events/:id` - Update an event (admin only)
- `DELETE /api/events/:id` - Delete an event (admin only)

### School Information
- `GET /api/school-info` - Get school information

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get a specific user by ID (admin only)
- `POST /api/users` - Create a new user (admin only)
- `PUT /api/users/:id` - Update a user (admin only)
- `DELETE /api/users/:id` - Delete a user (admin only)

## Database Models

### User
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (enum: ['user', 'admin', 'super admin'], default: 'user'),
  createdAt: Date,
  updatedAt: Date
}
```

### News
```javascript
{
  title: String (required),
  description: String (required),
  creationDate: Date (required, default: now),
  url: String,
  privateNews: Boolean (default: false),
  createdBy: ObjectId (ref: 'User', required),
  createdAt: Date,
  updatedAt: Date
}
```

### Event
```javascript
{
  title: String (required),
  description: String (required),
  date: Date (required),
  time: String,
  location: String,
  createdBy: ObjectId (ref: 'User', required),
  createdAt: Date,
  updatedAt: Date
}
```

### SchoolInfo
```javascript
{
  name: String (required),
  address: String,
  phone: String,
  email: String,
  website: String,
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Notification
```javascript
{
  eventId: ObjectId (ref: 'Event', required),
  message: String (required),
  createdAt: Date
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Roles
- **User**: Basic access to public content
- **Admin**: Full CRUD access to news, events, and users
- **Super Admin**: All admin privileges plus additional system management

## Cron Jobs

The application includes automated cleanup tasks:

- **Daily at midnight**: Deletes notifications for past events to maintain database cleanliness.

## Validation

All input data is validated using express-validator. Common validations include:
- Required fields
- String length limits
- Email format validation
- URL validation
- Boolean validation

## Error Handling

The API returns standardized error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"] // for validation errors
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
