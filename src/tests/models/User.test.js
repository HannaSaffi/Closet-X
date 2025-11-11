const mongoose = require('mongoose');
const User = require('../../models/User');

describe('User Model', () => {
  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });

  describe('User Schema Validation', () => {
    it('should create a valid user with all required fields', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User'
      };

      const user = await User.create(userData);

      expect(user._id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.name).toBe(userData.name);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should require email field', async () => {
      const userData = {
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User'
      };

      expect.assertions(1);
      try {
        await User.create(userData);
      } catch (error) {
        expect(error.errors.email).toBeDefined();
      }
    });

    it('should require username field', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        name: 'Test User'
      };

      expect.assertions(1);
      try {
        await User.create(userData);
      } catch (error) {
        expect(error.errors.username).toBeDefined();
      }
    });

    it('should require password field', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User'
      };

      expect.assertions(1);
      try {
        await User.create(userData);
      } catch (error) {
        expect(error.errors.password).toBeDefined();
      }
    });

    it('should require name field', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123'
      };

      expect.assertions(1);
      try {
        await User.create(userData);
      } catch (error) {
        expect(error.errors.name).toBeDefined();
      }
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User'
      };

      expect.assertions(1);
      try {
        await User.create(userData);
      } catch (error) {
        expect(error.errors.email).toBeDefined();
      }
    });

    it('should convert email to lowercase', async () => {
      const userData = {
        email: 'TEST@EXAMPLE.COM',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User'
      };

      const user = await User.create(userData);
      expect(user.email).toBe('test@example.com');
    });

    it('should enforce email uniqueness', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser1',
        password: 'TestPassword123',
        name: 'Test User 1'
      };

      await User.create(userData);

      const duplicateData = {
        email: 'test@example.com',
        username: 'testuser2',
        password: 'TestPassword123',
        name: 'Test User 2'
      };

      expect.assertions(1);
      try {
        await User.create(duplicateData);
      } catch (error) {
        expect(error.code).toBe(11000);
      }
    });
  });

  describe('Username Validation', () => {
    it('should enforce minimum username length (3 characters)', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'ab',
        password: 'TestPassword123',
        name: 'Test User'
      };

      expect.assertions(1);
      try {
        await User.create(userData);
      } catch (error) {
        expect(error.errors.username).toBeDefined();
      }
    });

    it('should enforce maximum username length (30 characters)', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'a'.repeat(31),
        password: 'TestPassword123',
        name: 'Test User'
      };

      expect.assertions(1);
      try {
        await User.create(userData);
      } catch (error) {
        expect(error.errors.username).toBeDefined();
      }
    });

    it('should enforce username uniqueness', async () => {
      const userData = {
        email: 'test1@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User 1'
      };

      await User.create(userData);

      const duplicateData = {
        email: 'test2@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User 2'
      };

      expect.assertions(1);
      try {
        await User.create(duplicateData);
      } catch (error) {
        expect(error.code).toBe(11000);
      }
    });

    it('should trim username whitespace', async () => {
      const userData = {
        email: 'test@example.com',
        username: '  testuser  ',
        password: 'TestPassword123',
        name: 'Test User'
      };

      const user = await User.create(userData);
      expect(user.username).toBe('testuser');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'TestPassword123';
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: plainPassword,
        name: 'Test User'
      };

      const user = await User.create(userData);
      expect(user.password).not.toBe(plainPassword);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should not hash password multiple times on save', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User'
      };

      const user = await User.create(userData);
      const firstHash = user.password;

      user.name = 'Updated Name';
      await user.save();

      expect(user.password).toBe(firstHash);
    });
  });

  describe('Password Comparison', () => {
    it('should match correct password', async () => {
      const plainPassword = 'TestPassword123';
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: plainPassword,
        name: 'Test User'
      };

      const user = await User.create(userData);
      const isMatch = await user.matchPassword(plainPassword);

      expect(isMatch).toBe(true);
    });

    it('should not match incorrect password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User'
      };

      const user = await User.create(userData);
      const isMatch = await user.matchPassword('WrongPassword');

      expect(isMatch).toBe(false);
    });
  });

  describe('JSON Serialization', () => {
    it('should exclude password from JSON', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User'
      };

      const user = await User.create(userData);
      const json = user.toJSON();

      expect(json.password).toBeUndefined();
      expect(json.email).toBe(userData.email);
      expect(json.username).toBe(userData.username);
    });
  });

  describe('User Preferences', () => {
    it('should store user preferences', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User',
        preferences: {
          style: ['casual', 'formal'],
          favoriteColors: ['blue', 'black'],
          location: 'New York'
        }
      };

      const user = await User.create(userData);

      expect(user.preferences.style).toEqual(['casual', 'formal']);
      expect(user.preferences.favoriteColors).toEqual(['blue', 'black']);
      expect(user.preferences.location).toBe('New York');
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt and updatedAt timestamps', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User'
      };

      const user = await User.create(userData);

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(user.updatedAt.getTime());
    });

    it('should update updatedAt when user is modified', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        name: 'Test User'
      };

      const user = await User.create(userData);
      const originalUpdatedAt = user.updatedAt.getTime();

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      user.name = 'Updated Name';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
    });
  });
});
