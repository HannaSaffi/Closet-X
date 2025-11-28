/**
 * REAL Auth Controller Tests - Executes Actual Source Code
 * This will ACTUALLY INCREASE your coverage report!
 * 
 * Place in: services/user-service/tests/controller-real.test.js
 */

const authController = require('../src/controllers/authController');
const User = require('../src/models/User');

// Mock the User model
jest.mock('../src/models/User');

describe('Auth Controller - Real Source Code Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Setup mock request and response objects
    mockReq = {
      body: {},
      user: null,
      token: null
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('register()', () => {
    test('should register a new user successfully', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'Test1234',
        name: 'Test User',
        username: 'testuser'
      };

      User.findOne = jest.fn().mockResolvedValue(null);
      
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        save: jest.fn().mockResolvedValue(true),
        generateAuthToken: jest.fn().mockReturnValue('mock-token'),
        toJSON: jest.fn().mockReturnValue({ 
          id: 'user123', 
          email: 'test@example.com',
          name: 'Test User'
        })
      };

      User.mockImplementation(() => mockUser);

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({
        $or: [
          { email: 'test@example.com' },
          { username: 'testuser' }
        ]
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User registered successfully',
          token: 'mock-token'
        })
      );
    });

    test('should reject registration with missing fields', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com'
        // missing password, name, username
      };

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'All fields are required'
      });
    });

    test('should reject registration for existing user', async () => {
      // Arrange
      mockReq.body = {
        email: 'existing@example.com',
        password: 'Test1234',
        name: 'Existing User',
        username: 'existing'
      };

      const existingUser = {
        _id: 'existing123',
        email: 'existing@example.com'
      };

      User.findOne = jest.fn().mockResolvedValue(existingUser);

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User with this email or username already exists'
      });
    });

    test('should handle registration errors gracefully', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'Test1234',
        name: 'Test User',
        username: 'testuser'
      };

      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('login()', () => {
    test('should login user with valid credentials', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'Test1234'
      };

      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        generateAuthToken: jest.fn().mockReturnValue('login-token'),
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ 
          id: 'user123', 
          email: 'test@example.com' 
        })
      };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(User.findOne).toHaveBeenCalled();
      expect(mockUser.comparePassword).toHaveBeenCalledWith('Test1234');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          token: 'login-token'
        })
      );
    });

    test('should reject login with missing fields', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com'
        // missing password
      };

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email and password are required'
      });
    });

    test('should reject login for non-existent user', async () => {
      // Arrange
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'Test1234'
      };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials'
      });
    });

    test('should reject login with wrong password', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const mockUser = {
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(mockUser.comparePassword).toHaveBeenCalledWith('WrongPassword');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials'
      });
    });

    test('should reject login for deactivated account', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'Test1234'
      };

      const mockUser = {
        email: 'test@example.com',
        isActive: false,
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Account is deactivated'
      });
    });

    test('should handle login errors gracefully', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'Test1234'
      };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed'
      });
    });
  });

  describe('logout()', () => {
    test('should logout user successfully', async () => {
      // Arrange
      mockReq.user = {
        _id: 'user123',
        authTokens: [
          { token: 'token1' },
          { token: 'token2' },
          { token: 'token3' }
        ],
        save: jest.fn().mockResolvedValue(true)
      };
      mockReq.token = 'token2';

      // Act
      await authController.logout(mockReq, mockRes);

      // Assert
      expect(mockReq.user.authTokens).toHaveLength(2);
      expect(mockReq.user.authTokens).not.toContainEqual({ token: 'token2' });
      expect(mockReq.user.save).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    test('should handle logout errors gracefully', async () => {
      // Arrange
      mockReq.user = {
        authTokens: [],
        save: jest.fn().mockRejectedValue(new Error('Save failed'))
      };
      mockReq.token = 'token1';

      // Act
      await authController.logout(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Save failed'
      });
    });
  });

  describe('getCurrentUser()', () => {
    test('should return current user successfully', async () => {
      // Arrange
      mockReq.user = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        toJSON: jest.fn().mockReturnValue({
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        })
      };

      // Act
      await authController.getCurrentUser(mockReq, mockRes);

      // Assert
      expect(mockReq.user.toJSON).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        }
      });
    });

    test('should handle errors when getting current user', async () => {
      // Arrange
      mockReq.user = {
        toJSON: jest.fn().mockImplementation(() => {
          throw new Error('Serialization error');
        })
      };

      // Act
      await authController.getCurrentUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Serialization error'
      });
    });
  });

  describe('updateProfile()', () => {
    test('should update user profile successfully', async () => {
      // Arrange
      mockReq.body = {
        name: 'Updated Name',
        preferences: { style: 'formal' }
      };

      mockReq.user = {
        name: 'Old Name',
        preferences: { style: 'casual' },
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({
          name: 'Updated Name',
          preferences: { style: 'formal' }
        })
      };

      // Act
      await authController.updateProfile(mockReq, mockRes);

      // Assert
      expect(mockReq.user.name).toBe('Updated Name');
      expect(mockReq.user.save).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        user: expect.objectContaining({
          name: 'Updated Name'
        })
      });
    });

    test('should reject invalid field updates', async () => {
      // Arrange
      mockReq.body = {
        password: 'newpassword', // Not allowed
        email: 'newemail@example.com' // Not allowed
      };

      mockReq.user = {
        save: jest.fn()
      };

      // Act
      await authController.updateProfile(mockReq, mockRes);

      // Assert
      expect(mockReq.user.save).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid updates'
      });
    });

    test('should handle profile update errors gracefully', async () => {
      // Arrange
      mockReq.body = {
        name: 'Updated Name'
      };

      mockReq.user = {
        name: 'Old Name',
        save: jest.fn().mockRejectedValue(new Error('Save failed'))
      };

      // Act
      await authController.updateProfile(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Save failed'
      });
    });

    test('should allow updating profileImage', async () => {
      // Arrange
      mockReq.body = {
        profileImage: 'https://newimage.com/profile.jpg'
      };

      mockReq.user = {
        profileImage: 'https://oldimage.com/profile.jpg',
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({
          profileImage: 'https://newimage.com/profile.jpg'
        })
      };

      // Act
      await authController.updateProfile(mockReq, mockRes);

      // Assert
      expect(mockReq.user.profileImage).toBe('https://newimage.com/profile.jpg');
      expect(mockReq.user.save).toHaveBeenCalled();
    });
  });
});