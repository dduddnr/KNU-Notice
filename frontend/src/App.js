import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  // --- 상태 관리 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [notices, setNotices] = useState([]);
  const [category, setCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // --- 1. 로그인 성공 시 공지사항 가져오기 ---
  useEffect(() => {
    if (isLoggedIn) {
      fetch('http://127.0.0.1:5000/api/notices')
        .then(res => res.json())
        .then(data => setNotices(data))
        .catch(err => console.error("데이터 로딩 실패:", err));
    }
  }, [isLoggedIn]);

  // --- 2. 검색 및 필터링 로직 ---
  const filteredNotices = notices.filter(notice => {
    const matchesCategory = category === '전체' || notice.dept === category;
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // --- 3. 페이지네이션 계산 ---
  const postsPerPage = 10;
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentNotices = filteredNotices.slice(indexOfFirstPost, indexOfLastPost);

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredNotices.length / postsPerPage); i++) {
    pageNumbers.push(i);
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [category, searchTerm]);

  // --- 4. 이벤트 핸들러 함수들 ---
  const handResetPassword = (e) => {
    e.preventDefault();
    const student_id = e.target.sid.value;
    const new_password = e.target.new_pw.value;
    fetch('http://127.0.0.1:5000/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, new_password }),
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        if (data.success) setIsResetMode(false);
      });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const student_id = e.target.sid.value;
    const password = e.target.pw.value;
    fetch('http://127.0.0.1:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, password }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsLoggedIn(true);
          setUserInfo(data.user);
        } else {
          alert(data.message);
        }
      });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const formData = {
      student_id: e.target.sid.value,
      password: e.target.pw.value,
      name: e.target.name.value,
      grade: e.target.grade.value,
      department: e.target.dept.value,
    };
    fetch('http://127.0.0.1:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("회원가입 성공! 로그인해주세요.");
          setIsRegisterMode(false);
        } else {
          alert("회원가입 실패: " + data.message);
        }
      });
  };

  const handleNoticeClick = (url) => {
    if (!url) return;
    const cleanUrl = url.replace(/btin\.page=[^&]*/g, 'btin.page=1').replace(/\/>/g, '').replace(/%3E/g, '');
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  };

  // ✅ 상단 필터 카테고리에 '전자공학부' 추가
  const categories = ['전체', '경북대 학사공지', '컴퓨터학부', '전자공학부', 'AI융합대학'];

  // --- [Case 1] 로그인 성공 후 메인 화면 ---
  if (isLoggedIn) {
    return (
      <div className="container">
        <div className="bg-overlay"></div>
        
        <header className="header">
          <div className="user-bar">
            <div className="user-info">
              <span className="user-name"><b>{userInfo?.name}</b>님 </span>
              <span className="user-dept-grade">{userInfo?.department} {userInfo?.grade}학년</span>
            </div>
            <button onClick={() => setIsLoggedIn(false)} className="logout-btn">로그아웃</button>
          </div>
          <h1>KNU 공지사항 피드</h1>
          <p className="subtitle">경북대학교의 최신 소식을 한눈에 확인하세요</p>
        </header>

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="공지사항 제목 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-container">
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${category === cat ? 'active' : ''}`}
              onClick={() => { setCategory(cat); setSearchTerm(''); }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="info-bar">
          <p className="result-count">총 <b>{filteredNotices.length}</b>개의 공지사항</p>
          {(category !== '전체' || searchTerm !== '') && (
            <button className="reset-btn" onClick={() => { setCategory('전체'); setSearchTerm(''); }}>초기화</button>
          )}
        </div>

        <div className="notice-list">
          {currentNotices.length > 0 ? (
            currentNotices.map((notice, index) => (
              <div key={index} className="notice-card" onClick={() => handleNoticeClick(notice.link)}>
                <span className="dept-tag">{notice.dept}</span>
                <h3 className="notice-title">{notice.title}</h3>
                <div className="card-footer">
                  <span className="notice-date">{notice.date}</span>
                  <span className="view-more">상세보기 ➔</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-result">검색 결과가 없습니다.</div>
          )}
        </div>

        {pageNumbers.length > 1 && (
          <div className="pagination">
            {pageNumbers.map(number => (
              <button
                key={number}
                onClick={() => { setCurrentPage(number); window.scrollTo(0, 0); }}
                className={`page-btn ${currentPage === number ? 'active' : ''}`}
              >
                {number}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- [Case 2] 로그인 / 회원가입 / 비밀번호 재설정 화면 ---
  return (
    <div className="auth-wrapper">
      <div className="bg-overlay"></div>

      {isResetMode ? (
        <form className="login-box" onSubmit={handResetPassword}>
          <h2>비밀번호 재설정</h2>
          <p>학번과 새로 사용할 비밀번호를 입력하세요.</p>
          <input name="sid" placeholder="학번" required />
          <input name="new_pw" type="password" placeholder="새 비밀번호" required />
          <button type="submit">비밀번호 변경하기</button>
          <div className="auth-links">
            <span onClick={() => setIsResetMode(false)} style={{ cursor: 'pointer' }}>로그인으로 돌아가기</span>
          </div>
        </form>
      ) : isRegisterMode ? (
        <form className="login-box" onSubmit={handleRegister}>
          <h2>KNU 가입하기</h2>
          <input name="sid" placeholder="학번" required />
          <input name="pw" type="password" placeholder="비밀번호" required />
          <input name="name" placeholder="이름" required />
          <input name="grade" type="number" placeholder="학년" required />
          {/* ✅ 회원가입 학과 선택지에 '전자공학부' 추가 */}
          <select name="dept" required>
            <option value="">학과 선택</option>
            <option value="컴퓨터학부">컴퓨터학부</option>
            <option value="전자공학부">전자공학부</option>
            <option value="경북대 학사공지">경북대 학사공지</option>
            <option value="AI융합대학">AI융합대학</option>
          </select>
          <button type="submit">회원가입</button>
          <div className="auth-links">
            <span onClick={() => setIsRegisterMode(false)} style={{ cursor: 'pointer' }}>이미 계정이 있나요? 로그인</span>
          </div>
        </form>
      ) : (
        <form className="login-box" onSubmit={handleLogin}>
          <h2>KNU 공지사항 시스템</h2>
          <p>학번과 비밀번호를 입력하세요</p>
          <input name="sid" type="text" placeholder="학번" required />
          <input name="pw" type="password" placeholder="비밀번호" required />
          <button type="submit">로그인</button>
          <div className="auth-links">
            <span onClick={() => setIsResetMode(true)} style={{ cursor: 'pointer' }}>비밀번호 찾기</span> | 
            <span onClick={() => setIsRegisterMode(true)} style={{ cursor: 'pointer', color: '#b11030', fontWeight: 'bold' }}> 회원가입</span>
          </div>
        </form>
      )}
    </div>
  );
}

export default App;