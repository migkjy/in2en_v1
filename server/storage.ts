import { users, branches, classes, assignments, submissions, comments, UserRole, teacherBranchAccess, teacherClassAccess } from "@shared/schema";
import type { User, Branch, Class, Assignment, Submission, Comment, TeacherBranchAccess, TeacherClassAccess } from "@shared/schema";
import type { InsertUser } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

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
  deleteClass(id: number): Promise<void>;
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

  // Teacher authority operations
  getTeacherBranches(teacherId: number): Promise<Branch[]>;
  getTeacherClasses(teacherId: number): Promise<Class[]>;
  updateTeacherAuthority(teacherId: number, branchIds: number[], classIds: number[]): Promise<void>;
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

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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

  async deleteClass(id: number): Promise<void> {
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

  async getTeacherBranches(teacherId: number): Promise<Branch[]> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, teacherId));

    if (!user || user.role !== UserRole.TEACHER) {
      throw new Error("Teacher not found");
    }

    const result = await db
      .select({
        id: branches.id,
        name: branches.name,
        address: branches.address,
      })
      .from(branches)
      .innerJoin(
        teacherBranchAccess,
        eq(teacherBranchAccess.branchId, branches.id)
      )
      .where(eq(teacherBranchAccess.teacherId, teacherId));

    return result;
  }

  async getTeacherClasses(teacherId: number): Promise<Class[]> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, teacherId));

    if (!user || user.role !== UserRole.TEACHER) {
      throw new Error("Teacher not found");
    }

    const result = await db
      .select({
        id: classes.id,
        name: classes.name,
        branchId: classes.branchId,
        englishLevel: classes.englishLevel,
        ageGroup: classes.ageGroup,
      })
      .from(classes)
      .innerJoin(
        teacherClassAccess,
        eq(teacherClassAccess.classId, classes.id)
      )
      .where(eq(teacherClassAccess.teacherId, teacherId));

    return result;
  }

  async updateTeacherAuthority(
    teacherId: number,
    branchIds: number[],
    classIds: number[]
  ): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, teacherId));

    if (!user || user.role !== UserRole.TEACHER) {
      throw new Error("Teacher not found");
    }

    console.log("Updating teacher authority:", { teacherId, branchIds, classIds });

    // Start a transaction
    await db.transaction(async (tx) => {
      try {
        // Delete existing access records
        const deletedBranches = await tx
          .delete(teacherBranchAccess)
          .where(eq(teacherBranchAccess.teacherId, teacherId))
          .returning();
        console.log("Deleted branch access records:", deletedBranches);

        const deletedClasses = await tx
          .delete(teacherClassAccess)
          .where(eq(teacherClassAccess.teacherId, teacherId))
          .returning();
        console.log("Deleted class access records:", deletedClasses);

        // Insert new branch access records
        if (branchIds.length > 0) {
          const newBranchAccess = await tx
            .insert(teacherBranchAccess)
            .values(
              branchIds.map(branchId => ({
                teacherId,
                branchId,
              }))
            )
            .returning();
          console.log("Inserted branch access records:", newBranchAccess);
        }

        // Insert new class access records
        if (classIds.length > 0) {
          const newClassAccess = await tx
            .insert(teacherClassAccess)
            .values(
              classIds.map(classId => ({
                teacherId,
                classId,
              }))
            )
            .returning();
          console.log("Inserted class access records:", newClassAccess);
        }
      } catch (error) {
        console.error("Error in updateTeacherAuthority transaction:", error);
        throw error;
      }
    });
  }
}

export const storage = new DatabaseStorage();