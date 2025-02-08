
# English Academy Platform

영어 숙제 관리 및 피드백을 위한 온라인 학습 플랫폼입니다.

## 주요 기능

- 학생/선생님/관리자 역할 기반 접근 제어
- 숙제 제출 및 관리
- AI 기반 텍스트 분석
- 선생님 피드백 시스템

## 기술 스택

- Frontend: React, TypeScript, Tailwind CSS
- Backend: Express.js
- Database: PostgreSQL
- Authentication: JWT

## 실행 방법

1. 의존성 설치:
```bash
npm install
```

2. 개발 서버 실행:
```bash
npm run dev
```

## 프로젝트 구조

- `/client`: React 프론트엔드 코드
- `/server`: Express 백엔드 코드
- `/shared`: 공유 타입 및 스키마 정의


## 프로젝트 설명
Below is the complete text wireframe overview rewritten in English, **now replacing all instances of “Academy” with “Branch.”** 

---

## **0. Common Pages**

### **0.1 Login Page**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Header: Simple Logo]                                          │
├─────────────────────────────────────────────────────────────────┤
│                          [Login Page]                          │
│   ┌────────────────────────────────────────┐                    │
│   │ [Email] Input Field                   │                    │
│   └────────────────────────────────────────┘                    │
│   ┌────────────────────────────────────────┐                    │
│   │ [Password] Input Field                │                    │
│   └────────────────────────────────────────┘                    │
│   [Login Button]                                               │
│   (Optional) [Forgot Password], [Sign Up] links                │
└─────────────────────────────────────────────────────────────────┘
```
**Description:**
- Users enter their Email and Password, then click **Login**.
- On successful login, users are redirected to different dashboards depending on their role (Admin/Teacher/Student).
- (Optional) Links for password recovery or user registration (or invitation link for students) can be provided.

---

### **0.2 My Page (Common)**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: (Logged-In User Name) | [Logout]]                      │
├───────────────────────────────────────────────────────────────────┤
│ [My Page]                                                       │
│   ┌─────────────────────────────────────────────────────────┐     │
│   │ 1) Profile Information                                 │     │
│   │   - Name, Email (updatable depending on policy)        │     │
│   ├─────────────────────────────────────────────────────────┤     │
│   │ 2) Change Password                                     │     │
│   │   - Current Password / New Password                    │     │
│   └─────────────────────────────────────────────────────────┘     │
│  [Save] Button                                                │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- Shared by Admin, Teacher, and Student.
- Minimal personal info (Name, Email) and password-change functionality.

---

## **1. Admin Pages**

### **1.1 Admin Dashboard (Home)**
```
┌────────────────────────────────────────────────────────────────────┐
│ [Header: Logo | Admin Nickname | [My Page] | [Logout]]            │
├────────────────────────────────────────────────────────────────────┤
│ [Main Content Area]                                               │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │ [Manage Branches] Button                                  │   │
│   ├───────────────────────────────────────────────────────────┤   │
│   │ [Manage Classes] Button                                   │   │
│   └───────────────────────────────────────────────────────────┘   │
│   (Optional) [Manage Teachers], [Manage Students] Buttons         │
└────────────────────────────────────────────────────────────────────┘
```
**Description:**
- First screen after Admin login.
- Primary focus is on Branch/Class management (create, update, delete).

---

### **1.2 Branch List Page**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Admin]                                                  │
├───────────────────────────────────────────────────────────────────┤
│ [Branch List Table]                                              │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ BranchID | Branch Name | [Detail] [Edit] [Delete]          │   │
│ └─────────────────────────────────────────────────────────────┘   │
│ [Add Branch] Button                                              │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- View, edit, or delete existing branches.
- A button to add a new branch.

#### **1.2.1 Add Branch (Popup/Separate Page)**
```
┌─────────────────────────────────────────┐
│ [Branch Name] Input                    │
│ (Optional) Address, etc.              │
│ [Save] Button                          │
└─────────────────────────────────────────┘
```

---

### **1.3 Branch Detail**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Admin]                                                  │
├───────────────────────────────────────────────────────────────────┤
│ [Branch Name: Branch A]                                          │
│ ┌───────────────────────────────────────────────────────────┐     │
│ │ - Quick summary: Number of classes, number of teachers, etc.   │
│ │ - [Edit Branch Info] Button                                   │
│ └───────────────────────────────────────────────────────────┘     │
│ [Class List Table]                                              │
│ ┌───────────────────────────────────────────────────────────┐     │
│ │ ClassID | Class Name | [Detail] [Delete]                 │     │
│ └───────────────────────────────────────────────────────────┘     │
│ [Add Class] Button                                             │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- Shows details about the branch and a list of its classes.
- “Add Class” preselects the current branch for quick creation.

---

### **1.4 Class Management Page (All Classes)**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Admin]                                                  │
├───────────────────────────────────────────────────────────────────┤
│ [Class List Table]                                               │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ ClassID | Class Name | Branch Name | [Detail] [Delete]     │   │
│ └─────────────────────────────────────────────────────────────┘   │
│ [Add Class] Button                                              │
└───────────────────────────────────────────────────────────────────┘
```
*(Alternatively, classes could be managed only within each Branch Detail page.)*

