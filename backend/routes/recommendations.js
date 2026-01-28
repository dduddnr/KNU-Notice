import express from 'express';
import { pool } from '../db.js'; // DB 설정 파일 경로에 맞게 수정
import { getSingleRecommendation } from '../services/recommendationService.js';

const router = express.Router();

// POST /api/recommendations/analyze
router.post('/analyze', async (req, res) => {
  const { userId, noticeId } = req.body;

  try {
    // 1. 중복 체크는 동일하게 수행
    const existingResult = await pool.query(
      'SELECT ai_score, ai_reason FROM user_recommendations WHERE user_id = $1 AND notice_id = $2',
      [userId, noticeId]
    );

    if (existingResult.rows.length > 0) {
      return res.json({ success: true, data: existingResult.rows[0], source: 'database' });
    }

    // 2. 데이터 조회
    const [userRes, noticeRes] = await Promise.all([
      pool.query('SELECT grade, department, experience_summary FROM users WHERE id = $1', [userId]),
      pool.query('SELECT content FROM knu_notices WHERE id = $1', [noticeId])
    ]);

    // 3. AI 분석 수행
    // 만약 여기서 에러가 발생하면 아래의 INSERT 쿼리는 영원히 실행되지 않습니다.
    const analysis = await getSingleRecommendation(userRes.rows[0], noticeRes.rows[0].content);

    // 4. [저장] 분석이 성공했을 때만 실행됨
    await pool.query(`
      INSERT INTO user_recommendations (user_id, notice_id, ai_score, ai_reason)
      VALUES ($1, $2, $3, $4)
    `, [userId, noticeId, analysis.score, analysis.reason]);

    res.json({ success: true, data: analysis, source: 'ai' });

  } catch (err) {
    // 5. AI 오류나 DB 오류 모두 여기서 처리됩니다. 
    // 저장은 수행되지 않으며 클라이언트에 실패 사실만 알립니다.
    console.error("[분석 중단]: DB 저장을 수행하지 않았습니다.", err.message);
    res.status(500).json({ 
      success: false, 
      message: "AI 분석 중 오류가 발생하여 결과를 저장하지 못했습니다." 
    });
  }
});

export default router;