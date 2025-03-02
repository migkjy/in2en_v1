import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  try {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${derivedKey.toString('hex')}.${salt}`;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    const [storedHash, salt] = stored.split('.');
    if (!storedHash || !salt) {
      console.error('Invalid password format:', { hasHash: !!storedHash, hasSalt: !!salt });
      return false;
    }
    const suppliedBuffer = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const storedBuffer = Buffer.from(storedHash, 'hex');
    return timingSafeEqual(suppliedBuffer, storedBuffer);
  } catch (error) {
    console.error('Password comparison failed:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  app.use(
    session({
      secret: process.env.REPL_ID || "development-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          console.log('Login attempt for:', email);

          const user = await storage.getUserByEmail(email);
          if (!user) {
            console.log('User not found');
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log('User found, validating password');
          const isValid = await comparePasswords(password, user.password);

          if (!isValid) {
            console.log('Password validation failed');
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log('Login successful');
          const { password: _, ...userWithoutPassword } = user;
          return done(null, userWithoutPassword);
        } catch (error) {
          console.error('Login error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, name, role } = req.body;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      console.log('Creating new user with email:', email);
      const hashedPassword = await hashPassword(password);
      console.log('Password hashed successfully');

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role,
      });

      console.log('User created successfully');
      const { password: _, ...userWithoutPassword } = user;

      req.login(userWithoutPassword, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('Authentication error:', err);
        return next(err);
      }

      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Session error:', err);
          return next(err);
        }
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    try {
      console.log('Logging out user:', req.user);
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
          return next(err);
        }
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
            return next(err);
          }
          res.clearCookie('connect.sid');
          res.sendStatus(200);
        });
      });
    } catch (error) {
      console.error('Unexpected logout error:', error);
      next(error);
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}