// 로컬 개발 환경용 Node.js 서버 (Vercel CLI 없이도 로컬에서 테스트 가능)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.local 파일에서 환경변수를 로드합니다
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
}

// api/dust.js 핸들러를 동적 임포트합니다
let dustHandler = null;
try {
  const dustModule = await import('./api/dust.js');
  dustHandler = dustModule.default;
} catch (err) {
  console.error('api/dust.js 로드 실패:', err);
}

// MIME 타입 매핑 객체입니다
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

// HTTP 서버를 생성합니다
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // 1. /api/dust 요청 처리 (Vercel 서버리스 함수 라우팅)
  if (pathname === '/api/dust') {
    if (!dustHandler) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '서버리스 핸들러를 찾을 수 없습니다.' }));
      return;
    }

    // req.query 객체 생성
    req.query = Object.fromEntries(reqUrl.searchParams.entries());

    // Express/Vercel 형태의 status / json 헬퍼 함수 구현
    res.status = (statusCode) => {
      res.statusCode = statusCode;
      return res;
    };
    res.json = (data) => {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(data));
      return res;
    };

    try {
      await dustHandler(req, res);
    } catch (handlerErr) {
      console.error('핸들러 실행 오류:', handlerErr);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: handlerErr.message }));
      }
    }
    return;
  }

  // 2. 정적 파일 서빙 (index.html, style.css, script.js 등)
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(path.join(__dirname, filePath));

  // 보안: 디렉토리 탐색 방지
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('접근이 거부되었습니다.');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 파일을 찾을 수 없습니다.');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(safePath).pipe(res);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` 대기오염 정보 웹앱 로컬 서버가 시작되었습니다!`);
  console.log(` 브라우저에서 아래 주소로 접속하세요:`);
  console.log(` 👉 http://localhost:${PORT}`);
  console.log(`===============================================`);
});