#### **1.4.1 Add Class (Popup/Separate Page)**
```
┌─────────────────────────────────────────────────────────┐
│ [Select Branch] Dropdown                                │
│ [Class Name] Input                                      │
│ (Optional) English Level, Grade, etc.                   │
│ [Save] Button                                           │
└─────────────────────────────────────────────────────────┘
```

---

### **1.5 Class Detail (Admin)**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Admin]                                                  │
├───────────────────────────────────────────────────────────────────┤
│ [Class Name: Branch A - Class 1]                                 │
│ ┌───────────────────────────────────────────────────────────┐     │
│ │ - Assigned Teachers List (e.g. Teacher Kim, Teacher Lee)  │     │
│ │   [Assign Teacher] Button                                 │     │
│ └───────────────────────────────────────────────────────────┘     │
│ [Student List Table]                                           │
│ ┌───────────────────────────────────────────────────────────┐     │
│ │ StudentID | Student Name | [Delete]                      │     │
│ └───────────────────────────────────────────────────────────┘     │
│ [Invite/Add Student] Button (invite by email or search existing) │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- Admin can assign or remove teachers/students from the class.

---

## **2. Teacher Pages**

### **2.1 Teacher Dashboard (Home)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Header: Logo | Teacher Nickname | [My Page] | [Logout]]       │
├─────────────────────────────────────────────────────────────────┤
│ [Main Content Area]                                            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ [List of Branches and Classes Assigned to Me]           │   │
│   │   e.g., Branch A → Class 1, Class 2                     │   │
│   │         Branch B → Class 1                              │   │
│   │ (Click class name → assignment list or class info)      │   │
│   └─────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ [Create New Assignment] Button                          │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### **2.2 Create Assignment Page**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Teacher]                                               │
├───────────────────────────────────────────────────────────────────┤
│ [Assignment Creation Form]                                       │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ 1) Class Selection (Dropdown)                               │   │
│ │ 2) Assignment Title, Date/Due Date, Optional Description    │   │
│ │ 3) [Save] Button                                           │   │
│ └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- After saving, the teacher can go to Assignment Detail for bulk upload, etc.

---

