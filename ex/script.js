const API_URL = 'https://pokeapi.co/api/v2/pokemon';

// querySelector로 HTML 엘리먼트 일괄 매핑
const searchInput = document.querySelector('#search-input');
const searchBtn = document.querySelector('#search-btn');
const resultContainer = document.querySelector('#result-container');

/**
 * [💡 한글 검색 기능 확장을 위한 힌트 주석]
 * 1. 한글 포켓몬 이름을 입력했을 때 이를 API가 인식하려면, 먼저 포켓몬의 도감 번호(ID)나 영문명을 알아야 합니다.
 * 2. PokeAPI의 'pokemon-species' 리소스(https://pokeapi.co/api/v2/pokemon-species/?limit=1000)를 비동기로 호출하면,
 *    각 포켓몬의 ID별 한글명(names 배열 내 language.name === 'ko'인 값) 데이터를 일괄 조회할 수 있습니다.
 * 3. 이 일괄 조회한 데이터를 { "피카츄": 25, "꼬부기": 7 } 형태의 JSON Map 객체로 재가공하여 
 *    BOM의 localStorage에 'ko_poke_map' 키로 캐싱(caching)해 두세요.
 * 4. 이후 검색 버튼 클릭 시 입력값이 한글인지 검사하고, 한글이라면 로컬스토리지 캐시 맵에서 ID를 즉시 매핑(예: 25)하여
 *    axios.get(`${API_URL}/25`) 형태로 네트워크 지연 없이 최적화된 조회를 수행할 수 있습니다.
 */

// ==========================================
// 1. DOM 생성 및 UI 빌더 함수 (정석 조립 방식)
// ==========================================

function clearContainer(element) {
  element.innerHTML = '';
}

/**
 * [BOM / HTML5 Audio API 활용]
 * 포켓몬 울음소리 URL을 전달받아 백그라운드에서 재생하는 함수
 */
function playPokemonCry(cryUrl) {
  if (!cryUrl) return;
  const audio = new Audio(cryUrl);
  audio.volume = 0.4;
  audio.play().catch(err => console.error('울음소리 재생 실패:', err));
}

/**
 * 타입 뱃지 엘리먼트 생성
 */
function createTypeBadgeNode(typeName) {
  const badge = document.createElement('span');
  badge.className = `type-badge bg-${typeName}`;
  badge.textContent = typeName;
  return badge;
}

/**
 * 스탯 아이템(키, 몸무게 등) 엘리먼트 생성
 */
function createStatItemNode(label, value) {
  const item = document.createElement('div');
  item.className = 'stat-item';

  const valSpan = document.createElement('span');
  valSpan.className = 'stat-value';
  valSpan.textContent = value;

  const lblSpan = document.createElement('span');
  lblSpan.className = 'stat-label';
  lblSpan.textContent = label;

  item.appendChild(valSpan);
  item.appendChild(lblSpan);
  return item;
}

/**
 * 검색 상태에 따른 안내 카드 엘리먼트 생성 (초심자용 직관 코드)
 */
function showPlaceholderCard(container, emoji, message, description = '') {
  clearContainer(container);
  
  const card = document.createElement('div');
  card.className = 'result-card';

  // 1. 이미지 / 이모지 영역 생성
  const imgDiv = document.createElement('div');
  imgDiv.className = 'poke-img';
  
  // 이미지 주소일 경우와 텍스트(이모지)일 경우 분기 처리
  const isUrl = emoji.startsWith('http') || emoji.startsWith('/') || emoji.startsWith('.');
  if (isUrl) {
    const img = document.createElement('img');
    img.src = emoji;
    img.style.width = '120px';
    img.style.height = '120px';
    imgDiv.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.style.color = '#999';
    span.textContent = emoji;
    imgDiv.appendChild(span);
  }

  // 2. 메시지 영역 생성
  const nameDiv = document.createElement('div');
  nameDiv.className = 'poke-name';
  nameDiv.textContent = message;

  // 카드에 순서대로 부착
  card.appendChild(imgDiv);
  card.appendChild(nameDiv);

  // 3. 서브 설명 영역 생성 (있을 경우에만)
  if (description) {
    const descP = document.createElement('p');
    descP.style.color = '#666';
    descP.style.fontSize = '0.9rem';
    descP.innerHTML = description;
    card.appendChild(descP);
  }

  container.appendChild(card);
}


// ==========================================
// 2. 단일 포켓몬 카드 노드 조립 빌더 (정석 방식)
// ==========================================

