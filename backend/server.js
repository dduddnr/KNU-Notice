// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// 💡 [여기가 연결 포인트!] 
const pool = new Pool({
  user: 'postgres',           // pgAdmin 기본 사용자
  host: 'localhost',          // 내 컴퓨터
  database: 'knu_db',         // 방금 만든 DB 이름
  password: 'hsm0710**', // ⚠️ 꼭 본인 비번으로 수정!
  port: 5432,                 // 기본 포트
});

// 연결 상태 테스트 함수
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ DB 연결 에러 (비번이나 호스트 확인):', err.stack);
  }
  console.log('✅ PostgreSQL 데이터베이스 연결 성공!');
  release();
});

// 테이블 자동 생성 (서버 켤 때마다 체크)
const initDB = async () => {
  try {
    // 1. 유저 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        password TEXT NOT NULL,
        student_id VARCHAR(20) UNIQUE NOT NULL,
        grade VARCHAR(10),
        department TEXT,
        name VARCHAR(50)
      );
    `);
    // 2. 공지사항 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        title TEXT,
        link TEXT,
        date VARCHAR(20),
        department VARCHAR(50)
      );
    `);
    console.log("✅ 모든 테이블이 생성(또는 확인)되었습니다.");
  } catch (err) {
    console.error("❌ 테이블 생성 에러:", err);
  }
};
initDB();

// (이후 /api/register, /api/login 등의 API 코드가 이어집니다)

app.listen(5000, () => console.log("🚀 서버 가동 중 (포트 5000)"));