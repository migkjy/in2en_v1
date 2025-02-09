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

// Convert Korean characters to English romanization
function romanizeKorean(name: string): string {
  const romanization: { [key: string]: string } = {
    "김": "kim", "이": "lee", "박": "park", "최": "choi", "정": "jung",
    "강": "kang", "조": "cho", "윤": "yun", "장": "jang", "임": "lim",
    "한": "han", "오": "oh", "서": "seo", "신": "shin", "권": "kwon",
    "황": "hwang", "안": "ahn", "송": "song", "전": "jeon", "홍": "hong",
    "민준": "minjun", "서준": "seojun", "도준": "dojun", "예준": "yejun",
    "시우": "siwoo", "하준": "hajun", "주원": "juwon", "지호": "jiho",
    "지후": "jihoo", "준서": "junseo", "현우": "hyunwoo", "예성": "yesung",
    "지훈": "jihun", "지민": "jimin", "건우": "gunwoo", "우진": "woojin",
    "선우": "sunwoo", "서진": "seojin", "연우": "yeonwoo", "민재": "minjae",
    "시윤": "siyun", "정우": "jungwoo"
  };

  let result = "";
  // First try to romanize two-character combinations
  let i = 0;
  while (i < name.length) {
    if (i + 1 < name.length && romanization[name.substring(i, i + 2)]) {
      result += romanization[name.substring(i, i + 2)];
      i += 2;
    } else if (romanization[name[i]]) {
      result += romanization[name[i]];
      i++;
    } else {
      result += name[i];
      i++;
    }
  }
  return result.toLowerCase();
}

async function generateStudents(count: number) {
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = lastName + firstName;

    const romanizedLastName = romanizeKorean(lastName);
    const romanizedFirstName = romanizeKorean(firstName);
    const email = `${romanizedLastName}${romanizedFirstName}${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`;

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