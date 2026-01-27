import express from 'express';
import cors from 'cors';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const app = express();
const PORT = 5000; // 파이썬 코드와 동일한 포트 사용

// 미들웨어 설정
app.use(cors({ origin: '*' })); // CORS 설정 (모든 도메인 허용)
app.use(express.json()); // JSON 요청 본문 파싱 (Flask의 request.json 대응)

// DB 연결 설정 (Pool 사용이 더 효율적임)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD, // .env에서 가져옴
    port: process.env.DB_PORT || 5432
});

// ==========================================
// 1. 공지사항 조회 (GET /api/notices)
// ==========================================
app.get('/api/notices', async (req, res) => {
    try {
        const query = `
            SELECT source as dept, title, link, post_date as date 
            FROM knu_notices 
            ORDER BY post_date DESC, id DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (e) {
        console.error(`공지사항 조회 에러: ${e.message}`);
        res.json([]);
    }
});

// ==========================================
// 2. 로그인 (POST /api/login)
// ==========================================
app.post('/api/login', async (req, res) => {
    const { student_id, password } = req.body;
    
    try {
        // 파라미터 바인딩 ($1, $2)를 사용하여 보안 강화
        const result = await pool.query(
            "SELECT * FROM users WHERE student_id = $1 AND password = $2", 
            [student_id, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            delete user.password; // 비밀번호 제외하고 반환
            res.json({ success: true, user: user });
        } else {
            res.json({ success: false, message: "학번 또는 비밀번호가 틀렸습니다." });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "서버 에러 발생" });
    }
});

// ==========================================
// 3. 회원가입 (POST /api/register)
// ==========================================
app.post('/api/register', async (req, res) => {
    const { student_id, password, name, grade, department } = req.body;

    const client = await pool.connect(); // 트랜잭션을 위해 클라이언트 연결
    try {
        await client.query('BEGIN'); // 트랜잭션 시작

        // 중복 학번 체크
        const checkRes = await client.query("SELECT student_id FROM users WHERE student_id = $1", [student_id]);
        if (checkRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.json({ success: false, message: "이미 존재하는 학번입니다." });
        }

        // 회원 정보 저장
        await client.query(
            "INSERT INTO users (student_id, password, name, grade, department) VALUES ($1, $2, $3, $4, $5)",
            [student_id, password, name, grade, department]
        );

        await client.query('COMMIT'); // 성공 시 커밋
        res.json({ success: true, message: "회원가입 성공!" });

    } catch (e) {
        await client.query('ROLLBACK'); // 에러 시 롤백
        res.json({ success: false, message: e.message });
    } finally {
        client.release();
    }
});

// ==========================================
// 4. 비밀번호 재설정 (POST /api/reset-password)
// ==========================================
app.post('/api/reset-password', async (req, res) => {
    const { student_id, new_password } = req.body;

    try {
        const result = await pool.query(
            "UPDATE users SET password = $1 WHERE student_id = $2",
            [new_password, student_id]
        );

        if (result.rowCount > 0) {
            res.json({ success: true, message: "비밀번호가 성공적으로 변경되었습니다." });
        } else {
            res.json({ success: false, message: "존재하지 않는 학번입니다." });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ==========================================
// 5. 키워드 업데이트 (POST /api/update-keywords)
// ==========================================
app.post('/api/update-keywords', async (req, res) => {
    const { student_id, keywords } = req.body; // keywords는 배열([]) 형태여야 함

    try {
        // DB 컬럼이 TEXT[] 타입이면 JS 배열을 그대로 넣으면 됩니다.
        await pool.query(
            "UPDATE users SET keywords = $1 WHERE student_id = $2",
            [keywords, student_id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(`키워드 업데이트 에러: ${e.message}`);
        res.json({ success: false, message: e.message });
    }
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`🚀 서버가 실행되었습니다: http://localhost:${PORT}`);
});