function createPokemonCardNode(pokemon) {
  const card = document.createElement('div');
  card.className = 'result-card';

  // 1. 이미지 영역 생성 및 부착
  const imgDiv = document.createElement('div');
  imgDiv.className = 'poke-img';
  imgDiv.style.borderStyle = 'solid';
  imgDiv.style.borderColor = '#eee';

  const img = document.createElement('img');
  // 고화질 오피셜 아트워크가 없으면 기본 스프라이트 활용
  img.src = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
  img.alt = pokemon.name;
  img.style.width = '120px';
  img.style.height = '120px';
  imgDiv.appendChild(img);

  // 2. 포켓몬 이름 & 번호 영역 생성 및 부착
  const nameDiv = document.createElement('div');
  nameDiv.className = 'poke-name';
  nameDiv.textContent = pokemon.name;

  const idSpan = document.createElement('span');
  idSpan.style.color = '#888';
  idSpan.style.fontSize = '1.1rem';
  idSpan.style.marginLeft = '5px';
  idSpan.textContent = `#${String(pokemon.id).padStart(4, '0')}`;
  nameDiv.appendChild(idSpan);

  // 3. 속성 타입 뱃지 영역 생성 및 부착
  const typesDiv = document.createElement('div');
  typesDiv.className = 'poke-types';
  pokemon.types.forEach(item => {
    const badge = createTypeBadgeNode(item.type.name);
    typesDiv.appendChild(badge);
  });

  // 4. 스탯 수치 영역 생성 및 부착
  const statsDiv = document.createElement('div');
  statsDiv.className = 'poke-stats';
  
  const height = pokemon.height / 10; // dm -> m 변환
  const weight = pokemon.weight / 10; // hg -> kg 변환
  
  const heightNode = createStatItemNode('Height', `${height}m`);
  const weightNode = createStatItemNode('Weight', `${weight}kg`);
  
  statsDiv.appendChild(heightNode);
  statsDiv.appendChild(weightNode);

  // 5. 🔊 울음소리 버튼 생성 및 부착
  const cryUrl = pokemon.cries && pokemon.cries.latest;
  const cryBtn = document.createElement('button');
  cryBtn.style.cssText = [
    'margin-top: 8px',
    'padding: 5px 14px',
    'border: 1px solid #ccc',
    'border-radius: 4px',
    'background: #f8f9fa',
    'cursor: pointer',
    'font-size: 0.85rem',
    'font-weight: bold',
    'transition: background 0.2s'
  ].join(';');

  if (cryUrl) {
    cryBtn.textContent = '🔊 울음소리 듣기';
    cryBtn.addEventListener('click', () => playPokemonCry(cryUrl));
    cryBtn.addEventListener('mouseover', () => { cryBtn.style.background = '#e9ecef'; });
    cryBtn.addEventListener('mouseout',  () => { cryBtn.style.background = '#f8f9fa'; });
  } else {
    cryBtn.textContent = '🔇 울음소리 없음';
    cryBtn.disabled = true;
    cryBtn.style.color = '#aaa';
    cryBtn.style.cursor = 'not-allowed';
  }

  // 6. 최종 카드로 부착
  card.appendChild(imgDiv);
  card.appendChild(nameDiv);
  card.appendChild(typesDiv);
  card.appendChild(statsDiv);
  card.appendChild(cryBtn);

  return card;
}


// ==========================================
// 3. 비동기 검색 및 BOM 해시 동기화 흐름 쪼개기
// ==========================================

// URL hash 갱신 (BOM 연동)
function syncUrlHash(hashValue) {
  if (window.location.hash.substring(1) !== hashValue) {
    window.location.hash = hashValue;
  }
}

/**
 * 포켓몬 비동기 검색 수행 함수
 */
async function searchPokemon(pokemonName) {
  const name = pokemonName.trim().toLowerCase();
  if (!name) return;

  showPlaceholderCard(resultContainer, '...', '불러오는 중');

  try {
    // Axios 비동기 GET 호출
    const response = await axios.get(`${API_URL}/${name}`);
    const pokeData = response.data;

    // 화면 갱신
    clearContainer(resultContainer);
    resultContainer.appendChild(createPokemonCardNode(pokeData));

    // URL hash 갱신
    syncUrlHash(name);

  } catch (error) {
    console.error('Pokemon Search Error:', error);
    showPlaceholderCard(
      resultContainer, 
      '❌', 
      '검색 실패', 
      `"${name}"을(를) 찾을 수 없습니다.<br>영문명을 다시 확인해 주세요.`
    );
  }
}

// 검색 이벤트 트리거 핸들러
function handleSearchTrigger() {
  searchPokemon(searchInput.value);
}


// ==========================================
// 4. 메인 이벤트 바인딩 (DOM / Event / BOM)
// ==========================================

// 검색 버튼 클릭
searchBtn.addEventListener('click', handleSearchTrigger);

// 검색 입력창 엔터 키 입력
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleSearchTrigger();
  }
});

// 브라우저 뒤로가기/앞으로가기 등으로 해시가 변경될 때 (BOM 이벤트)
window.addEventListener('hashchange', () => {
  const hashName = window.location.hash.substring(1);
  if (hashName) {
    searchInput.value = hashName;
    searchPokemon(hashName);
  }
});

// 페이지 초기 렌더링 시
window.addEventListener('DOMContentLoaded', () => {
  const initialHash = window.location.hash.substring(1);
  if (initialHash) {
    searchInput.value = initialHash;
    searchPokemon(initialHash);
  } else {
    showPlaceholderCard(resultContainer, '검색 대기', '포켓몬을 검색해 주세요');
  }
});