### **2.3 Assignment List (Optional)**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Teacher]                                               │
├───────────────────────────────────────────────────────────────────┤
│ [Class Selection]                                               │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ AssignmentID | Assignment Title | Created Date | [Detail]  │   │
│ └─────────────────────────────────────────────────────────────┘   │
│ [Create New Assignment] Button                                  │
└───────────────────────────────────────────────────────────────────┘
```

---

### **2.4 Assignment Detail**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Teacher]                                               │
├───────────────────────────────────────────────────────────────────┤
│ [Assignment Title: ReadingHW]                                    │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ - Class: Branch A - Class 1                                │   │
│ │ - Due Date, brief description, etc.                        │   │
│ └─────────────────────────────────────────────────────────────┘   │
│ [Submission List by Students]                                   │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ Student Name | Status (Unreviewed/Done) | [Detail]         │   │
│ └─────────────────────────────────────────────────────────────┘   │
│ [Bulk Upload] Button                                           │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- **Bulk Upload** lets the teacher upload multiple images at once and map them to students.

---

### **2.5 Bulk Upload**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Teacher]                                               │
├───────────────────────────────────────────────────────────────────┤
│ [File Drag & Drop or Select Button]                              │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ Image1 Thumbnail - Select Student (Dropdown) - Page Number  │   │
│ │ Image2 Thumbnail - Select Student (Dropdown)                │   │
│ └─────────────────────────────────────────────────────────────┘   │
│ [Save] Button                                                  │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- On save, each image creates a Submission record → triggers OCR + auto feedback.

---

### **2.6 Submission Detail**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Teacher]                                               │
├───────────────────────────────────────────────────────────────────┤
│ [Student: John Doe]  [Assignment: ReadingHW]                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ 1) Original Image Preview                                  │   │
│ ├─────────────────────────────────────────────────────────────┤   │
│ │ 2) OCR Result Text (Editor)                                │   │
│ ├─────────────────────────────────────────────────────────────┤   │
│ │ 3) ChatGPT Auto Feedback (Editor)                          │   │
│ └─────────────────────────────────────────────────────────────┘   │
│ [Save] [Mark as Reviewed] Buttons                              │
│                                                                 │
│ [Comments Section]                                              │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ - List of comments (Teacher/Student)                        │   │
│ │ - [Add Comment] Input                                       │   │
│ └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- Teacher reviews and edits OCR/autogenerated feedback, can communicate via comments.

---

## **3. Student Pages**

### **3.1 Student Dashboard (Home)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Header: Logo | Student Nickname | [My Page] | [Logout]]       │
├─────────────────────────────────────────────────────────────────┤
│ [Main Content Area]                                            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ [List of My Classes]                                    │   │
│   │   e.g., Branch A - Class 1, Branch B - Class 1           │   │
│   │   (Click → see assignments for that class)               │   │
│   └─────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ [My Assignments] (Table)                                │   │
│   │   Title | Status (Review/Done) | [Detail]               │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### **3.2 Assignment List by Class (Student)**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Student]                                               │
├───────────────────────────────────────────────────────────────────┤
│ [Class: Branch A - Class 1]                                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ AssignmentID | Title | Status (Done/In Progress) | [Detail]│   │
│ └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- Clicking **Detail** shows the student’s submission details for that assignment.

---

### **3.3 Assignment Detail / Submission View (Student)**
```
┌───────────────────────────────────────────────────────────────────┐
│ [Header: Student]                                               │
├───────────────────────────────────────────────────────────────────┤
│ [Assignment: ReadingHW]                                         │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ 1) My Submitted Image(s) (Preview)                          │   │
│ │ 2) OCR Text Result (Read-only)                              │   │
│ │ 3) Teacher Feedback (Read-only)                             │   │
│ └─────────────────────────────────────────────────────────────┘   │
│ [Comments Section]                                              │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ - Teacher/Student comment list                              │   │
│ │ - [Add Comment] Input                                       │   │
│ └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```
**Description:**
- Students can see their own submissions (images + OCR + feedback).
- They can communicate via comments if they have questions.

---

## **Final Summary**
These pages outline the **minimum viable product (MVP)**. The key sections are:

- **Common**: 
  - **Login**, **My Page**  
- **Admin**: 
  - **Dashboard** (links to Branch/Class management)  
  - **Branch List & Detail** (Add/Edit/Delete Branches)  
  - **Class List & Detail** (Add/Edit/Delete Classes, assign Teachers/Students)  
- **Teacher**: 
  - **Dashboard** (list of assigned Branches/Classes, button to create new assignments)  
  - **Create Assignment**, **Assignment List/Detail**  
  - **Bulk Upload**, **Submission Detail** (review & feedback)  
- **Student**: 
  - **Dashboard** (my Classes & Assignments)  
  - **Class-specific Assignment List**, **Assignment Detail** (view submission, feedback, comments)

By structuring wireframes in this way, you have a clear blueprint for rapid MVP development. From here, you can move on to actual UI design in a tool like Figma or start coding in React, Vue, or any other framework you prefer.