import { storage } from "../server/storage";
import { UserRole } from "@shared/schema";

const firstNames = ["민준", "서준", "도준", "예준", "시우", "하준", "주원", "지호", "지후", "준서", "현우", "예성", "지훈", "지민", "건우", "우진", "선우", "서진", "연우", "민재", "시윤", "정우"];
const lastNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "전", "홍"];
const domains = ["naver.com", "gmail.com", "daum.net", "kakao.com", "outlook.com", "yahoo.com"];
const branchIds = [2, 3]; // Update these with your actual branch IDs

function generateRandomPhoneNumber() {
  const middle = String(Math.floor(Math.random() * 9000) + 1000);
  const last = String(Math.floor(Math.random() * 9000) + 1000);
  return `010-${middle}-${last}`;
}

function generateRandomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

async function generateStudents(count: number) {
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = lastName + firstName;
    
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const email = `${lastName.toLowerCase()}${firstName.toLowerCase()}${Math.floor(Math.random() * 1000)}@${domain}`;
    
    const branchId = branchIds[Math.floor(Math.random() * branchIds.length)];
    
    try {
      await storage.createUser({
        email,
        name: fullName,
        password: "password123", // Default password for all dummy users
        role: UserRole.STUDENT,
        branchId,
        phone_number: generateRandomPhoneNumber(),
        birth_date: generateRandomDate(new Date(2000, 0, 1), new Date(2010, 11, 31))
      });
      console.log(`Created student: ${fullName} (${email})`);
    } catch (error) {
      console.error(`Failed to create student ${fullName}:`, error);
    }
  }
}

// Generate 100 dummy students
generateStudents(100).then(() => {
  console.log("Finished generating dummy students");
  process.exit(0);
}).catch(error => {
  console.error("Error generating students:", error);
  process.exit(1);
});
