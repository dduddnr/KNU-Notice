import { PlaywrightCrawler } from 'crawlee';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// 1. DB 연결 설정 (비밀번호 확인 필수!)
const pool = new Pool({
    user: process.env.DB_USER,      // .env의 DB_USER 값을 가져옴
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const crawler = new PlaywrightCrawler({
    // 브라우저가 뜨는 것을 눈으로 확인 (디버깅용)
    headless: false,

    // SSL 인증서 오류 무시 (학교 사이트 접속 시 필수)
    launchContext: {
        launchOptions: {
            ignoreHTTPSErrors: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    },

    async requestHandler({ request, page, log }) {
        log.info(`접속 성공: ${request.url}`);

        try {
            // 특정 테이블 이름 대신, '게시글 제목(.bo_tit)'이 뜰 때까지 기다림
            // 이 클래스는 그누보드(학교사이트)에서 무조건 사용함
            await page.waitForSelector('.bo_tit', { timeout: 10000 });
        } catch (e) {
            log.error('게시글 목록을 찾을 수 없습니다. (선택자 불일치)');
            return;
        }

        const notices = await page.evaluate(() => {
            // 모든 테이블의 행(tr)을 가져옴
            const rows = document.querySelectorAll('tr');
            const result = [];
            const seenLinks = new Set();

            rows.forEach(row => {
                // 각 행 안에 제목(bo_tit)과 날짜(date)가 있는지 검사
                const subjectElem = row.querySelector('.bo_tit a');
                const dateElem = row.querySelector('.td_date') || row.querySelector('.td_datetime');

                if (subjectElem && dateElem) {
                    const title = subjectElem.innerText.trim();
                    const link = subjectElem.href;
                    const date = dateElem.innerText.trim();

                    // 제목이 비어있지 않고, 처음 보는 링크일 때만 추가
                    if (title.length > 0 && !seenLinks.has(link)) {
                        seenLinks.add(link); // 장부에 기록
                        result.push({ title, link, date });
                    }
                }
            });
            return result;
        });

        log.info(`총 ${notices.length}개의 공지사항을 발견했습니다.`);

        // 3. DB 저장
        let newCount = 0;
        for (const notice of notices) {
            try {
                // 이미 있는 링크면(ON CONFLICT) 아무것도 안 함(DO NOTHING)
                const query = `
                    INSERT INTO knu_notices (title, post_date, link)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (link) DO NOTHING
                    RETURNING id
                `; 
                // RETURNING id를 쓰면, 새로 저장된 것만 결과가 반환됨
                const res = await pool.query(query, [notice.title, notice.date, notice.link]);
                
                if (res.rowCount > 0) newCount++; // 새로 저장된 개수 카운트
            } catch (err) {
                console.error(`DB 에러: ${err.message}`);
            }
        }
        
        if (newCount > 0) {
            log.info(`🎉 새로운 공지사항 ${newCount}개를 저장했습니다!`);
        } else {
            log.info(`👍 새로운 공지사항이 없습니다. (모두 최신 상태)`);
        }
    },
});

(async () => {
    try {
        console.log('크롤링 시작...');
        await crawler.run(['https://cse.knu.ac.kr/bbs/board.php?bo_table=sub5_1&lang=kor']);
        console.log('크롤링 완료!');
    } catch (error) {
        console.error('실행 중 에러 발생:', error);
    } finally {
        await pool.end();
        console.log('DB 연결 종료');
    }
})();