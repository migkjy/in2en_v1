import { users, academies, classes, assignments, submissions, comments } from "@shared/schema";
import type { User, Academy, Class, Assignment, Submission, Comment } from "@shared/schema";
import type { InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private academies: Map<number, Academy>;
  private classes: Map<number, Class>;
  private assignments: Map<number, Assignment>;
  private submissions: Map<number, Submission>;
  private comments: Map<number, Comment>;
  
  sessionStore: session.SessionStore;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.academies = new Map();
    this.classes = new Map();
    this.assignments = new Map();
    this.submissions = new Map();
    this.comments = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { ...userData, id };
    this.users.set(id, user);
    return user;
  }

  // Academy operations
  async createAcademy(data: Partial<Academy>): Promise<Academy> {
    const id = this.currentId++;
    const academy = { ...data, id } as Academy;
    this.academies.set(id, academy);
    return academy;
  }

  async getAcademy(id: number): Promise<Academy | undefined> {
    return this.academies.get(id);
  }

  async listAcademies(): Promise<Academy[]> {
    return Array.from(this.academies.values());
  }

  // Class operations
  async createClass(data: Partial<Class>): Promise<Class> {
    const id = this.currentId++;
    const cls = { ...data, id } as Class;
    this.classes.set(id, cls);
    return cls;
  }

  async getClass(id: number): Promise<Class | undefined> {
    return this.classes.get(id);
  }

  async listClasses(academyId?: number): Promise<Class[]> {
    const classes = Array.from(this.classes.values());
    return academyId ? classes.filter(c => c.academyId === academyId) : classes;
  }

  // Assignment operations
  async createAssignment(data: Partial<Assignment>): Promise<Assignment> {
    const id = this.currentId++;
    const assignment = { ...data, id } as Assignment;
    this.assignments.set(id, assignment);
    return assignment;
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async listAssignments(classId?: number): Promise<Assignment[]> {
    const assignments = Array.from(this.assignments.values());
    return classId ? assignments.filter(a => a.classId === classId) : assignments;
  }

  // Submission operations
  async createSubmission(data: Partial<Submission>): Promise<Submission> {
    const id = this.currentId++;
    const submission = { ...data, id } as Submission;
    this.submissions.set(id, submission);
    return submission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    return this.submissions.get(id);
  }

  async listSubmissions(assignmentId: number): Promise<Submission[]> {
    return Array.from(this.submissions.values())
      .filter(s => s.assignmentId === assignmentId);
  }

  async updateSubmission(id: number, data: Partial<Submission>): Promise<Submission> {
    const existing = await this.getSubmission(id);
    if (!existing) throw new Error('Submission not found');
    
    const updated = { ...existing, ...data };
    this.submissions.set(id, updated);
    return updated;
  }

  // Comment operations
  async createComment(data: Partial<Comment>): Promise<Comment> {
    const id = this.currentId++;
    const comment = { ...data, id, createdAt: new Date() } as Comment;
    this.comments.set(id, comment);
    return comment;
  }

  async listComments(submissionId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(c => c.submissionId === submissionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export const storage = new MemStorage();
