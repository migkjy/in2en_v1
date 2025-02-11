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
    // Filter out hidden branches
    const visibleBranches = branches.filter(branch => !branch.isHidden);
    res.json(visibleBranches);
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
      const branchId = Number(req.params.id);

      // Get all classes in this branch
      const classes = await storage.listClasses(branchId);

      // Hide all classes in this branch
      for (const cls of classes) {
        await storage.updateClass(cls.id, { isHidden: true });
      }

      // Hide the branch instead of deleting it
      await storage.updateBranch(branchId, { isHidden: true });
      res.status(204).send();
    } catch (error) {
      console.error("Error hiding branch:", error);
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
    try {
      const classes = await storage.listClasses(branchId ? Number(branchId) : undefined);

      // Filter out hidden classes
      const visibleClasses = classes.filter(cls => !cls.isHidden);

      // Get counts for each class
      const classesWithCounts = await Promise.all(
        visibleClasses.map(async (cls) => {
          const [students, teachers] = await Promise.all([
            storage.getClassStudents(cls.id),
            storage.getClassTeachers(cls.id)
          ]);

          return {
            ...cls,
            studentCount: students.length,
            teacherCount: teachers.filter(t => t.hasAccess).length
          };
        })
      );

      res.json(classesWithCounts);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
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
      const classId = Number(req.params.id);

      // Remove all students from the class
      const students = await storage.getClassStudents(classId);
      for (const student of students) {
        await storage.removeStudentFromClass(classId, student.id);
      }

      // Remove all teachers from the class
      const teachers = await storage.getClassTeachers(classId);
      for (const teacher of teachers) {
        await storage.removeTeacherFromClass(classId, teacher.id);
      }

      // Hide the class instead of deleting it
      await storage.updateClass(classId, { isHidden: true });
      res.status(204).send();
    } catch (error) {
      console.error("Error hiding class:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  // Add this route before the existing class routes
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
    try {
      const assignment = await storage.createAssignment({
        ...req.body,
        userId: req.user?.id
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.get("/api/assignments", async (req, res) => {
    try {
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
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/assignments/:id", requireRole([UserRole.ADMIN, UserRole.TEACHER]), async (req, res) => {
    try {
      const assignment = await storage.getAssignment(Number(req.params.id));
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  app.put("/api/assignments/:id", requireRole([UserRole.ADMIN, UserRole.TEACHER]), async (req, res) => {
    try {
      const assignment = await storage.updateAssignment(Number(req.params.id), req.body);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  app.delete("/api/assignments/:id", requireRole([UserRole.ADMIN, UserRole.TEACHER]), async (req, res) => {
    try {
      await storage.deleteAssignment(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Submission routes
  // Add this route before the existing submission routes
  app.get("/api/submissions/:id", requireRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          message: "Invalid submission ID"
        });
      }

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({
          message: "Submission not found"
        });
      }

      // Check if the user has permission to view this submission
      if (req.user.role === UserRole.STUDENT && submission.studentId !== req.user.id) {
        return res.status(403).json({
          message: "You don't have permission to view this submission"
        });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({
        message: "Internal server error while fetching submission"
      });
    }
  });
  app.post("/api/submissions/upload",
    requireRole([UserRole.TEACHER, UserRole.STUDENT, UserRole.ADMIN]),
    upload.single("file"),
    async (req, res) => {
      try {
        const file = req.file;
        const { assignmentId, studentId } = req.body;

        if (!file) {
          console.error("No file in request:", req.files, req.file, req.body);
          return res.status(400).json({ message: "No file uploaded" });
        }

        if (!assignmentId || !studentId) {
          return res.status(400).json({
            message: "Missing required fields",
            details: { assignmentId: !!assignmentId, studentId: !!studentId }
          });
        }

        console.log("Processing file upload:", {
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          assignmentId,
          studentId
        });

        const base64Image = file.buffer.toString("base64");

        // Save submission without OCR and AI feedback initially
        const submission = await storage.createSubmission({
          assignmentId: Number(assignmentId),
          studentId: Number(studentId),
          imageUrl: `data:${file.mimetype};base64,${base64Image}`,
          status: "uploaded"
        });

        console.log("Submission created successfully:", submission.id);
        res.status(201).json(submission);
      } catch (error) {
        console.error("Error processing submission:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    }
  );

  // Add new route for AI review
  app.post("/api/submissions/:assignmentId/review",
    requireRole([UserRole.TEACHER, UserRole.ADMIN]),
    async (req, res) => {
      try {
        const assignmentId = Number(req.params.assignmentId);
        const submissions = await storage.listSubmissions(assignmentId);

        // Only process submissions with 'uploaded' status
        const pendingSubmissions = submissions.filter(s => s.status === "uploaded");

        for (const submission of pendingSubmissions) {
          try {
            // Update status to processing
            await storage.updateSubmission(submission.id, {
              status: "processing"
            });

            // Extract base64 image from data URL
            const base64Image = submission.imageUrl.split(',')[1];

            console.log(`Processing submission ${submission.id}...`);

            // Process with OpenAI
            console.log("Extracting text from image for submission:", submission.id);
            const { text, feedback } = await extractTextFromImage(base64Image);
            console.log("Extracted text:", { text, feedback });

            console.log(`OCR Results for submission ${submission.id}:`, { text, feedback });

            if (!text && !feedback) {
              throw new Error("Failed to extract text and generate feedback");
            }

            // Update submission with results
            await storage.updateSubmission(submission.id, {
              ocrText: text || null,
              aiFeedback: feedback || null,
              status: "ai-reviewed"
            });

            console.log(`Successfully processed submission ${submission.id}`);
          } catch (error) {
            console.error(`Error processing submission ${submission.id}:`, error);
            await storage.updateSubmission(submission.id, {
              status: "failed",
              aiFeedback: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        res.json({
          message: "AI review process completed",
          processed: pendingSubmissions.length
        });
      } catch (error) {
        console.error("Error in AI review process:", error);
        res.status(500).json({ message: "Failed to process AI review" });
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
    const { assignmentId, status } = req.query;

    try {
      // Validate parameters
      if (assignmentId) {
        const id = parseInt(assignmentId as string, 10);
        if (isNaN(id)) {
          return res.status(400).json({
            message: "Invalid assignmentId parameter"
          });
        }
        const submissions = await storage.listSubmissions(id);
        return res.json(submissions);
      }

      if (status) {
        if (typeof status !== 'string') {
          return res.status(400).json({
            message: "Invalid status parameter"
          });
        }
        const submissions = await storage.listAllSubmissions(status);
        return res.json(submissions);
      }

      return res.status(400).json({
        message: "Either assignmentId or status parameter is required"
      });
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({
        message: "Internal server error while fetching submissions"
      });
    }
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


  // English Level routes
  app.get("/api/english-levels", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const levels = await storage.listEnglishLevels();
      res.json(levels);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.post("/api/english-levels", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const level = await storage.createEnglishLevel(req.body);
      res.json(level);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.delete("/api/english-levels/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.deleteEnglishLevel(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  // Age Group routes
  app.get("/api/age-groups", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const groups = await storage.listAgeGroups();
      res.json(groups);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.post("/api/age-groups", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const group = await storage.createAgeGroup(req.body);
      res.json(group);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.delete("/api/age-groups/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.deleteAgeGroup(Number(req.params.id));
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