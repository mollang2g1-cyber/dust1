// Vercel 서버리스 프록시 함수 엔드포인트 주소입니다
const API_ENDPOINT = '/api/dust';

// 시도 선택 드롭다운 HTML 요소를 가져옵니다
const sidoSelect = document.getElementById('sidoSelect');

// 내 위치 찾기 버튼 요소를 가져옵니다
const locationBtn = document.getElementById('locationBtn');

// 위치 감지 안내 토스트 메시지 요소를 가져옵니다
const locationNotice = document.getElementById('locationNotice');

// 측정소 카드들이 나열될 그리드 컨테이너 요소를 가져옵니다
const cardContainer = document.getElementById('cardContainer');

// 지역명을 표시할 라벨 요소를 가져옵니다
const currentRegionName = document.getElementById('currentRegionName');

// 공기 신호등 전체 카드 컨테이너 요소를 가져옵니다
const trafficCard = document.getElementById('trafficCard');

// 공기 신호등 대형 이모지(🔵🟢🟠🔴) 요소를 가져옵니다
const trafficEmoji = document.getElementById('trafficEmoji');

// 공기 신호등 대표 상태 텍스트(좋음/보통/나쁨/매우나쁨) 요소를 가져옵니다
const trafficStatusText = document.getElementById('trafficStatusText');

// 지역 평균 미세먼지 수치를 표시할 숫자 텍스트 요소를 가져옵니다
const averageValue = document.getElementById('averageValue');

// 신호등 아래 한 줄 안내 문구 요소를 가져옵니다 (나쁨 이상이면 '외출 시 마스크를 챙기세요')
const trafficAdvice = document.getElementById('trafficAdvice');

// 상위 10개 막대그래프 섹션 요소를 가져옵니다
const chartSection = document.getElementById('chartSection');

// Chart.js 캔버스 요소를 가져옵니다
const dustChartCanvas = document.getElementById('dustChart');

// 로딩 안내 메시지 영역 요소를 가져옵니다
const loadingElement = document.getElementById('loading');

// 오류 안내 메시지 영역 요소를 가져옵니다
const errorElement = document.getElementById('errorMessage');

// 상세 오류 내용을 표시할 텍스트 요소를 가져옵니다
const errorText = document.getElementById('errorText');

// Chart.js 인스턴스를 저장할 변수입니다 (기존 차트 갱신/파괴용)
let dustChartInstance = null;

// 위치 안내 토스트 타이머 변수입니다
let noticeTimeout = null;

// 대한민국 17개 시도별 대표 중심 좌표 목록입니다 (GPS 거리 계산 대비용)
const REGION_CENTERS = [
  { name: '서울', lat: 37.5665, lon: 126.9780 },
  { name: '부산', lat: 35.1796, lon: 129.0756 },
  { name: '대구', lat: 35.8714, lon: 128.6014 },
  { name: '인천', lat: 37.4563, lon: 126.7052 },
  { name: '광주', lat: 35.1595, lon: 126.8526 },
  { name: '대전', lat: 36.3504, lon: 127.3845 },
  { name: '울산', lat: 35.5384, lon: 129.3114 },
  { name: '세종', lat: 36.4800, lon: 127.2890 },
  { name: '경기', lat: 37.2636, lon: 127.0286 },
  { name: '강원', lat: 37.8854, lon: 127.7298 },
  { name: '충북', lat: 36.6424, lon: 127.4890 },
  { name: '충남', lat: 36.6588, lon: 126.6728 },
  { name: '전북', lat: 35.8242, lon: 127.1480 },
  { name: '전남', lat: 34.8161, lon: 126.4629 },
  { name: '경북', lat: 36.5760, lon: 128.5056 },
  { name: '경남', lat: 35.2383, lon: 128.6924 },
  { name: '제주', lat: 33.4996, lon: 126.5312 }
];

