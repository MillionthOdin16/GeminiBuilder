/**
 * Auth Manager - JWT-based authentication
 * 
 * Handles user authentication, sessions, and API key management
 */

import { randomUUID, createHash, randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  salt: string;
  created: Date;
  lastLogin?: Date;
  role: 'admin' | 'user';
  settings?: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  created: Date;
  expires: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

export interface EncryptedApiKey {
  id: string;
  name: string;
  encryptedValue: string;
  iv: string;
  created: Date;
  lastUsed?: Date;
}

export class AuthManager {
  private configDir: string;
  private usersFile: string;
  private sessionsFile: string;
  private apiKeysFile: string;
  private jwtSecret: string;
  private encryptionKey: Buffer | null = null;
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private apiKeys: Map<string, EncryptedApiKey> = new Map();

  // Token expiration times
  private readonly accessTokenExpiry = '1h';
  private readonly refreshTokenExpiry = '7d';
  private readonly sessionMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.configDir = path.join(os.homedir(), '.gemini', 'auth');
    this.usersFile = path.join(this.configDir, 'users.json');
    this.sessionsFile = path.join(this.configDir, 'sessions.json');
    this.apiKeysFile = path.join(this.configDir, 'api-keys.json');
    
    // Generate or load JWT secret
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecret();
  }

  /**
   * Generate a random secret
   */
  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Initialize auth manager
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true, mode: 0o700 });
      await this.loadUsers();
      await this.loadSessions();
      await this.loadApiKeys();
      await this.initEncryptionKey();
      
      // Create default admin if no users exist
      if (this.users.size === 0) {
        await this.createDefaultAdmin();
      }
      
      // Cleanup expired sessions
      await this.cleanupExpiredSessions();
    } catch (error) {
      console.error('Failed to initialize auth manager:', error);
    }
  }

  /**
   * Initialize encryption key for API keys
   */
  private async initEncryptionKey(): Promise<void> {
    const keyPath = path.join(this.configDir, '.key');
    
    try {
      const keyHex = await fs.readFile(keyPath, 'utf-8');
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    } catch {
      // Generate new key
      this.encryptionKey = randomBytes(32);
      await fs.writeFile(keyPath, this.encryptionKey.toString('hex'), { mode: 0o600 });
    }
  }

  /**
   * Load users from file
   */
  private async loadUsers(): Promise<void> {
    try {
      const content = await fs.readFile(this.usersFile, 'utf-8');
      const users: User[] = JSON.parse(content);
      this.users = new Map(users.map(u => [u.id, u]));
    } catch {
      this.users = new Map();
    }
  }

  /**
   * Save users to file
   */
  private async saveUsers(): Promise<void> {
    const users = Array.from(this.users.values());
    await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2), { mode: 0o600 });
  }

  /**
   * Load sessions from file
   */
  private async loadSessions(): Promise<void> {
    try {
      const content = await fs.readFile(this.sessionsFile, 'utf-8');
      const sessions: Session[] = JSON.parse(content);
      this.sessions = new Map(sessions.map(s => [s.id, s]));
    } catch {
      this.sessions = new Map();
    }
  }

  /**
   * Save sessions to file
   */
  private async saveSessions(): Promise<void> {
    const sessions = Array.from(this.sessions.values());
    await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2), { mode: 0o600 });
  }

  /**
   * Load API keys from file
   */
  private async loadApiKeys(): Promise<void> {
    try {
      const content = await fs.readFile(this.apiKeysFile, 'utf-8');
      const keys: EncryptedApiKey[] = JSON.parse(content);
      this.apiKeys = new Map(keys.map(k => [k.id, k]));
    } catch {
      this.apiKeys = new Map();
    }
  }

  /**
   * Save API keys to file
   */
  private async saveApiKeys(): Promise<void> {
    const keys = Array.from(this.apiKeys.values());
    await fs.writeFile(this.apiKeysFile, JSON.stringify(keys, null, 2), { mode: 0o600 });
  }

  /**
   * Create default admin user
   */
  private async createDefaultAdmin(): Promise<void> {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    await this.createUser({
      username: 'admin',
      password: defaultPassword,
      role: 'admin',
    });
    console.log('Created default admin user. Please change the password!');
  }

  /**
   * Hash password with salt
   */
  private async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const useSalt = salt || randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(password, useSalt, 64) as Buffer;
    return {
      hash: derivedKey.toString('hex'),
      salt: useSalt,
    };
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const { hash: computedHash } = await this.hashPassword(password, salt);
    return computedHash === hash;
  }

  /**
   * Create a new user
   */
  async createUser(options: {
    username: string;
    password: string;
    email?: string;
    role?: 'admin' | 'user';
  }): Promise<User> {
    // Check if username exists
    for (const user of this.users.values()) {
      if (user.username === options.username) {
        throw new Error('Username already exists');
      }
    }

    const { hash, salt } = await this.hashPassword(options.password);

    const user: User = {
      id: randomUUID(),
      username: options.username,
      email: options.email,
      passwordHash: hash,
      salt,
      created: new Date(),
      role: options.role || 'user',
    };

    this.users.set(user.id, user);
    await this.saveUsers();

    // Return user without sensitive data
    const { passwordHash: _p, salt: _s, ...safeUser } = user;
    return safeUser as User;
  }

  /**
   * Authenticate user and create session
   */
  async login(
    username: string,
    password: string,
    options: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<{ user: Omit<User, 'passwordHash' | 'salt'>; accessToken: string; refreshToken: string }> {
    // Find user by username
    let user: User | undefined;
    for (const u of this.users.values()) {
      if (u.username === username) {
        user = u;
        break;
      }
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const valid = await this.verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await this.saveUsers();

    // Create session
    const session = await this.createSession(user.id, options);

    // Return user without sensitive data
    const { passwordHash: _p, salt: _s, ...safeUser } = user;
    return {
      user: safeUser,
      accessToken: session.token,
      refreshToken: session.refreshToken,
    };
  }

  /**
   * Create a new session
   */
  private async createSession(
    userId: string,
    options: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<Session> {
    const sessionId = randomUUID();
    const now = new Date();

    const accessPayload: TokenPayload = {
      userId,
      sessionId,
      type: 'access',
    };

    const refreshPayload: TokenPayload = {
      userId,
      sessionId,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry,
    });

    const session: Session = {
      id: sessionId,
      userId,
      token: accessToken,
      refreshToken,
      created: now,
      expires: new Date(now.getTime() + this.sessionMaxAge),
      lastActivity: now,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    };

    this.sessions.set(sessionId, session);
    await this.saveSessions();

    return session;
  }

  /**
   * Verify access token
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;
      
      // Check if session still exists
      const session = this.sessions.get(payload.sessionId);
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (new Date() > new Date(session.expires)) {
        this.sessions.delete(payload.sessionId);
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtSecret) as TokenPayload;
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const session = this.sessions.get(payload.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Check if session is expired
      if (new Date() > new Date(session.expires)) {
        this.sessions.delete(payload.sessionId);
        throw new Error('Session expired');
      }

      // Generate new tokens
      const newAccessPayload: TokenPayload = {
        userId: payload.userId,
        sessionId: payload.sessionId,
        type: 'access',
      };

      const newRefreshPayload: TokenPayload = {
        userId: payload.userId,
        sessionId: payload.sessionId,
        type: 'refresh',
      };

      const newAccessToken = jwt.sign(newAccessPayload, this.jwtSecret, {
        expiresIn: this.accessTokenExpiry,
      });

      const newRefreshToken = jwt.sign(newRefreshPayload, this.jwtSecret, {
        expiresIn: this.refreshTokenExpiry,
      });

      // Update session
      session.token = newAccessToken;
      session.refreshToken = newRefreshToken;
      session.lastActivity = new Date();
      await this.saveSessions();

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout (invalidate session)
   */
  async logout(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    await this.saveSessions();
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAll(userId: string): Promise<void> {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(id);
      }
    }
    await this.saveSessions();
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): Omit<User, 'passwordHash' | 'salt'> | null {
    const user = this.users.get(userId);
    if (!user) return null;

    const { passwordHash: _p, salt: _s, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    updates: Partial<Pick<User, 'email' | 'settings'>>
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (updates.email !== undefined) user.email = updates.email;
    if (updates.settings !== undefined) user.settings = updates.settings;

    await this.saveUsers();
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const valid = await this.verifyPassword(currentPassword, user.passwordHash, user.salt);
    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const { hash, salt } = await this.hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;

    await this.saveUsers();

    // Invalidate all sessions except current
    await this.logoutAll(userId);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    this.users.delete(userId);
    await this.saveUsers();
    await this.logoutAll(userId);
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const [id, session] of this.sessions) {
      if (now > new Date(session.expires)) {
        this.sessions.delete(id);
        count++;
      }
    }

    if (count > 0) {
      await this.saveSessions();
    }

    return count;
  }

  /**
   * Encrypt API key
   */
  private encrypt(text: string): { encrypted: string; iv: string } {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt API key
   */
  private decrypt(encrypted: string, iv: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const decipher = createDecipheriv(
      'aes-256-cbc',
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Store an API key (encrypted)
   */
  async storeApiKey(name: string, value: string): Promise<string> {
    const { encrypted, iv } = this.encrypt(value);
    const id = randomUUID();

    const apiKey: EncryptedApiKey = {
      id,
      name,
      encryptedValue: encrypted,
      iv,
      created: new Date(),
    };

    this.apiKeys.set(id, apiKey);
    await this.saveApiKeys();

    return id;
  }

  /**
   * Get API key (decrypted)
   */
  getApiKey(id: string): string | null {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return null;

    apiKey.lastUsed = new Date();
    return this.decrypt(apiKey.encryptedValue, apiKey.iv);
  }

  /**
   * List API keys (without values)
   */
  listApiKeys(): { id: string; name: string; created: Date; lastUsed?: Date }[] {
    return Array.from(this.apiKeys.values()).map(k => ({
      id: k.id,
      name: k.name,
      created: k.created,
      lastUsed: k.lastUsed,
    }));
  }

  /**
   * Delete API key
   */
  async deleteApiKey(id: string): Promise<void> {
    this.apiKeys.delete(id);
    await this.saveApiKeys();
  }

  /**
   * Get active sessions for user
   */
  getUserSessions(userId: string): Omit<Session, 'token' | 'refreshToken'>[] {
    const sessions: Omit<Session, 'token' | 'refreshToken'>[] = [];

    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        const { token: _t, refreshToken: _r, ...safeSession } = session;
        sessions.push(safeSession);
      }
    }

    return sessions;
  }
}

// Export singleton instance
export const authManager = new AuthManager();

/**
 * Express middleware for JWT authentication
 */
export function authMiddleware(required: boolean = true) {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (required) {
        return res.status(401).json({ error: 'No token provided' });
      }
      return next();
    }

    const token = authHeader.slice(7);
    const payload = authManager.verifyToken(token);

    if (!payload) {
      if (required) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      return next();
    }

    req.user = authManager.getUser(payload.userId);
    req.sessionId = payload.sessionId;
    next();
  };
}

/**
 * Role-based access middleware
 */
export function requireRole(role: 'admin' | 'user') {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  };
}
