import { users, academies, classes, assignments, submissions, comments } from "@shared/schema";
import type { User, Academy, Class, Assignment, Submission, Comment } from "@shared/schema";
import type { InsertUser } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Academy operations
  createAcademy(data: Partial<Academy>): Promise<Academy>;
  getAcademy(id: number): Promise<Academy | undefined>;
  listAcademies(): Promise<Academy[]>;

  // Class operations
  createClass(data: Partial<Class>): Promise<Class>;
  getClass(id: number): Promise<Class | undefined>;
  listClasses(academyId?: number): Promise<Class[]>;

  // Assignment operations
  createAssignment(data: Partial<Assignment>): Promise<Assignment>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  listAssignments(classId?: number): Promise<Assignment[]>;

  // Submission operations
  createSubmission(data: Partial<Submission>): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  listSubmissions(assignmentId: number): Promise<Submission[]>;
  updateSubmission(id: number, data: Partial<Submission>): Promise<Submission>;

  // Comment operations
  createComment(data: Partial<Comment>): Promise<Comment>;
  listComments(submissionId: number): Promise<Comment[]>;

  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Academy operations
  async createAcademy(data: Partial<Academy>): Promise<Academy> {
    const [academy] = await db.insert(academies).values(data).returning();
    return academy;
  }

  async getAcademy(id: number): Promise<Academy | undefined> {
    const [academy] = await db.select().from(academies).where(eq(academies.id, id));
    return academy;
  }

  async listAcademies(): Promise<Academy[]> {
    return await db.select().from(academies);
  }

  // Class operations
  async createClass(data: Partial<Class>): Promise<Class> {
    const [cls] = await db.insert(classes).values(data).returning();
    return cls;
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, id));
    return cls;
  }

  async listClasses(academyId?: number): Promise<Class[]> {
    let query = db.select().from(classes);
    if (academyId) {
      query = query.where(eq(classes.academyId, academyId));
    }
    return await query;
  }

  // Assignment operations
  async createAssignment(data: Partial<Assignment>): Promise<Assignment> {
    const [assignment] = await db.insert(assignments).values(data).returning();
    return assignment;
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  }

  async listAssignments(classId?: number): Promise<Assignment[]> {
    let query = db.select().from(assignments);
    if (classId) {
      query = query.where(eq(assignments.classId, classId));
    }
    return await query;
  }

  // Submission operations
  async createSubmission(data: Partial<Submission>): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(data).returning();
    return submission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async listSubmissions(assignmentId: number): Promise<Submission[]> {
    return await db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId));
  }

  async updateSubmission(id: number, data: Partial<Submission>): Promise<Submission> {
    const [submission] = await db
      .update(submissions)
      .set(data)
      .where(eq(submissions.id, id))
      .returning();
    if (!submission) throw new Error('Submission not found');
    return submission;
  }

  // Comment operations
  async createComment(data: Partial<Comment>): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }

  async listComments(submissionId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.submissionId, submissionId))
      .orderBy(comments.createdAt);
  }
}

export const storage = new DatabaseStorage();