// 등급 번호(1~4)에 따른 CSS 클래스, 이모지, 명칭 및 생활 안내 문구 매핑 객체입니다
const GRADE_CONFIG = {
  '1': {
    className: 'grade-1',
    trafficClass: 'traffic-grade-1',
    text: '좋음',
    emoji: '🔵',
    advice: '공기가 맑고 쾌적해요! 산책하기 좋은 날이에요.'
  },
  '2': {
    className: 'grade-2',
    trafficClass: 'traffic-grade-2',
    text: '보통',
    emoji: '🟢',
    advice: '무난한 공기질이에요. 일상적인 야외활동이 가능해요.'
  },
  '3': {
    className: 'grade-3',
    trafficClass: 'traffic-grade-3',
    text: '나쁨',
    emoji: '🟠',
    advice: '외출 시 마스크를 챙기세요'
  },
  '4': {
    className: 'grade-4',
    trafficClass: 'traffic-grade-4',
    text: '매우나쁨',
    emoji: '🔴',
    advice: '외출 시 마스크를 챙기세요 (가급적 외출을 자제하세요)'
  }
};

// 가로 막대그래프 등급별 색상 매핑 객체입니다 (1 파랑, 2 초록, 3 주황, 4 빨강)
const CHART_BAR_COLORS = {
  '1': { bg: 'rgba(59, 130, 246, 0.85)', border: '#2563eb' }, // 파랑 (좋음)
  '2': { bg: 'rgba(16, 185, 129, 0.85)', border: '#059669' }, // 초록 (보통)
  '3': { bg: 'rgba(249, 115, 22, 0.85)', border: '#d97706' }, // 주황 (나쁨)
  '4': { bg: 'rgba(239, 68, 68, 0.85)', border: '#dc2626' }   // 빨강 (매우나쁨)
};

// 위치 안내 토스트 메시지를 화면에 띄우고 일정 시간 후 숨기는 함수입니다
function showLocationNotice(text) {
  // 기존 타이머가 작동 중이면 초기화합니다
  if (noticeTimeout) clearTimeout(noticeTimeout);
  // 안내 텍스트를 입력합니다
  locationNotice.textContent = text;
  // 화면에 안내 요소를 표시합니다
  locationNotice.style.display = 'inline-block';
  // 3.5초 후 자동으로 안내를 숨깁니다
  noticeTimeout = setTimeout(() => {
    locationNotice.style.display = 'none';
  }, 3500);
}

// 다양한 형태의 행정구역 텍스트를 18개 시도명 중 하나로 정규화하는 함수입니다
function mapToSidoName(rawText) {
  // 입력값이 없으면 null을 반환합니다
  if (!rawText) return null;
  // 공백을 제거하고 소문자로 통일합니다
  const str = String(rawText).toLowerCase().replace(/\s+/g, '');

  // 서울 매핑
  if (str.includes('서울') || str.includes('seoul')) return '서울';
  // 부산 매핑
  if (str.includes('부산') || str.includes('busan')) return '부산';
  // 대구 매핑
  if (str.includes('대구') || str.includes('daegu')) return '대구';
  // 인천 매핑
  if (str.includes('인천') || str.includes('incheon')) return '인천';
  // 광주 매핑
  if (str.includes('광주') || str.includes('gwangju')) return '광주';
  // 대전 매핑
  if (str.includes('대전') || str.includes('daejeon')) return '대전';
  // 울산 매핑
  if (str.includes('울산') || str.includes('ulsan')) return '울산';
  // 세종 매핑
  if (str.includes('세종') || str.includes('sejong')) return '세종';
  // 경기 매핑
  if (str.includes('경기') || str.includes('gyeonggi')) return '경기';
  // 강원 매핑
  if (str.includes('강원') || str.includes('gangwon')) return '강원';
  // 충북 매핑
  if (str.includes('충북') || str.includes('충청북') || str.includes('chungbuk') || str.includes('northchungcheong')) return '충북';
  // 충남 매핑
  if (str.includes('충남') || str.includes('충청남') || str.includes('chungnam') || str.includes('southchungcheong')) return '충남';
  // 전북 매핑
  if (str.includes('전북') || str.includes('전라북') || str.includes('jeonbuk') || str.includes('northjeolla')) return '전북';
  // 전남 매핑
  if (str.includes('전남') || str.includes('전라남') || str.includes('jeonnam') || str.includes('southjeolla')) return '전남';
  // 경북 매핑
  if (str.includes('경북') || str.includes('경상북') || str.includes('gyeongbuk') || str.includes('northgyeongsang')) return '경북';
  // 경남 매핑
  if (str.includes('경남') || str.includes('경상남') || str.includes('gyeongnam') || str.includes('southgyeongsang')) return '경남';
  // 제주 매핑
  if (str.includes('제주') || str.includes('jeju')) return '제주';

  // 일치하는 항목이 없을 경우 null을 반환합니다
  return null;
}

