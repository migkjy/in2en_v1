import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { extractTextFromImage, generateFeedback } from "./openai";
import multer from "multer";
import { UserRole } from "@shared/schema";

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
    const branch = await storage.getBranch(Number(req.params.id));
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    res.json(branch);
  });

  app.put("/api/branches/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const branch = await storage.updateBranch(Number(req.params.id), req.body);
      res.json(branch);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/branches/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      await storage.deleteBranch(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Class routes
  app.get("/api/classes", requireRole([UserRole.ADMIN, UserRole.TEACHER]), async (req, res) => {
    const { branchId } = req.query;
    const classes = await storage.listClasses(branchId ? Number(branchId) : undefined);
    res.json(classes);
  });

  app.post("/api/classes", requireRole([UserRole.ADMIN]), async (req, res) => {
    const cls = await storage.createClass(req.body);
    res.status(201).json(cls);
  });

  // Assignment routes
  app.post("/api/assignments", requireRole([UserRole.TEACHER]), async (req, res) => {
    const assignment = await storage.createAssignment({
      ...req.body,
      teacherId: req.user?.id
    });
    res.status(201).json(assignment);
  });

  app.get("/api/assignments", async (req, res) => {
    const { classId } = req.query;
    const assignments = await storage.listAssignments(classId ? Number(classId) : undefined);
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

  const httpServer = createServer(app);
  return httpServer;
}