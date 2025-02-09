import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { extractTextFromImage, generateFeedback } from "./openai";
import multer from "multer";
import { UserRole, classes } from "@shared/schema";
import { eq } from 'drizzle-orm';
import { db } from './db';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    if (!roles.includes(req.user.role as UserRole)) {
      return res.sendStatus(403);
    }
    next();
  };
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Branch routes
  app.get("/api/branches", requireRole([UserRole.ADMIN]), async (req, res) => {
    const branches = await storage.listBranches();
    res.json(branches);
  });

  app.post("/api/branches", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const branch = await storage.createBranch(req.body);
      res.status(201).json(branch);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/branches/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid branch ID" });
    }

    try {
      const branch = await storage.getBranch(id);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ message: "Failed to fetch branch" });
    }
  });

  app.put("/api/branches/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const branch = await storage.updateBranch(Number(req.params.id), req.body);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.delete("/api/branches/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.deleteBranch(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  // Class routes
  app.get("/api/classes", requireRole([UserRole.ADMIN, UserRole.TEACHER]), async (req, res) => {
    const { branchId } = req.query;
    const classes = await storage.listClasses(branchId ? Number(branchId) : undefined);
    res.json(classes);
  });

  app.post("/api/classes", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const cls = await storage.createClass(req.body);
      res.status(201).json(cls);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.put("/api/classes/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const cls = await storage.updateClass(Number(req.params.id), req.body);
      res.json(cls);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.delete("/api/classes/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.deleteClass(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  // Add this route after the existing class routes
  app.get("/api/classes/:id", requireRole([UserRole.ADMIN, UserRole.TEACHER]), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid class ID" });
    }

    try {
      const classData = await storage.getClass(id);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      res.json(classData);
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  // Add these routes for class-specific teacher and student data
  app.get("/api/classes/:id/teachers", requireRole([UserRole.ADMIN, UserRole.TEACHER]), async (req, res) => {
    try {
      const teachers = await storage.getClassTeachers(Number(req.params.id));
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching class teachers:", error);
      res.status(500).json({ message: `Failed to fetch class teachers: ${error.message}` });
    }
  });

  app.get("/api/classes/:id/students", requireRole([UserRole.ADMIN, UserRole.TEACHER]), async (req, res) => {
    try {
      const students = await storage.getClassStudents(Number(req.params.id));
      res.json(students);
    } catch (error) {
      console.error("Error fetching class students:", error);
      res.status(500).json({ message: `Failed to fetch class students: ${error.message}` });
    }
  });

  app.put("/api/classes/:id/students/:studentId", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.assignStudentToClass(
        Number(req.params.id),
        Number(req.params.studentId)
      );
      res.json({ message: "Student added to class successfully" });
    } catch (error) {
      console.error("Error adding student to class:", error);
      res.status(500).json({ message: `Failed to add student: ${error.message}` });
    }
  });

  app.delete("/api/classes/:id/students/:studentId", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.removeStudentFromClass(
        Number(req.params.id),
        Number(req.params.studentId)
      );
      res.status(204).send();
    } catch (error) {
      console.error("Error removing student from class:", error);
      res.status(500).json({ message: `Failed to remove student: ${error.message}` });
    }
  });


  // Add these routes after the existing class routes
  app.put("/api/classes/:id/teachers/:teacherId", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { isLead, hasAccess } = req.body;
      await storage.updateTeacherClassRole(
        Number(req.params.id),
        Number(req.params.teacherId),
        { isLead, hasAccess }
      );
      res.json({ message: "Teacher role updated successfully" });
    } catch (error) {
      console.error("Error updating teacher role:", error);
      res.status(500).json({ message: `Failed to update teacher role: ${error.message}` });
    }
  });

  app.delete("/api/classes/:id/teachers/:teacherId", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.removeTeacherFromClass(
        Number(req.params.id),
        Number(req.params.teacherId)
      );
      res.status(204).send();
    } catch (error) {
      console.error("Error removing teacher from class:", error);
      res.status(500).json({ message: `Failed to remove teacher: ${error.message}` });
    }
  });

  // Assignment routes
  app.post("/api/assignments", requireRole([UserRole.ADMIN, UserRole.TEACHER]), async (req, res) => {
    const assignment = await storage.createAssignment({
      ...req.body,
      userId: req.user?.id
    });
    res.status(201).json(assignment);
  });

  app.get("/api/assignments", async (req, res) => {
    const { classId, branchId } = req.query;
    let assignments = await storage.listAssignments(classId ? Number(classId) : undefined);

    // If branchId is provided, filter assignments by branch
    if (branchId && branchId !== 'all') {
      const filteredAssignments = [];
      for (const assignment of assignments) {
        if (!assignment.classId) continue;

        const [assignmentClass] = await db
          .select()
          .from(classes)
          .where(eq(classes.id, assignment.classId));

        if (assignmentClass && assignmentClass.branchId === Number(branchId)) {
          filteredAssignments.push(assignment);
        }
      }
      assignments = filteredAssignments;
    }

    res.json(assignments);
  });

  // Submission routes
  app.post("/api/submissions/upload",
    requireRole([UserRole.TEACHER]),
    upload.array("files"),
    async (req, res) => {
      try {
        const files = req.files as Express.Multer.File[];
        const { assignmentId, studentId } = req.body;

        const results = await Promise.all(
          files.map(async (file) => {
            const base64Image = file.buffer.toString("base64");
            const { text, feedback } = await extractTextFromImage(base64Image);

            const submission = await storage.createSubmission({
              assignmentId: Number(assignmentId),
              studentId: Number(studentId),
              imageUrl: `data:${file.mimetype};base64,${base64Image}`,
              ocrText: text,
              aiFeedback: feedback,
              status: "pending"
            });

            return submission;
          })
        );

        res.status(201).json(results);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    }
  );

  app.patch("/api/submissions/:id", requireRole([UserRole.TEACHER]), async (req, res) => {
    try {
      const submission = await storage.updateSubmission(Number(req.params.id), req.body);
      res.json(submission);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.get("/api/submissions", async (req, res) => {
    const { assignmentId } = req.query;
    if (!assignmentId) {
      return res.status(400).json({ message: "assignmentId is required" });
    }
    const submissions = await storage.listSubmissions(Number(assignmentId));
    res.json(submissions);
  });

  // Comment routes
  app.post("/api/comments", async (req, res) => {
    try {
      const comment = await storage.createComment({
        ...req.body,
        userId: req.user?.id
      });
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.get("/api/comments/:submissionId", async (req, res) => {
    const comments = await storage.listComments(Number(req.params.submissionId));
    res.json(comments);
  });

  // Teacher routes
  app.get("/api/teachers", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const users = await storage.listUsers();
      const teachers = users.filter(user => user.role === UserRole.TEACHER);
      res.json(teachers);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.post("/api/teachers", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const teacher = await storage.createUser({
        ...req.body,
        role: UserRole.TEACHER,
      });
      res.status(201).json(teacher);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.put("/api/teachers/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const teacher = await storage.updateUser(Number(req.params.id), {
        ...req.body,
        role: UserRole.TEACHER,
      });
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      res.json(teacher);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.delete("/api/teachers/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.deleteUser(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  // Add these routes after the existing teacher routes
  app.get("/api/teachers/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const teacher = await storage.getUser(Number(req.params.id));
      if (!teacher || teacher.role !== UserRole.TEACHER) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      res.json(teacher);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.get("/api/teachers/:id/branches", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const branches = await storage.getTeacherBranches(Number(req.params.id));
      res.json(branches);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.get("/api/teachers/:id/classes", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const classes = await storage.getTeacherClasses(Number(req.params.id));
      res.json(classes);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.put("/api/teachers/:id/authority", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { branchIds, classIds } = req.body;
      await storage.updateTeacherAuthority(Number(req.params.id), branchIds, classIds);
      res.json({ message: "Authority updated successfully" });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  // Add these routes after the existing teacher routes
  // Update the students route to handle branch filtering
  app.get("/api/students", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { branchId } = req.query;
      const users = await storage.listUsers();
      const students = users.filter(user =>
        user.role === UserRole.STUDENT &&
        (!branchId || user.branchId === Number(branchId))
      );
      res.json(students);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.post("/api/students", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const createData = { ...req.body };

      // Convert branch_id to branchId if it exists
      if (createData.branch_id) {
        createData.branchId = Number(createData.branch_id);
        delete createData.branch_id;
      }

      const student = await storage.createUser({
        ...createData,
        role: UserRole.STUDENT,
      });
      res.status(201).json(student);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.put("/api/students/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      console.log("Received update request body:", req.body);

      // If password is empty string or undefined, remove it from the request body
      const updateData = { ...req.body };
      if (!updateData.password) {
        delete updateData.password;
      }

      // Convert branch_id to number if it exists
      if (updateData.branch_id) {
        updateData.branchId = Number(updateData.branch_id);
        delete updateData.branch_id;
      }

      const student = await storage.updateUser(Number(req.params.id), {
        ...updateData,
        role: UserRole.STUDENT,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.delete("/api/students/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.deleteUser(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}