// GPS 위경도 좌표로부터 가장 가까운 시도 중심점을 찾는 함수입니다 (거리 기반 백업)
function findNearestRegion(lat, lon) {
  // 최소 거리 변수를 무한대로 초기화합니다
  let minDistance = Infinity;
  // 기본값을 서울로 지정합니다
  let closestRegion = '서울';

  // 각 시도 대표 좌표와의 유클리드 거리를 비교합니다
  for (const center of REGION_CENTERS) {
    const dLat = lat - center.lat;
    const dLon = lon - center.lon;
    const distSq = dLat * dLat + dLon * dLon;
    // 더 가까운 거리가 발견되면 갱신합니다
    if (distSq < minDistance) {
      minDistance = distSq;
      closestRegion = center.name;
    }
  }
  // 가장 가까운 시도 이름을 반환합니다
  return closestRegion;
}

// 사용자의 현재 위치를 자동으로 감지하여 시도명을 반환하는 함수입니다
async function detectUserRegion(forceDetect = false) {
  // 강제 재탐색이 아닌 경우, 기존에 저장된 사용자의 최근 선택 지역을 우선 확인합니다
  if (!forceDetect) {
    const savedRegion = localStorage.getItem('user_sido');
    // 저장된 지역이 유효한 옵션인지 검증합니다
    if (savedRegion && [...sidoSelect.options].some(opt => opt.value === savedRegion)) {
      showLocationNotice(`📍 최근 설정된 지역 [${savedRegion}]을(를) 불러왔습니다.`);
      return savedRegion;
    }
  }

  // 사용자에게 위치 확인 중임을 알립니다
  showLocationNotice('📍 현재 계신 위치를 확인하고 있습니다...');

  // 1단계: 브라우저 GPS 위치 정보(Geolocation)를 통한 고정밀 감지
  if ('geolocation' in navigator) {
    try {
      // 위치 좌표를 비동기로 받아옵니다 (4초 타임아웃)
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;

      // 1-1. 역지오코딩 API를 호출하여 정확한 한국 행정구역명을 가져옵니다
      try {
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ko`);
        const geoData = await geoRes.json();
        // 행정구역명(도/시)에서 시도명을 추출합니다
        const detected = mapToSidoName(geoData.principalSubdivision || geoData.city);
        if (detected) {
          showLocationNotice(`📍 GPS 기반으로 현재 지역 [${detected}]이(가) 선택되었습니다.`);
          return detected;
        }
      } catch (e) {
        console.warn('역지오코딩 통신 오류, 거리 계산으로 대체:', e);
      }

      // 1-2. 역지오코딩 실패 시 가장 가까운 지역 중심 좌표로 매칭합니다
      const nearest = findNearestRegion(latitude, longitude);
      showLocationNotice(`📍 위치 기반으로 가까운 지역 [${nearest}]이(가) 선택되었습니다.`);
      return nearest;
    } catch (geoError) {
      console.warn('GPS 위치 권한 거부 또는 시간 초과:', geoError);
    }
  }

  // 2단계: GPS가 비활성화되었거나 권한 거부 시 IP 주소 기반으로 지역 감지
  try {
    const ipRes = await fetch('https://ipwho.is/');
    const ipData = await ipRes.json();
    const detectedFromIp = mapToSidoName(ipData.region || ipData.city);
    if (detectedFromIp) {
      showLocationNotice(`📍 네트워크 기반으로 현재 지역 [${detectedFromIp}]이(가) 선택되었습니다.`);
      return detectedFromIp;
    }
  } catch (ipError) {
    console.warn('IP 기반 위치 감지 실패:', ipError);
  }

  // 3단계: 모든 위치 감지가 불가능한 경우 기본값 '서울'로 설정합니다
  showLocationNotice('📍 위치 감지가 어려워 기본값 [서울]로 시작합니다.');
  return '서울';
}

// 미세먼지 수치에 따라 등급 번호를 계산하는 함수입니다 (평균치 및 차트 등급 보정용)
function getGradeByPm10(value) {
  // 수치가 유효하지 않은 경우 빈 값을 반환합니다
  if (value === null || isNaN(value)) return null;
  // 30 이하이면 1등급(좋음)입니다
  if (value <= 30) return '1';
  // 80 이하이면 2등급(보통)입니다
  if (value <= 80) return '2';
  // 150 이하이면 3등급(나쁨)입니다
  if (value <= 150) return '3';
  // 151 이상이면 4등급(매우나쁨)입니다
  return '4';
}

// 측정 시각을 '2026년 10월 28일 16시 기준' 형식의 한국어로 변환하는 함수입니다
function formatKoreanTime(dataTimeStr) {
  // 날짜 문자열이 비어있으면 기본 문구를 반환합니다
  if (!dataTimeStr) return '측정 시각 정보 없음';
  // 'YYYY-MM-DD HH:mm' 형태의 정규식 매칭을 시도합니다
  const match = dataTimeStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/);
  // 매칭 성공 시 한국어 날짜 형식으로 조립합니다
  if (match) {
    const year = match[1];
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    return `${year}년 ${month}월 ${day}일 ${hour}시 기준`;
  }
  // 기본 패턴과 다르면 원본 뒤에 기준을 붙여 반환합니다
  return `${dataTimeStr} 기준`;
}

// 측정값이 '-' 이거나 유효하지 않을 때 처리해주는 포맷 함수입니다
function formatDustValue(value) {
  // 값이 없거나 '-' 문자열이면 '측정 안 됨' 문구를 반환합니다
  if (!value || value.trim() === '-' || isNaN(Number(value))) {
    return '측정 안 됨';
  }
  // 유효한 숫자이면 단위(㎍/㎥)와 함께 반환합니다
  return `${value} ㎍/㎥`;
}

// Vercel 서버리스 함수(/api/dust)를 호출하여 시도별 대기오염 정보를 받아오는 함수입니다
async function fetchAirPollutionData(sidoName) {
  // 기존 에러 메시지를 숨깁니다
  errorElement.style.display = 'none';
  // '불러오는 중...' 로딩 요소를 화면에 표시합니다
  loadingElement.style.display = 'block';
  // 기존 카드 목록을 비웁니다
  cardContainer.innerHTML = '';
  // 로딩 중에는 그래프 섹션을 잠시 숨깁니다
  chartSection.style.display = 'none';
  // 선택된 시도명을 공기 신호등 상단 라벨에 즉시 반영합니다
  currentRegionName.textContent = sidoName;

  // 데이터를 불러오는 동안 공기 신호등의 대표 상태 텍스트에 '불러오는 중...'을 표시합니다
  trafficStatusText.textContent = '불러오는 중...';
  // 불러오는 중에는 중립 이모지(⚪)를 표시합니다
  trafficEmoji.textContent = '⚪';
  // 평균 수치를 대기 상태로 초기화합니다
  averageValue.textContent = '-';
  // 안내 문구에도 불러오는 중임을 표시합니다
  trafficAdvice.textContent = '데이터를 불러오는 중입니다...';
  // 신호등 카드 테마를 회색으로 초기화합니다
  trafficCard.className = 'traffic-card traffic-grade-gray';

  try {
    // /api/dust?sido=시도이름 주소로 GET 요청을 전송합니다
    const response = await fetch(`${API_ENDPOINT}?sido=${encodeURIComponent(sidoName)}`);

    // 응답 결과를 JSON 객체로 파싱합니다
    const data = await response.json();

    // 서버리스 함수에서 error 응답을 반환했거나 상태 코드가 정상이 아닌 경우
    if (!response.ok || data.error) {
      throw new Error(data.error || `서버 응답 오류 (상태 코드: ${response.status})`);
    }

    // 정상 데이터 구조(response.body.items)인지 확인합니다
    const items = data?.response?.body?.items;

    // 측정소 목록이 비어 있거나 없는 경우의 예외 처리입니다
    if (!items || items.length === 0) {
      // 로딩 요소를 숨깁니다
      loadingElement.style.display = 'none';
      // 에러 영역을 화면에 표시합니다
      errorElement.style.display = 'block';
      // 조회 결과 없음 문구를 출력합니다
      errorText.textContent = `${sidoName} 지역의 측정소 데이터가 없습니다.`;
      // 신호등 상태도 정보 없음으로 업데이트합니다
      trafficStatusText.textContent = '정보 없음';
      trafficAdvice.textContent = '조회 가능한 측정소 데이터가 없습니다.';
      return;
    }

    // 측정소 데이터를 기반으로 평균 계산, 차트 생성 및 카드 렌더링을 진행합니다
    renderData(items, sidoName);
  } catch (error) {
    // 콘솔에 에러 로그를 기록합니다
    console.error('대기오염 데이터 로딩 실패:', error);
    // 에러 영역을 표시합니다
    errorElement.style.display = 'block';
    // 서버가 전달한 한국어 에러 메시지를 사용자에게 안내합니다
    errorText.textContent = error.message;
    // 신호등 상태 텍스트를 오류로 변경합니다
    trafficStatusText.textContent = '오류 발생';
    trafficAdvice.textContent = '데이터를 정상적으로 가져오지 못했습니다.';
  } finally {
    // 통신 완료 후 로딩 표시를 숨깁니다
    loadingElement.style.display = 'none';
  }
}

// 가져온 측정 데이터를 화면에 계산, 차트 및 카드로 렌더링하는 함수입니다
function renderData(items, sidoName) {
  // 평균 계산을 위한 미세먼지 유효 수치 합계 변수입니다
  let pm10Sum = 0;
  // 평균 계산을 위한 유효 측정소 개수 변수입니다
  let pm10ValidCount = 0;

  // 카드 목록을 모두 초기화합니다
  cardContainer.innerHTML = '';

  // '측정 안 됨'을 제외한 유효 측정소만 담을 배열입니다 (그래프 생성용)
  const validStations = [];

  // 각 측정소 데이터를 반복하며 카드를 생성하고 평균용 수치를 합산합니다
  items.forEach(item => {
    // 미세먼지 수치 문자열을 가져옵니다
    const rawPm10 = item.pm10Value;
    // 수치가 유효하고 '-'가 아닌지 검사합니다
    const isPm10Valid = rawPm10 && rawPm10.trim() !== '-' && !isNaN(Number(rawPm10));

    // 유효한 수치인 경우에만 합산 및 유효 개수를 증가시킵니다
    if (isPm10Valid) {
      pm10Sum += Number(rawPm10);
      pm10ValidCount++;
      // 그래프용 유효 측정소 배열에 추가합니다
      validStations.push(item);
    }

    // 측정소 카드를 생성하여 그리드에 추가합니다
    const card = createStationCard(item);
    cardContainer.appendChild(card);
  });

  // 유효한 측정 수치가 하나 이상 있는 경우 공기 신호등을 업데이트합니다
  if (pm10ValidCount > 0) {
    // 소수점 첫째 자리에서 반올림하여 정수 평균값을 구합니다
    const avg = Math.round(pm10Sum / pm10ValidCount);
    // 화면에 평균 수치 숫자를 크게 표시합니다
    averageValue.textContent = avg;

    // 계산된 평균 수치로 대표 등급(1~4)을 산출합니다
    const calculatedGrade = getGradeByPm10(avg);
    // 해당 등급의 설정 정보(이모지, 텍스트, 안내문구)를 가져옵니다
    const gradeInfo = GRADE_CONFIG[calculatedGrade];

    // 대표 이모지(🔵🟢🟠🔴)를 대형으로 반영합니다
    trafficEmoji.textContent = gradeInfo.emoji;
    // 대표 상태명(좋음/보통/나쁨/매우나쁨)을 대형 폰트로 반영합니다
    trafficStatusText.textContent = gradeInfo.text;
    // 한 줄 안내 문구를 반영합니다 (나쁨 이상이면 '외출 시 마스크를 챙기세요')
    trafficAdvice.textContent = gradeInfo.advice;

    // 공기 신호등 카드의 테마 스타일 클래스를 적용합니다
    trafficCard.className = `traffic-card ${gradeInfo.trafficClass}`;

    // 수치가 높은 순으로 정렬하고 상위 10개만 가로 막대그래프로 그립니다 ('측정 안 됨' 제외)
    renderTop10Chart(validStations);
  } else {
    // 측정 가능한 데이터가 없는 경우의 처리입니다
    averageValue.textContent = '측정 안 됨';
    trafficEmoji.textContent = '⚪';
    trafficStatusText.textContent = '정보 없음';
    trafficAdvice.textContent = '유효한 측정 수치가 없어 신호등을 표시할 수 없습니다.';
    trafficCard.className = 'traffic-card traffic-grade-gray';
    // 유효 데이터가 없으므로 차트 영역을 숨깁니다
    chartSection.style.display = 'none';
  }
}

// 수치가 높은 순으로 상위 10개 측정소를 가로 막대그래프로 렌더링하는 함수입니다
function renderTop10Chart(validStations) {
  // 유효한 측정소가 없는 경우 차트 영역을 숨깁니다
  if (!validStations || validStations.length === 0) {
    chartSection.style.display = 'none';
    return;
  }

  // 차트 영역을 화면에 표시합니다
  chartSection.style.display = 'block';

  // 미세먼지 수치가 높은 순서(내림차순)로 정렬합니다
  const sortedStations = [...validStations].sort((a, b) => Number(b.pm10Value) - Number(a.pm10Value));

  // 상위 10개 측정소만 잘라냅니다
  const top10 = sortedStations.slice(0, 10);

  // 그래프 Y축 레이블(측정소명) 목록을 생성합니다
  const labels = top10.map(item => item.stationName || '알 수 없음');

  // 그래프 X축 데이터(미세먼지 수치 숫자) 목록을 생성합니다
  const dataValues = top10.map(item => Number(item.pm10Value));

  // 각 측정소의 등급(1~4)에 맞춰 막대 배경색 배열을 구성합니다
  const backgroundColors = top10.map(item => {
    // API 제공 등급이 있으면 사용하고, 없으면 수치 기반으로 산출합니다
    const grade = item.pm10Grade ? String(item.pm10Grade).trim() : getGradeByPm10(Number(item.pm10Value));
    // 등급 색상에 매핑하고 없으면 회색을 기본값으로 사용합니다
    return CHART_BAR_COLORS[grade]?.bg || 'rgba(148, 163, 184, 0.85)';
  });

  // 각 측정소의 등급에 맞춰 막대 테두리색 배열을 구성합니다
  const borderColors = top10.map(item => {
    const grade = item.pm10Grade ? String(item.pm10Grade).trim() : getGradeByPm10(Number(item.pm10Value));
    return CHART_BAR_COLORS[grade]?.border || '#64748b';
  });

  // 기존 차트 인스턴스가 존재하면 메모리 누수 방지를 위해 파괴합니다
  if (dustChartInstance) {
    dustChartInstance.destroy();
  }

  // Chart.js 가로 막대그래프(indexAxis: 'y')를 생성합니다
  dustChartInstance = new Chart(dustChartCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '미세먼지 (PM10)',
        data: dataValues,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y', // 가로 막대그래프로 설정합니다
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // 범례 숨김
        },
        tooltip: {
          callbacks: {
            // 마우스 호버 시 상세 단위를 포함하여 안내합니다
            label: (context) => ` 미세먼지: ${context.raw} ㎍/㎥`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          title: {
            display: true,
            text: '미세먼지 농도 (㎍/㎥)',
            font: {
              family: 'Pretendard, sans-serif',
              size: 12,
              weight: '600'
            },
            color: '#64748b'
          }
        },
        y: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: 'Pretendard, sans-serif',
              size: 13,
              weight: '700'
            },
            color: '#1e293b'
          }
        }
      }
    }
  });
}

// 개별 측정소 카드를 DOM 요소로 생성하는 함수입니다
function createStationCard(item) {
  // 새로운 카드 div 요소를 생성합니다
  const card = document.createElement('div');
  // 기본 station-card 클래스를 부여합니다
  card.className = 'station-card';

  // API에서 내려준 미세먼지 등급 값을 가져옵니다
  const gradeKey = item.pm10Grade ? String(item.pm10Grade).trim() : '';
  // 1~4등급 매핑 정보가 있는지 확인합니다
  const gradeInfo = GRADE_CONFIG[gradeKey];

  // 측정소 카드는 등급 색을 테두리와 배경에 은은하게 반영합니다 (grade-1, grade-2, grade-3, grade-4, grade-gray)
  if (gradeInfo) {
    card.classList.add(gradeInfo.className);
  } else {
    card.classList.add('grade-gray');
  }

  // 뱃지에 표시할 이모지와 텍스트를 결정합니다
  const badgeEmoji = gradeInfo ? gradeInfo.emoji : '⚪';
  const badgeText = gradeInfo ? gradeInfo.text : '정보 없음';

  // 미세먼지와 초미세먼지 값을 포맷팅합니다 ('-' 일 경우 '측정 안 됨'으로 표시)
  const displayPm10 = formatDustValue(item.pm10Value);
  const displayPm25 = formatDustValue(item.pm25Value);

  // 측정 시각을 '2026년 10월 28일 16시 기준'처럼 한국어로 변환합니다
  const koreanTime = formatKoreanTime(item.dataTime);

  // 카드의 내부 HTML 구조를 설정합니다
  card.innerHTML = `
    <div class="station-header">
      <div class="station-name">${item.stationName || '알 수 없음'}</div>
      <div class="station-badge">${badgeEmoji} ${badgeText}</div>
    </div>
    <div class="station-body">
      <div class="dust-info-row">
        <span class="label">미세먼지 (PM10)</span>
        <span class="value">${displayPm10}</span>
      </div>
      <div class="dust-info-row">
        <span class="label">초미세먼지 (PM2.5)</span>
        <span class="value">${displayPm25}</span>
      </div>
    </div>
    <div class="station-footer">${koreanTime}</div>
  `;

  // 완성된 카드 요소를 반환합니다
  return card;
}

// 드롭다운에서 사용자가 시·도를 수동으로 변경했을 때 실행되는 이벤트 리스너입니다
sidoSelect.addEventListener('change', (event) => {
  const chosenSido = event.target.value;
  // 선택한 지역을 브라우저 로컬스토리지에 저장하여 다음 방문 시에도 기억합니다
  localStorage.setItem('user_sido', chosenSido);
  // 선택된 시·도 값으로 데이터를 새로 조회합니다
  fetchAirPollutionData(chosenSido);
});

// 사용자가 '내 위치 찾기' 버튼을 클릭했을 때 현재 위치를 다시 감지합니다
locationBtn.addEventListener('click', async () => {
  // 위치를 강제로 다시 감지합니다
  const myRegion = await detectUserRegion(true);
  // 드롭다운 선택값을 변경합니다
  sidoSelect.value = myRegion;
  // 변경된 지역을 로컬스토리지에 저장합니다
  localStorage.setItem('user_sido', myRegion);
  // 해당 지역 대기오염 정보를 조회합니다
  fetchAirPollutionData(myRegion);
});

// 웹페이지가 처음 로드되었을 때 실행되는 초기화 이벤트 리스너입니다
window.addEventListener('DOMContentLoaded', async () => {
  // 현재 사용자 지역을 자동으로 감지합니다 (저장된 설정 우선 또는 GPS/IP 감지)
  const initialRegion = await detectUserRegion(false);
  // 드롭다운의 선택값을 감지된 지역으로 맞춥니다
  sidoSelect.value = initialRegion;
  // 감지된 지역의 대기오염 정보를 조회합니다
  fetchAirPollutionData(initialRegion);
});
