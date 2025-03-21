import { users, branches, classes, assignments, submissions, comments, UserRole, teacherBranchAccess, teacherClassAccess, classLeadTeachers, studentClassAccess, englishLevels, ageGroups } from "@shared/schema";
import type { User, Branch, Class, Assignment, Submission, Comment, TeacherBranchAccess, TeacherClassAccess, ClassLeadTeacher, EnglishLevel, AgeGroup } from "@shared/schema";
import type { InsertUser, InsertClassLeadTeacher } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
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
  listAssignments(classId?: number, status?: string): Promise<Assignment[]>;
  updateAssignment(id: number, data: Partial<Assignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: number): Promise<void>;

  // Submission operations
  createSubmission(data: Partial<Submission>): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  listSubmissions(assignmentId: number): Promise<Submission[]>;
  updateSubmission(id: number, data: Partial<Submission>): Promise<Submission>;
  deleteSubmission(id: number): Promise<void>;

  // Comment operations
  createComment(data: Partial<Comment>): Promise<Comment>;
  listComments(submissionId: number): Promise<Comment[]>;

  // Session store
  sessionStore: any;

  // Teacher authority operations
  getTeacherBranches(teacherId: number): Promise<Branch[]>;
  getTeacherClasses(teacherId: number): Promise<Class[]>;
  updateTeacherAuthority(teacherId: number, branchIds: number[], classIds: number[]): Promise<{ success: true }>;

  // Lead Teacher operations
  assignLeadTeacher(classId: number, teacherId: number): Promise<ClassLeadTeacher>;
  removeLeadTeacher(classId: number, teacherId: number): Promise<void>;
  getClassLeadTeachers(classId: number): Promise<User[]>;
  isLeadTeacher(classId: number, teacherId: number): Promise<boolean>;

  // Add new methods for student class management
  assignStudentToClass(classId: number, studentId: number): Promise<void>;
  removeStudentFromClass(classId: number, studentId: number): Promise<void>;
  getClassStudents(classId: number): Promise<User[]>;

  //New methods for teacher class management
  updateTeacherClassRole(classId: number, teacherId: number, data: { isLead: boolean; hasAccess: boolean }): Promise<void>;
  removeTeacherFromClass(classId: number, teacherId: number): Promise<void>;
  getClassTeachers(classId: number): Promise<(User & { isLead: boolean; hasAccess: boolean; })[]>;

  // English Level operations
  createEnglishLevel(data: { name: string; description?: string }): Promise<EnglishLevel>;
  listEnglishLevels(): Promise<EnglishLevel[]>;
  deleteEnglishLevel(id: number): Promise<void>;

  // Age Group operations
  createAgeGroup(data: { name: string; description?: string }): Promise<AgeGroup>;
  listAgeGroups(): Promise<AgeGroup[]>;
  deleteAgeGroup(id: number): Promise<void>;

  // Password operations
  verifyPassword(user: User, password: string): Promise<boolean>;
  updateUserPassword(userId: number, newPassword: string): Promise<boolean>;
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
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, id),
        eq(users.isHidden, false)
      ));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email),
        eq(users.isHidden, false)
      ));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash password if it exists and isn't already hashed
    if (user.password && !user.password.includes('.')) {
      const salt = randomBytes(16).toString('hex');
      const derivedKey = (await scryptAsync(user.password, salt, 64)) as Buffer;
      user.password = `${derivedKey.toString('hex')}.${salt}`;
    }

    // Convert empty phone_number to null
    if (user.phone_number === '') {
      user.phone_number = null;
    }

    const [newUser] = await db.insert(users).values([user]).returning();
    return newUser;
  }

  async listUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isHidden, false));
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    // Hash password if it exists and isn't already hashed
    if (data.password && !data.password.includes('.')) {
      const salt = randomBytes(16).toString('hex');
      const derivedKey = (await scryptAsync(data.password, salt, 64)) as Buffer;
      data.password = `${derivedKey.toString('hex')}.${salt}`;
    }

    // Convert empty phone_number to null
    if (data.phone_number === '') {
      data.phone_number = null;
    }

    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db
      .update(users)
      .set({ isHidden: true })
      .where(eq(users.id, id));
  }

  // Branch operations
  async createBranch(data: Partial<Branch>): Promise<Branch> {
    if (!data.name) {
      throw new Error("Branch name is required");
    }

    const [branch] = await db.insert(branches).values({
      name: data.name,
      address: data.address || null
    }).returning();
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
    if (!data.name) {
      throw new Error("Class name is required");
    }

    const [cls] = await db.insert(classes).values({
      name: data.name,
      branchId: data.branchId || null,
      englishLevel: data.englishLevel || null,
      ageGroup: data.ageGroup || null
    }).returning();
    return cls;
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, id));
    return cls;
  }

  async listClasses(branchId?: number): Promise<Class[]> {
    const baseQuery = db.select({
      id: classes.id,
      name: classes.name,
      branchId: classes.branchId,
      englishLevel: classes.englishLevel,
      ageGroup: classes.ageGroup,
      isHidden: classes.isHidden,
      branch: {
        id: branches.id,
        name: branches.name,
        address: branches.address,
        isHidden: branches.isHidden,
      },
    })
      .from(classes)
      .leftJoin(branches, eq(classes.branchId, branches.id));

    if (branchId) {
      return await baseQuery.where(eq(classes.branchId, branchId));
    }

    return await baseQuery;
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
    if (!data.title) {
      throw new Error("Assignment title is required");
    }

    const [assignment] = await db.insert(assignments).values({
      title: data.title,
      description: data.description || null,
      classId: data.classId || null,
      userId: data.userId || null,
      dueDate: data.dueDate || null,
      status: data.status || 'draft',
      isHidden: data.isHidden || false
    }).returning();
    return assignment;
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  }

  async listAssignments(classId?: number, status?: string): Promise<Assignment[]> {
    const baseQuery = db.select().from(assignments).where(eq(assignments.isHidden, false));

    // Build the where conditions
    const conditions = [eq(assignments.isHidden, false)];

    if (classId) {
      conditions.push(eq(assignments.classId, classId));
    }

    if (status) {
      conditions.push(eq(assignments.status, status));
    }

    // Apply conditions
    return await baseQuery.where(and(...conditions));
  }

  async updateAssignment(id: number, data: Partial<Assignment>): Promise<Assignment | undefined> {
    const [assignment] = await db
      .update(assignments)
      .set(data)
      .where(eq(assignments.id, id))
      .returning();
    return assignment;
  }

  async deleteAssignment(id: number): Promise<void> {
    await db
      .update(assignments)
      .set({ isHidden: true })
      .where(eq(assignments.id, id));
  }

  // List all submissions with optional status filter
  async listAllSubmissions(status?: string): Promise<Submission[]> {
    const baseQuery = db.select().from(submissions);
    if (status) {
      return await baseQuery.where(eq(submissions.status, status));
    }
    return await baseQuery;
  }

  // Submission operations
  async createSubmission(data: Partial<Submission>): Promise<Submission> {
    if (!data.imageUrl) {
      throw new Error("Submission image URL is required");
    }

    const [submission] = await db.insert(submissions).values({
      imageUrl: data.imageUrl,
      assignmentId: data.assignmentId || null,
      studentId: data.studentId || null,
      status: data.status || 'pending',
      ocrText: data.ocrText || null,
      correctedText: data.correctedText || null,
      overallAssessment: data.overallAssessment || null,
      teacherFeedback: data.teacherFeedback || null
    }).returning();
    return submission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async listSubmissions(assignmentId: number): Promise<Submission[]> {
    return await db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId));
  }

  // List submissions for a specific student
  async listUserSubmissions(studentId: number): Promise<Submission[]> {
    console.log("Listing submissions for student:", studentId);
    return await db.select().from(submissions).where(eq(submissions.studentId, studentId));
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

  async deleteSubmission(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // First delete all comments associated with this submission
      await tx.delete(comments).where(eq(comments.submissionId, id));

      // Then delete the submission itself
      await tx.delete(submissions).where(eq(submissions.id, id));
    });
  }

  // Comment operations
  async createComment(data: Partial<Comment>): Promise<Comment> {
    if (!data.content) {
      throw new Error("Comment content is required");
    }

    const [comment] = await db.insert(comments).values({
      content: data.content,
      submissionId: data.submissionId || null,
      userId: data.userId || null,
      createdAt: data.createdAt || new Date()
    }).returning();
    return comment;
  }

  async listComments(submissionId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.submissionId, submissionId))
      .orderBy(comments.createdAt);
  }

  async listCommentsWithUsers(submissionId: number): Promise<(Comment & { user: Partial<User> })[]> {
    const result = await db
      .select({
        id: comments.id,
        submissionId: comments.submissionId,
        userId: comments.userId,
        content: comments.content,
        createdAt: comments.createdAt,
        user: {
          id: users.id,
          name: users.name,
          role: users.role,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.submissionId, submissionId))
      .orderBy(comments.createdAt);

    return result;
  }

  async getTeacherBranches(teacherId: number): Promise<Branch[]> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, teacherId),
        eq(users.isHidden, false)
      ));

    // If user is ADMIN, return all branches
    if (user?.role === UserRole.ADMIN) {
      return await db.select().from(branches);
    }

    if (!user || user.role !== UserRole.TEACHER) {
      throw new Error("Teacher not found");
    }

    const result = await db
      .select({
        id: branches.id,
        name: branches.name,
        address: branches.address,
        isHidden: branches.isHidden,
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
      .where(and(
        eq(users.id, teacherId),
        eq(users.isHidden, false)
      ));

    // If user is ADMIN, return all classes
    if (user?.role === UserRole.ADMIN) {
      return await db.select().from(classes);
    }

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
        isHidden: classes.isHidden,
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
  ): Promise<{ success: true }> {
    // Verify teacher exists and is a teacher
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, teacherId));

    if (!user || user.role !== UserRole.TEACHER) {
      throw new Error("Teacher not found");
    }

    await db.transaction(async (tx) => {
      // Delete existing class access records
      await tx
        .delete(teacherClassAccess)
        .where(eq(teacherClassAccess.teacherId, teacherId));

      // Insert new class access records if any exist
      if (classIds.length > 0) {
        await tx
          .insert(teacherClassAccess)
          .values(
            classIds.map(classId => ({
              teacherId,
              classId,
            }))
          );
      }
    });

    return { success: true };
  }

  // Lead Teacher operations
  async assignLeadTeacher(
    classId: number,
    teacherId: number
  ): Promise<ClassLeadTeacher> {
    // Verify the teacher has access to the class
    const [access] = await db
      .select()
      .from(teacherClassAccess)
      .where(
        and(
          eq(teacherClassAccess.classId, classId),
          eq(teacherClassAccess.teacherId, teacherId)
        )
      );

    if (!access) {
      throw new Error("Teacher does not have access to this class");
    }

    // Create lead teacher assignment
    const [leadTeacher] = await db
      .insert(classLeadTeachers)
      .values({
        classId,
        teacherId,
      })
      .returning();

    return leadTeacher;
  }

  async removeLeadTeacher(classId: number, teacherId: number): Promise<void> {
    await db
      .delete(classLeadTeachers)
      .where(
        and(
          eq(classLeadTeachers.classId, classId),
          eq(classLeadTeachers.teacherId, teacherId)
        )
      );
  }

  async getClassLeadTeachers(classId: number): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        branchId: users.branchId,
        phone_number: users.phone_number,
        birth_date: users.birth_date,
        password: users.password
      })
      .from(users)
      .innerJoin(
        classLeadTeachers,
        and(
          eq(classLeadTeachers.teacherId, users.id),
          eq(classLeadTeachers.classId, classId)
        )
      );

    return result;
  }

  async isLeadTeacher(classId: number, teacherId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(classLeadTeachers)
      .where(
        and(
          eq(classLeadTeachers.classId, classId),
          eq(classLeadTeachers.teacherId, teacherId)
        )
      );

    return !!result;
  }

  async assignStudentToClass(classId: number, studentId: number): Promise<void> {
    try {
      // First verify the class exists
      const [cls] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, classId));

      if (!cls) throw new Error("Class not found");

      // Then verify the student exists and is actually a student
      const [student] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, studentId),
          eq(users.role, UserRole.STUDENT)
        ));

      if (!student) throw new Error("Student not found");

      // Then create the relationship
      await db
        .insert(studentClassAccess)
        .values({
          studentId,
          classId,
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error("Error in assignStudentToClass:", error);
      throw error;
    }
  }

  async removeStudentFromClass(classId: number, studentId: number): Promise<void> {
    try {
      await db
        .delete(studentClassAccess)
        .where(
          and(
            eq(studentClassAccess.classId, classId),
            eq(studentClassAccess.studentId, studentId)
          )
        );
    } catch (error) {
      console.error("Error in removeStudentFromClass:", error);
      throw error;
    }
  }

  async getClassStudents(classId: number): Promise<User[]> {
    try {
      const students = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          branchId: users.branchId,
          password: users.password,
          phone_number: users.phone_number,
          birth_date: users.birth_date
        })
        .from(users)
        .innerJoin(
          studentClassAccess,
          and(
            eq(studentClassAccess.studentId, users.id),
            eq(studentClassAccess.classId, classId)
          )
        )
        .where(
          and(
            eq(users.role, UserRole.STUDENT),
            eq(users.isHidden, false) // Add filter for hidden users
          )
        );

      return students;
    } catch (error) {
      console.error("Error in getClassStudents:", error);
      throw error;
    }
  }

  async updateTeacherClassRole(
    classId: number,
    teacherId: number,
    { isLead, hasAccess }: { isLead: boolean; hasAccess: boolean }
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Handle lead teacher status
      if (isLead) {
        await tx
          .insert(classLeadTeachers)
          .values({ classId, teacherId })
          .onConflictDoNothing();
      } else {
        await tx
          .delete(classLeadTeachers)
          .where(
            and(
              eq(classLeadTeachers.classId, classId),
              eq(classLeadTeachers.teacherId, teacherId)
            )
          );
      }

      // Handle access status
      if (hasAccess) {
        await tx
          .insert(teacherClassAccess)
          .values({ classId, teacherId })
          .onConflictDoNothing();
      } else {
        await tx
          .delete(teacherClassAccess)
          .where(
            and(
              eq(teacherClassAccess.classId, classId),
              eq(teacherClassAccess.teacherId, teacherId)
            )
          );
      }
    });
  }

  async removeTeacherFromClass(classId: number, teacherId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove from lead teachers
      await tx
        .delete(classLeadTeachers)
        .where(
          and(
            eq(classLeadTeachers.classId, classId),
            eq(classLeadTeachers.teacherId, teacherId)
          )
        );

      // Remove from class access
      await tx
        .delete(teacherClassAccess)
        .where(
          and(
            eq(teacherClassAccess.classId, classId),
            eq(teacherClassAccess.teacherId, teacherId)
          )
        );
    });
  }

  async getClassTeachers(classId: number): Promise<(User & { isLead: boolean; hasAccess: boolean; })[]> {
    const teachers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        branchId: users.branchId,
        password: users.password,
        phone_number: users.phone_number,
        birth_date: users.birth_date,
        isHidden: users.isHidden
      })
      .from(users)
      .where(and(
        eq(users.role, UserRole.TEACHER),
        eq(users.isHidden, false)
      ));

    const leadTeachers = await db
      .select()
      .from(classLeadTeachers)
      .where(eq(classLeadTeachers.classId, classId));

    const teachersWithAccess = await db
      .select()
      .from(teacherClassAccess)
      .where(eq(teacherClassAccess.classId, classId));

    return teachers.map(teacher => ({
      ...teacher,
      isLead: leadTeachers.some(lt => lt.teacherId === teacher.id),
      hasAccess: teachersWithAccess.some(ta => ta.teacherId === teacher.id),
    }));
  }

  // English Level operations
  async createEnglishLevel(data: { name: string; description?: string }): Promise<EnglishLevel> {
    const [level] = await db
      .insert(englishLevels)
      .values({
        name: data.name,
        description: data.description || null,
      })
      .returning();
    return level;
  }

  async listEnglishLevels(): Promise<EnglishLevel[]> {
    return await db.select().from(englishLevels);
  }

  async deleteEnglishLevel(id: number): Promise<void> {
    await db.delete(englishLevels).where(eq(englishLevels.id, id));
  }

  // Age Group operations
  async createAgeGroup(data: { name: string; description?: string }): Promise<AgeGroup> {
    const [group] = await db
      .insert(ageGroups)
      .values({
        name: data.name,
        description: data.description || null,
      })
      .returning();
    return group;
  }

  async listAgeGroups(): Promise<AgeGroup[]> {
    return await db.select().from(ageGroups);
  }

  async deleteAgeGroup(id: number): Promise<void> {
    await db.delete(ageGroups).where(eq(ageGroups.id, id));
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      if (!user.password) return false;

      // Check if password has salt (contains a period)
      if (user.password.includes('.')) {
        const [hashedPassword, salt] = user.password.split('.');
        const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
        return timingSafeEqual(
          Buffer.from(hashedPassword, 'hex'),
          derivedKey
        );
      } else {
        // For backward compatibility with unhashed passwords
        return user.password === password;
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const salt = randomBytes(16).toString('hex');
      const derivedKey = await scryptAsync(newPassword, salt, 64) as Buffer;
      const hashedPassword = `${derivedKey.toString('hex')}.${salt}`;

      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      console.error("Error updating password:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();