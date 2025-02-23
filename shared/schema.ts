import { pgTable, text, serial, integer, timestamp, varchar, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from 'drizzle-orm';

// Session table for connect-pg-simple
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export enum UserRole {
  ADMIN = "ADMIN",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT"
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  password: varchar("password", { length: 256 }).notNull(),
  role: text("role", { enum: ["ADMIN", "TEACHER", "STUDENT"] }).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  phone_number: varchar("phone_number", { length: 20 }),
  birth_date: varchar("birth_date", { length: 20 }),
});

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  address: text("address"),
  isHidden: boolean("is_hidden").notNull().default(false),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  englishLevel: varchar("english_level", { length: 50 }),
  ageGroup: varchar("age_group", { length: 50 }),
  isHidden: boolean("is_hidden").notNull().default(false),
});

export const teacherBranchAccess = pgTable("teacher_branch_access", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  branchId: integer("branch_id").notNull().references(() => branches.id),
});

export const teacherClassAccess = pgTable("teacher_class_access", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  classId: integer("class_id").notNull().references(() => classes.id),
});

// Lead Teachers table 수정
export const classLeadTeachers = pgTable("class_lead_teachers", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  classId: integer("class_id").references(() => classes.id),
  userId: integer("user_id").references(() => users.id),
  dueDate: timestamp("due_date", { mode: 'string' }),
  status: varchar("status", { length: 50 }).default("draft"),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => assignments.id),
  studentId: integer("student_id").references(() => users.id),
  imageUrl: text("image_url").notNull(),
  ocrText: text("ocr_text"),
  correctedText: text("corrected_text"),
  overallAssessment: text("overall_assessment"),
  teacherFeedback: text("teacher_feedback"),
  status: varchar("status", { length: 50 }).default("uploaded"),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => submissions.id),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const englishLevels = pgTable("english_levels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
});

export const ageGroups = pgTable("age_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
});

// Relations
export const teacherClassAccessRelations = relations(teacherClassAccess, ({ one }) => ({
  teacher: one(users, {
    fields: [teacherClassAccess.teacherId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [teacherClassAccess.classId],
    references: [classes.id],
  }),
}));

// Relations 수정
export const classLeadTeachersRelations = relations(classLeadTeachers, ({ one }) => ({
  teacher: one(users, {
    fields: [classLeadTeachers.teacherId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [classLeadTeachers.classId],
    references: [classes.id],
  }),
}));

// Add student class access table
export const studentClassAccess = pgTable("student_class_access", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  classId: integer("class_id").notNull().references(() => classes.id),
});

// Add relations for student class access
export const studentClassAccessRelations = relations(studentClassAccess, ({ one }) => ({
  student: one(users, {
    fields: [studentClassAccess.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [studentClassAccess.classId],
    references: [classes.id],
  }),
}));

// Update classes table relations
export const classesRelations = relations(classes, ({ one }) => ({
  branch: one(branches, {
    fields: [classes.branchId],
    references: [branches.id],
  }),
  englishLevel: one(englishLevels, {
    fields: [classes.englishLevel],
    references: [englishLevels.name],
  }),
  ageGroup: one(ageGroups, {
    fields: [classes.ageGroup],
    references: [ageGroups.name],
  }),
}));


// Schema definitions
export const insertUserSchema = createInsertSchema(users);
export const insertBranchSchema = createInsertSchema(branches);
export const insertClassSchema = createInsertSchema(classes);
export const insertAssignmentSchema = createInsertSchema(assignments);
export const insertSubmissionSchema = createInsertSchema(submissions);
export const insertCommentSchema = createInsertSchema(comments);
export const insertTeacherBranchAccessSchema = createInsertSchema(teacherBranchAccess);
export const insertTeacherClassAccessSchema = createInsertSchema(teacherClassAccess);
export const insertClassLeadTeacherSchema = createInsertSchema(classLeadTeachers);
export const insertStudentClassAccessSchema = createInsertSchema(studentClassAccess);
export const insertEnglishLevelSchema = createInsertSchema(englishLevels);
export const insertAgeGroupSchema = createInsertSchema(ageGroups);

// Type definitions
export type User = typeof users.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type TeacherBranchAccess = typeof teacherBranchAccess.$inferSelect;
export type TeacherClassAccess = typeof teacherClassAccess.$inferSelect;
export type ClassLeadTeacher = typeof classLeadTeachers.$inferSelect;
export type StudentClassAccess = typeof studentClassAccess.$inferSelect;
export type EnglishLevel = typeof englishLevels.$inferSelect;
export type AgeGroup = typeof ageGroups.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertTeacherBranchAccess = z.infer<typeof insertTeacherBranchAccessSchema>;
export type InsertTeacherClassAccess = z.infer<typeof insertTeacherClassAccessSchema>;
export type InsertClassLeadTeacher = z.infer<typeof insertClassLeadTeacherSchema>;
export type InsertStudentClassAccess = z.infer<typeof insertStudentClassAccessSchema>;
export type InsertEnglishLevel = z.infer<typeof insertEnglishLevelSchema>;
export type InsertAgeGroup = z.infer<typeof insertAgeGroupSchema>;