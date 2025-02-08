import { users, branches, classes, assignments, submissions, comments } from "@shared/schema";
import type { User, Branch, Class, Assignment, Submission, Comment } from "@shared/schema";
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

  // Branch operations
  createBranch(data: Partial<Branch>): Promise<Branch>;
  getBranch(id: number): Promise<Branch | undefined>;
  listBranches(): Promise<Branch[]>;
  updateBranch(id: number, data: Partial<Branch>): Promise<Branch | undefined>;
  deleteBranch(id: number): Promise<void>;

  // Class operations
  createClass(data: Partial<Class>): Promise<Class>;
  getClass(id: number): Promise<Class | undefined>;
  listClasses(branchId?: number): Promise<Class[]>;
  deleteClass(id: number): Promise<void>; // Added deleteClass
  updateClass(id: number, data: Partial<Class>): Promise<Class | undefined>;

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
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

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
    const [newUser] = await db.insert(users).values([user]).returning();
    return newUser;
  }

  // Branch operations
  async createBranch(data: Partial<Branch>): Promise<Branch> {
    const [branch] = await db.insert(branches).values([data]).returning();
    return branch;
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    if (!id || isNaN(id)) {
      throw new Error("Invalid branch ID");
    }

    try {
      const [branch] = await db.select().from(branches).where(eq(branches.id, id));
      return branch;
    } catch (error) {
      console.error("Database error in getBranch:", error);
      throw error;
    }
  }

  async listBranches(): Promise<Branch[]> {
    return await db.select().from(branches);
  }

  async updateBranch(id: number, data: Partial<Branch>): Promise<Branch | undefined> {
    const [updatedBranch] = await db.update(branches).set(data).where(eq(branches.id, id)).returning();
    return updatedBranch;
  }

  async deleteBranch(id: number): Promise<void> {
    await db.delete(branches).where(eq(branches.id, id));
  }


  // Class operations
  async createClass(data: Partial<Class>): Promise<Class> {
    const [cls] = await db.insert(classes).values([data]).returning();
    return cls;
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, id));
    return cls;
  }

  async listClasses(branchId?: number): Promise<Class[]> {
    let query = db.select({
      id: classes.id,
      name: classes.name,
      branchId: classes.branchId,
      englishLevel: classes.englishLevel,
      ageGroup: classes.ageGroup,
      branch: {
        id: branches.id,
        name: branches.name,
        address: branches.address,
      },
    })
    .from(classes)
    .leftJoin(branches, eq(classes.branchId, branches.id));

    if (branchId) {
      query = query.where(eq(classes.branchId, branchId));
    }

    return await query;
  }

  async deleteClass(id: number): Promise<void> { // Added deleteClass
    await db.delete(classes).where(eq(classes.id, id));
  }

  async updateClass(id: number, data: Partial<Class>): Promise<Class | undefined> {
    const [updatedClass] = await db
      .update(classes)
      .set({ ...data, branchId: data.branchId || null })
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  // Assignment operations
  async createAssignment(data: Partial<Assignment>): Promise<Assignment> {
    const [assignment] = await db.insert(assignments).values([data]).returning();
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
    const [submission] = await db.insert(submissions).values([data]).returning();
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
    const [comment] = await db.insert(comments).values([data]).returning();
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