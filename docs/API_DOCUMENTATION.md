# Closet-X API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "name": "Full Name",
  "password": "Password123",
  "passwordConfirm": "Password123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "username",
    "name": "Full Name"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or passwords don't match
- `400 Bad Request` - Email or username already exists

**Validation Rules:**
- Email: Valid email format, unique
- Username: 3-30 characters, unique
- Password: Minimum 6 characters
- Name: Required field

---

### Login User
**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "username",
    "name": "Full Name"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing email or password
- `401 Unauthorized` - Invalid email or password

---

### Get Current User
**GET** `/auth/me`

Get information about the currently authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "username",
    "name": "Full Name",
    "preferences": {
      "style": [],
      "favoriteColors": [],
      "location": ""
    },
    "createdAt": "2025-11-11T12:00:00Z",
    "updatedAt": "2025-11-11T12:00:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - No token provided or invalid token

---

### Logout
**POST** `/auth/logout`

Logout current user. Clears refresh token cookie.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - No token provided

---

### Refresh Token
**POST** `/auth/refresh`

Get a new JWT token using refresh token.

**Cookies:**
- `refreshToken` - Sent in httpOnly cookie (automatic)

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized` - Refresh token not found or invalid

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request or validation failed
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - Access denied
- `500 Internal Server Error` - Server error

---

## Security

### Best Practices

1. **JWT Storage**: Store tokens securely in httpOnly cookies or secure storage
2. **HTTPS**: Always use HTTPS in production
3. **Token Expiration**: Access tokens expire after 7 days
4. **Refresh Tokens**: Refresh tokens expire after 30 days
5. **Password Hashing**: Passwords are hashed using bcrypt (10 rounds)
6. **CORS**: Enabled for development, configure for production

### Token Expiration
- Access Token: 7 days
- Refresh Token: 30 days

---

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/closetx
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRE=30d
```

---

## Rate Limiting

Rate limiting is not currently implemented. Consider adding in production.

Recommended: 100 requests per minute per IP

---

## API Examples

### Example 1: Complete Auth Flow

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "name": "John Doe",
    "password": "SecurePass123",
    "passwordConfirm": "SecurePass123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# Get current user (using token from response)
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Version History

### v1.0.0 (Current)
- ✅ User registration and login
- ✅ JWT authentication
- ✅ Refresh token mechanism
- ✅ Password hashing with bcrypt
- ✅ Protected routes

### Upcoming
- OAuth2 integration (Google, Facebook)
- Two-factor authentication
- Password reset flow
- User profile updates

---

## Support

For issues or questions, please create an issue in the GitHub repository.

Last Updated: November 11, 2025
