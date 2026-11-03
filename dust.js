// Vercel 서버리스 함수: 한국환경공단 에어코리아 대기오염정보 중계 API

export default async function handler(req, res) {
  // CORS 및 응답 헤더를 설정합니다
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 주소 쿼리로 sido(시도 이름)를 받습니다. 없으면 기본값은 '서울'입니다
  const sido = req.query.sido || '서울';

  // 환경변수 AIRKOREA_KEY 에서 인증키를 읽어옵니다 (코드에 직접 노출하지 않음)
  const rawKey = process.env.AIRKOREA_KEY;

  // 환경변수에 인증키가 설정되어 있지 않은 경우 에러를 반환합니다
  if (!rawKey) {
    return res.status(500).json({
      error: '서버 환경변수(AIRKOREA_KEY)가 설정되지 않았습니다. .env.local 또는 Vercel 환경변수 설정을 확인해주세요.'
    });
  }

  // 환경변수에 입력된 Encoding 키를 요청 주소에 붙일 때 encodeURIComponent로 감싸줍니다
  // (만약 이미 %가 포함된 인코딩 키라면 이중 인코딩(%25) 오류를 방지하기 위해 decode 후 encode합니다)
  const serviceKey = encodeURIComponent(rawKey.includes('%') ? decodeURIComponent(rawKey) : rawKey);

  // 공공데이터포털 에어코리아 대기오염정보 API 요청 URL을 생성합니다
  const apiUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${serviceKey}&returnType=json&numOfRows=100&pageNo=1&sidoName=${encodeURIComponent(sido)}&ver=1.3`;

  try {
    // 공공데이터포털 API로 요청을 보냅니다
    const apiResponse = await fetch(apiUrl);

    // 응답 본문 텍스트를 먼저 읽어옵니다 (XML 에러 대응)
    const textData = await apiResponse.text();

    // 응답이 JSON인지 XML인지 파싱을 시도합니다
    let jsonData;
    try {
      jsonData = JSON.parse(textData);
    } catch (parseError) {
      // JSON 파싱에 실패하면 XML 에러로 온 것이므로 요구사항에 맞는 한국어 에러 메시지를 반환합니다
      return res.status(400).json({
        error: '인증키 또는 요청값을 확인해주세요.'
      });
    }

    // 응답 본문 안의 resultCode가 '00'(정상)이 아닐 때도 한국어 메시지로 알려줍니다
    const header = jsonData?.response?.header;
    if (!header || header.resultCode !== '00') {
      const code = header?.resultCode || '알 수 없음';
      const msg = header?.resultMsg || '응답 오류';
      return res.status(400).json({
        error: `공공데이터 API 처리 실패: 인증키 또는 요청값을 확인해주세요. (결과 코드: ${code}, 메시지: ${msg})`
      });
    }

    // 정상 데이터인 경우 클라이언트로 200 응답과 함께 전달합니다
    return res.status(200).json(jsonData);
  } catch (error) {
    // 네트워크 오류 등 예외 발생 시 에러 응답을 반환합니다
    console.error('API 프록시 서버 에러:', error);
    return res.status(500).json({
      error: '서버 내부 오류가 발생했습니다: ' + error.message
    });
  }
}

