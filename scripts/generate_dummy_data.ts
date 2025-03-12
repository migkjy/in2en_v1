import { db } from "../server/db";
import { users, assignments, submissions, UserRole } from "@shared/schema";
import { randomBytes, scrypt as _scrypt } from "crypto";
import { promisify } from "util";
import { format, addDays } from "date-fns";

const scrypt = promisify(_scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

const ENGLISH_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const AGE_GROUPS = ["Children", "Teenagers", "Adults"];

async function main() {
  try {
    console.log("Starting to generate dummy data...");

    // Generate teacher data
    console.log("Generating teachers...");
    const teachers = [];
    for (let i = 1; i <= 100; i++) {
      const hashedPassword = await hashPassword(`teacher${i}password`);
      teachers.push({
        email: `teacher${i}@in2english.com`,
        name: `Teacher ${i}`,
        password: hashedPassword,
        role: UserRole.TEACHER,
        phone_number: `010-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`
      });
    }
    const insertedTeachers = await db.insert(users).values(teachers).returning();
    console.log(`Created ${insertedTeachers.length} teachers`);

    // Generate student data
    console.log("Generating students...");
    const students = [];
    for (let i = 1; i <= 100; i++) {
      const hashedPassword = await hashPassword(`student${i}password`);
      students.push({
        email: `student${i}@example.com`,
        name: `Student ${i}`,
        password: hashedPassword,
        role: UserRole.STUDENT,
        phone_number: `010-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`
      });
    }
    const insertedStudents = await db.insert(users).values(students).returning();
    console.log(`Created ${insertedStudents.length} students`);

    // Generate assignment data
    console.log("Generating assignments...");
    const assignmentData = [];
    for (let i = 1; i <= 100; i++) {
      const teacher = insertedTeachers[Math.floor(Math.random() * insertedTeachers.length)];
      const dueDate = addDays(new Date(), Math.floor(Math.random() * 30));

      assignmentData.push({
        title: `Assignment ${i}`,
        description: `This is assignment number ${i}. Please complete the following tasks...`,
        teacherId: teacher.id,
        status: ['draft', 'published', 'completed'][Math.floor(Math.random() * 3)],
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        englishLevel: ENGLISH_LEVELS[Math.floor(Math.random() * ENGLISH_LEVELS.length)],
        ageGroup: AGE_GROUPS[Math.floor(Math.random() * AGE_GROUPS.length)]
      });
    }
    const insertedAssignments = await db.insert(assignments).values(assignmentData).returning();
    console.log(`Created ${insertedAssignments.length} assignments`);

    // Generate submission data
    console.log("Generating submissions...");
    const submissionData = [];
    for (const assignment of insertedAssignments) {
      // Generate 2-3 submissions per assignment
      const numSubmissions = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < numSubmissions; i++) {
        const student = insertedStudents[Math.floor(Math.random() * insertedStudents.length)];

        // Generate dummy image URL
        const imageUrl = `https://storage.in2english.com/submissions/dummy-${assignment.id}-${student.id}.jpg`;

        submissionData.push({
          assignmentId: assignment.id,
          studentId: student.id,
          content: `Submission content for assignment ${assignment.id} by student ${student.id}`,
          status: ['pending', 'uploaded', 'ai-reviewed', 'reviewed'][Math.floor(Math.random() * 4)],
          grade: Math.floor(Math.random() * 41) + 60, // Random grade between 60-100
          feedback: `Teacher's feedback for submission...`,
          submittedAt: new Date().toISOString(),
          imageUrl: imageUrl, // Add dummy image URL
          ocrText: `OCR text for submission from assignment ${assignment.id}...`
        });
      }
    }
    await db.insert(submissions).values(submissionData);
    console.log(`Created ${submissionData.length} submissions`);

    console.log("Dummy data generation completed successfully!");
  } catch (error) {
    console.error("Error generating dummy data:", error);
    process.exit(1);
  }
}

main().catch(console.error);