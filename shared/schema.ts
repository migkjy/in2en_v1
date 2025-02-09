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
  branch_id: integer("branch_id").references(() => branches.id),
  phone_number: varchar("phone_number", { length: 20 }),
  birth_date: varchar("birth_date", { length: 20 }),
});

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  address: text("address"),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  englishLevel: varchar("english_level", { length: 50 }),
  ageGroup: varchar("age_group", { length: 50 }),
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

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  classId: integer("class_id").references(() => classes.id),
  teacherId: integer("teacher_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 50 }).default("draft"),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => assignments.id),
  studentId: integer("student_id").references(() => users.id),
  imageUrl: text("image_url").notNull(),
  ocrText: text("ocr_text"),
  aiFeedback: text("ai_feedback"),
  teacherFeedback: text("teacher_feedback"),
  status: varchar("status", { length: 50 }).default("pending"),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => submissions.id),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertBranchSchema = createInsertSchema(branches);
export const insertClassSchema = createInsertSchema(classes);
export const insertAssignmentSchema = createInsertSchema(assignments);
export const insertSubmissionSchema = createInsertSchema(submissions);
export const insertCommentSchema = createInsertSchema(comments);
export const insertTeacherBranchAccessSchema = createInsertSchema(teacherBranchAccess);
export const insertTeacherClassAccessSchema = createInsertSchema(teacherClassAccess);

export type User = typeof users.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type TeacherBranchAccess = typeof teacherBranchAccess.$inferSelect;
export type TeacherClassAccess = typeof teacherClassAccess.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;