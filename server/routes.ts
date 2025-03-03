import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { extractTextFromImage, generateFeedback } from "./openai";
import multer from "multer";
import { UserRole, classes, submissions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Extend Express Request type to include user properties
declare global {
  namespace Express {
    interface User {
      id: number;
      role: UserRole;
    }
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.sendStatus(401);
    }
    if (!roles.includes(req.user.role)) {
      return res.sendStatus(403);
    }
    next();
  };
}

// Processing submission with AI review
export async function processSubmissionWithAI(submissionId: number) {
  try {
    const submission = await storage.getSubmission(submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    // Update status to processing
    await storage.updateSubmission(submission.id, {
      status: "processing",
    });

    // Extract base64 image from data URL
    const base64Image = submission.imageUrl.split(",")[1];
    console.log(`Processing submission ${submission.id}...`);

    // Process with OpenAI
    console.log("Extracting text from image for submission:", submission.id);
    const { text, confidence } = await extractTextFromImage(base64Image);
    console.log("Extracted text:", { text });

    if (!text) {
      throw new Error("Failed to extract text from image");
    }

    // Get student and class info for feedback generation
    const assignment = await storage.getAssignment(submission.assignmentId!);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classInfo = await storage.getClass(assignment.classId!);
    if (!classInfo) {
      throw new Error("Class not found");
    }

    // Generate AI feedback using the extracted text
    console.log("Generating feedback for submission:", submission.id);
    const feedback = await generateFeedback(
      text,
      classInfo.englishLevel,
      classInfo.ageGroup,
    );
    console.log("Generated feedback:", feedback);

    // Update submission with results
    await storage.updateSubmission(submission.id, {
      ocrText: text,
      correctedText: feedback.correctedText,
      overallAssessment: feedback.overallAssessment,
      status: "ai-reviewed",
    });

    console.log(`Successfully processed submission ${submission.id}`);
    return submission.id;
  } catch (error) {
    console.error("Error in processSubmissionWithAI:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const newStatus = errorMessage.includes("timeout") ? "uploaded" : "failed";
    await storage.updateSubmission(submissionId, {
      status: newStatus,
      correctedText: null,
      overallAssessment: errorMessage,
    });
    throw error;
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Branch routes
  app.get(
    "/api/branches",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      const branches = await storage.listBranches();
      // Filter out hidden branches
      const visibleBranches = branches.filter((branch) => !branch.isHidden);
      res.json(visibleBranches);
    },
  );

  app.post("/api/branches", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const branch = await storage.createBranch(req.body);
      res.status(201).json(branch);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.get(
    "/api/branches/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.put(
    "/api/branches/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
      try {
        const branch = await storage.updateBranch(
          Number(req.params.id),
          req.body,
        );
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
    },
  );

  app.delete(
    "/api/branches/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  // Class routes
  app.get(
    "/api/classes",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      const { branchId } = req.query;
      try {
        let classes;

        if (branchId && branchId !== "all") {
          classes = await storage.listClasses(Number(branchId));
        } else {
          classes = await storage.listClasses();
        }

        // Filter out hidden classes
        const visibleClasses = classes.filter((cls) => !cls.isHidden);

        // Get statistics for each class
        const classesWithStats = await Promise.all(
          visibleClasses.map(async (cls) => {
            const students = await storage.getClassStudents(cls.id);
            const teachers = await storage.getClassTeachers(cls.id);
            const accessibleTeachers = teachers.filter(
              (teacher) => teacher.hasAccess,
            );
            return {
              ...cls,
              studentCount: students.length,
              teacherCount: accessibleTeachers.length,
            };
          }),
        );

        // If user is a teacher, filter classes to only show accessible ones
        if (req.user?.role === UserRole.TEACHER) {
          const teacherClasses = await storage.getTeacherClasses(req.user.id);
          const accessibleClassIds = teacherClasses.map((tc) => tc.id);
          return res.json(
            classesWithStats.filter((cls) =>
              accessibleClassIds.includes(cls.id),
            ),
          );
        }

        res.json(classesWithStats);
      } catch (error) {
        console.error("Error fetching classes:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

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

  app.put(
    "/api/classes/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  app.delete(
    "/api/classes/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  // Add this route before the existing class routes
  app.get(
    "/api/classes/:id",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
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
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  // Add these routes for class-specific teacher and student data
  app.get(
    "/api/classes/:id/teachers",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      try {
        const teachers = await storage.getClassTeachers(Number(req.params.id));
        res.json(teachers);
      } catch (error) {
        console.error("Error fetching class teachers:", error);
        if (error instanceof Error) {
          res.status(500).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.get(
    "/api/classes/:id/students",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      try {
        const students = await storage.getClassStudents(Number(req.params.id));
        res.json(students);
      } catch (error) {
        console.error("Error fetching class students:", error);
        if (error instanceof Error) {
          res.status(500).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.put(
    "/api/classes/:id/students/:studentId",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      try {
        // Check if the teacher has access to this class
        if (req.user?.role === UserRole.TEACHER) {
          const teacherClasses = await storage.getTeacherClasses(req.user.id);
          const hasAccess = teacherClasses.some(
            (cls) => cls.id === Number(req.params.id),
          );
          if (!hasAccess) {
            return res
              .status(403)
              .json({
                message: "You don't have permission to modify this class",
              });
          }
        }

        await storage.assignStudentToClass(
          Number(req.params.id),
          Number(req.params.studentId),
        );
        res.json({ message: "Student added to class successfully" });
      } catch (error) {
        console.error("Error adding student to class:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.delete(
    "/api/classes/:id/students/:studentId",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      try {
        // Check if the teacher has access to this class
        if (req.user?.role === UserRole.TEACHER) {
          const teacherClasses = await storage.getTeacherClasses(req.user.id);
          const hasAccess = teacherClasses.some(
            (cls) => cls.id === Number(req.params.id),
          );
          if (!hasAccess) {
            return res
              .status(403)
              .json({
                message: "You don't have permission to modify this class",
              });
          }
        }

        await storage.removeStudentFromClass(
          Number(req.params.id),
          Number(req.params.studentId),
        );
        res.status(204).send();
      } catch (error) {
        console.error("Error removing student from class:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  // Add these routes after the existing class routes
  app.put(
    "/api/classes/:id/teachers/:teacherId",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
      try {
        const { isLead, hasAccess } = req.body;
        await storage.updateTeacherClassRole(
          Number(req.params.id),
          Number(req.params.teacherId),
          { isLead, hasAccess },
        );
        res.json({ message: "Teacher role updated successfully" });
      } catch (error) {
        console.error("Error updating teacher role:", error);
        if (error instanceof Error) {
          res.status(500).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.delete(
    "/api/classes/:id/teachers/:teacherId",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
      try {
        await storage.removeTeacherFromClass(
          Number(req.params.id),
          Number(req.params.teacherId),
        );
        res.status(204).send();
      } catch (error) {
        console.error("Error removing teacher from class:", error);
        if (error instanceof Error) {
          res.status(500).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  // Assignment routes
  app.post(
    "/api/assignments",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      try {
        const assignment = await storage.createAssignment({
          ...req.body,
          userId: req.user?.id,
        });
        res.status(201).json(assignment);
      } catch (error) {
        console.error("Error creating assignment:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  // Modify the existing GET /api/assignments route
  app.get("/api/assignments", async (req, res) => {
    try {
      const { classId, branchId, status, teacherId } = req.query;
      let assignments = await storage.listAssignments(
        classId ? Number(classId) : undefined,
        status as string | undefined,
      );

      // Get all classes for filtering
      const allClasses = await storage.listClasses();

      // If branchId is provided, filter assignments by branch
      if (branchId && branchId !== "all") {
        assignments = assignments.filter((assignment) => {
          if (!assignment.classId) return false;
          const [assignmentClass] = allClasses.filter(
            (c) => c.id === assignment.classId,
          );
          return (
            assignmentClass && assignmentClass.branchId === Number(branchId)
          );
        });
      }

      // If teacherId is provided, filter assignments by teacher's accessible classes
      if (teacherId) {
        const teacherClasses = await storage.getTeacherClasses(
          Number(teacherId),
        );
        const teacherClassIds = teacherClasses.map((c) => c.id);
        assignments = assignments.filter(
          (assignment) =>
            assignment.classId && teacherClassIds.includes(assignment.classId),
        );
      }

      // Sort assignments by id (most recent first)
      assignments.sort((a, b) => b.id - a.id);

      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.get("/api/assignments/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const assignment = await storage.getAssignment(Number(req.params.id));
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Check if user has permission to view this assignment
      if (req.user.role === UserRole.TEACHER) {
        const teacherClasses = await storage.getTeacherClasses(req.user.id);
        const hasAccess = teacherClasses.some(
          (cls) => cls.id === assignment.classId,
        );
        if (!hasAccess) {
          return res
            .status(403)
            .json({
              message: "You don't have permission to view this assignment",
            });
        }
      }

      // Get related data
      let classInfo = null;
      let branch = null;

      if (assignment.classId) {
        classInfo = await storage.getClass(assignment.classId);
        if (classInfo?.branchId) {
          branch = await storage.getBranch(classInfo.branchId);
        }
      }

      res.json({
        ...assignment,
        class: classInfo,
        branch: branch,
      });
    } catch (error) {
      console.error("Error fetching assignment:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.put(
    "/api/assignments/:id",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      try {
        const assignment = await storage.updateAssignment(
          Number(req.params.id),
          req.body,
        );
        if (!assignment) {
          return res.status(404).json({ message: "Assignment not found" });
        }
        res.json(assignment);
      } catch (error) {
        console.error("Error updating assignment:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.delete(
    "/api/assignments/:id",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      try {
        await storage.deleteAssignment(Number(req.params.id));
        res.status(204).send();
      } catch (error) {
        console.error("Error deleting assignment:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  // Submission routes
  app.get("/api/submissions/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          message: "Invalid submission ID",
        });
      }

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
        });
      }

      // Check if the user has permission to view this submission
      if (
        req.user.role === UserRole.STUDENT &&
        submission.studentId !== req.user.id
      ) {
        return res.status(403).json({
          message: "You don't have permission to view this submission",
        });
      }

      // Include related data
      const assignment = submission.assignmentId
        ? await storage.getAssignment(submission.assignmentId!)
        : null;
      const student = submission.studentId
        ? await storage.getUser(submission.studentId)
        : null;

      res.json({
        ...submission,
        assignment,
        student,
      });
    } catch (error) {
      console.error("Error fetching submission:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });
  app.post(
    "/api/submissions/upload",
    requireRole([UserRole.TEACHER, UserRole.STUDENT, UserRole.ADMIN]),
    upload.single("file"),
    async (req, res) => {
      try {
        const file = req.file;
        const { assignmentId, studentId } = req.body;

        console.log("Upload request received:", { assignmentId, studentId });

        if (!file) {
          console.error("No file in request:", req.files, req.file, req.body);
          return res.status(400).json({ message: "No file uploaded" });
        }

        if (!assignmentId || !studentId) {
          console.error("Missing required fields:", {
            assignmentId,
            studentId,
          });
          return res.status(400).json({
            message: "Missing required fields",
            details: { assignmentId: !!assignmentId, studentId: !!studentId },
          });
        }

        if (!assignmentId || !studentId) {
          return res.status(400).json({
            message: "Missing required fields",
            details: { assignmentId: !!assignmentId, studentId: !!studentId },
          });
        }

        console.log("Processing file upload:", {
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          assignmentId,
          studentId,
        });

        const base64Image = file.buffer.toString("base64");

        // Save submission without OCR and AI feedback initially
        const submission = await storage.createSubmission({
          assignmentId: Number(assignmentId),
          studentId: Number(studentId),
          imageUrl: `data:${file.mimetype};base64,${base64Image}`,
          status: "uploaded",
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
    },
  );

  // Rewrite the single submission reprocess route
  app.post(
    "/api/submissions/:id/reprocess",
    requireRole([UserRole.TEACHER, UserRole.ADMIN]),
    async (req, res) => {
      try {
        const submissionId = Number(req.params.id);
        await processSubmissionWithAI(submissionId);

        // Return the updated submission
        const updatedSubmission = await storage.getSubmission(submissionId);
        res.json(updatedSubmission);
      } catch (error) {
        console.error("Error in reprocessing:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  // Rewrite the /api/submissions/:assignmentId/review route
  app.post(
    "/api/submissions/:assignmentId/review",
    requireRole([UserRole.TEACHER, UserRole.ADMIN]),
    async (req, res) => {
      try {
        const assignmentId = Number(req.params.assignmentId);
        const submissions = await storage.listSubmissions(assignmentId);

        // Only process submissions with 'uploaded' status
        const pendingSubmissions = submissions.filter(
          (s) => s.status === "uploaded",
        );
        const processedIds = [];

        for (const submission of pendingSubmissions) {
          try {
            const processedId = await processSubmissionWithAI(submission.id);
            processedIds.push(processedId);
          } catch (error) {
            console.error(
              `Error processing submission ${submission.id}:`,
              error,
            );
            // Continue with other submissions even if one fails
          }
        }

        res.json({
          message: "AI review process completed",
          processed: processedIds.length,
        });
      } catch (error) {
        console.error("Error in AI review process:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.patch(
    "/api/submissions/:id",
    requireRole([UserRole.TEACHER, UserRole.ADMIN]),
    async (req, res) => {
      try {
        console.log("PATCH /api/submissions/:id - User:", {
          id: req.user?.id,
          role: req.user?.role,
        });
        console.log("Request body:", req.body);

        const submission = await storage.updateSubmission(
          Number(req.params.id),
          req.body,
        );
        res.json(submission);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.get("/api/submissions", async (req, res) => {
    const { assignmentId, status } = req.query;

    try {
      // Special case for students
      if (req.isAuthenticated() && req.user?.role === "STUDENT") {
        console.log("Listing submissions for student:", req.user.id);
        // Get all submissions for the authenticated student regardless of query params
        const studentSubmissions = await storage.listUserSubmissions(req.user.id);
        console.log(`Found ${studentSubmissions.length} submissions for student ${req.user.id}`);
        return res.json(studentSubmissions);
      }

      // For non-students or unauthenticated users, continue with normal flow
      if (assignmentId) {
        const id = parseInt(assignmentId as string, 10);
        if (isNaN(id)) {
          return res.status(400).json({
            message: "Invalid assignmentId parameter",
          });
        }
        const submissions = await storage.listSubmissions(id);
        return res.json(submissions);
      }

      if (status) {
        if (typeof status !== "string") {
          return res.status(400).json({
            message: "Invalid status parameter",
          });
        }
        
        const submissions = await storage.listAllSubmissions(status);
        return res.json(submissions);
      }

      return res.status(400).json({
        message: "Either assignmentId or status parameter is required",
      });
    } catch (error) {
      console.error("Error fetching submissions:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  // Comment routes
  app.post("/api/comments", upload.array("images"), async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { submissionId, content } = req.body;
      
      if (!submissionId) {
        return res.status(400).json({ message: "Submission ID is required" });
      }

      // Process uploaded images if any
      const imageUrls: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const base64Image = file.buffer.toString("base64");
          const imageUrl = `data:${file.mimetype};base64,${base64Image}`;
          imageUrls.push(imageUrl);
        }
      }

      // Create comment data
      const commentData = {
        submissionId: Number(submissionId),
        userId: req.user.id,
        content: content || "",
        imageUrls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
      };

      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.get("/api/comments/:submissionId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const submissionId = Number(req.params.submissionId);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      // Get the submission to check permissions
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Students can only view comments on their own submissions
      if (req.user.role === UserRole.STUDENT && submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get comments for this submission
      const comments = await storage.listComments(submissionId);
      
      // Get user details for each comment
      const commentsWithUserDetails = await Promise.all(
        comments.map(async (comment) => {
          const user = await storage.getUser(comment.userId!);
          return {
            ...comment,
            userName: user?.name || "Unknown User",
            userRole: user?.role || "UNKNOWN",
            imageUrls: comment.imageUrls ? JSON.parse(comment.imageUrls) : [],
          };
        })
      );

      res.json(commentsWithUserDetails);
    } catch (error) {
      console.error("Error fetching comments:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  // Teacher routes
  app.get("/api/teachers", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const users = await storage.listUsers();
      const teachers = users.filter((user) => user.role === UserRole.TEACHER);
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
    } catch(error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });

  app.put(
    "/api/teachers/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  app.delete(
    "/api/teachers/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  // Add these routes after the existing teacher routes
  // Update the students route to handle branch filtering
  app.get(
    "/api/teachers/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  app.get(
    "/api/teachers/:id/branches",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
      try {
        const branches = await storage.getTeacherBranches(
          Number(req.params.id),
        );
        res.json(branches);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  // Add after the existing GET /api/classes route
  app.get(
    "/api/teachers/:id/classes",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      try {
        const classes = await storage.getTeacherClasses(Number(req.params.id));
        res.json(classes);
      } catch (error) {
        console.error("Error fetching teacher classes:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.put(
    "/api/teachers/:id/authority",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
      try {
        const { branchIds, classIds } = req.body;
        await storage.updateTeacherAuthority(
          Number(req.params.id),
          branchIds,
          classIds,
        );
        res.json({ message: "Authority updated successfully" });
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  // Update the students route to handle branch filtering
  app.get(
    "/api/students",
    requireRole([UserRole.ADMIN, UserRole.TEACHER]),
    async (req, res) => {
      try {
        const { branchId } = req.query;
        const students = await storage.listUsers();
        const filteredStudents = students.filter(
          (user) => user.role === UserRole.STUDENT,
        );

        // If branchId is provided, filter students by branch
        if (branchId && branchId !== "all") {
          const branchStudents = await storage.getBranchStudents(
            Number(branchId),
          );
          return res.json(branchStudents);
        }

        res.json(filteredStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

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

  app.put(
    "/api/students/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
      try {
        console.log("Received update request body:", req.body);

        // If password is empty string or undefined, remove it from the request body
        const updateData = { ...req.body };
        
        // Handle password - validate if present
        if (updateData.password) {
          // Password validation
          if (updateData.password.length < 6) {
            return res.status(400).json({ 
              message: "Password must be at least 6 characters long" 
            });
          }
          
          // Hashing is now handled in the storage layer
        } else {
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
    },
  );

  app.delete(
    "/api/students/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  // English Level routes
  app.get(
    "/api/english-levels",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
      try {
        const levels = await storage.listEnglishLevels();
        res.json(levels);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ message: error.message.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.post(
    "/api/english-levels",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  app.delete(
    "/api/english-levels/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  // Age Group routes
  app.get(
    "/api/age-groups",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  app.post(
    "/api/age-groups",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  app.delete(
    "/api/age-groups/:id",
    requireRole([UserRole.ADMIN]),
    async (req, res) => {
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
    },
  );

  app.delete(
    "/api/submissions/:id",
    requireRole([UserRole.TEACHER, UserRole.ADMIN]),
    async (req, res) => {
      try {
        const submissionId = Number(req.params.id);
        if (isNaN(submissionId)) {
          return res.status(400).json({ message: "Invalid submission ID" });
        }

        const submission = await storage.getSubmission(submissionId);
        if (!submission) {
          return res.status(404).json({ message: "Submission not found" });
        }

        await storage.deleteSubmission(submissionId);
        res.json({ message: "Submission deleted successfully" });
      } catch (error) {
        console.error("Error deleting submission:", error);
        if (error instanceof Error) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "An unknown error occurred" });
        }
      }
    },
  );

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });

  // Get user by ID (for profile page)
  app.get("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Allow access only to current user's own profile or admin access
      if (req.user?.id !== id && req.user?.role !== "ADMIN") {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove sensitive information
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });

  // Update user profile
  app.patch("/api/users/:id/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Allow access only to current user's own profile or admin access
      if (req.user?.id !== id && req.user?.role !== "ADMIN") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, phone_number } = req.body;
      const updatedUser = await storage.updateUser(id, {
        name,
        phone_number,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove sensitive information
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });

  // Change user password
  app.post("/api/users/:id/password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Allow access only to current user's own password
      if (req.user?.id !== id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { currentPassword, newPassword } = req.body;
      
      // Get the user
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if passwords are set
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }
      
      // Verify current password
      const isValid = await storage.verifyPassword(user, currentPassword);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Update the password
      await storage.updateUserPassword(id, newPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}