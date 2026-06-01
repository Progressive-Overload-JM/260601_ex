console.log("포켓몬 박사의 연구실 스크립트 로드 완료");

// DOM Elements
const form = document.querySelector("#searchForm");
const result = document.querySelector("#searchResult");
const speechText = document.querySelector("#professorSpeech");

// Speech bubble typewriter controller variable
let speechTimeout;

// 1. Initial Greetings
window.addEventListener("DOMContentLoaded", () => {
    typeWriterSpeech("어서 오게나, 젊은이! 나는 이 연구소를 지키는 포켓몬 박사 오박사라네. 자, 알고 싶은 포켓몬의 이름(한글/영문)이나 도감 번호를 우측 상단에 입력하여 도감을 가동해보게!");
});

// Event Listener
form.addEventListener("submit", searchFormHandler);

// Event Handler
async function searchFormHandler(event) {
    event.preventDefault();
    console.log("검색 핸들러 실행");
    
    const searchInput = getFormData(event).get("search").trim().toLowerCase();
    if (!searchInput) return;

    // Show loading state in Pokédex screen
    drawLoadingScreen();
    
    // Professor loading speech
    typeWriterSpeech("음! 도감 데이터베이스에서 분석을 요청한 포켓몬을 열심히 찾고 있으니 잠시만 기다려주게...");

    try {
        const pokeData = await getPokeData(searchInput);
        console.log("조회된 포켓몬 데이터:", pokeData);
        
        // Draw details to Pokédex screen
        drawPoke(pokeData);
        
        // Professor introduces the Pokémon and reads the official flavor text
        const introText = `아하! 이 포켓몬은 바로 '${pokeData.koName}'(이)로군! ${pokeData.flavorText}`;
        typeWriterSpeech(introText);
        
        // Trigger stat progress bars filled animation after render
        setTimeout(() => {
            animateStatBars(pokeData.stats);
        }, 100);

    } catch (error) {
        console.error("포켓몬 검색 에러:", error);
        drawErrorScreen();
        typeWriterSpeech("어라라... 아무리 내 도감 데이터베이스를 샅샅이 뒤져도 해당 정보가 나오지 않는구려. 혹시 포켓몬의 철자가 올바른지, 혹은 존재하는 도감 번호인지 다시 한번 확인해주겠나?");
    }
}

// 2. Data Fetching Logic (Base & Species with Korean Support)
async function getPokeData(search) {
    const apiURL = `https://pokeapi.co/api/v2/pokemon/${search}`;
    const response = await axios.get(apiURL);
    const data = response.data;

    // Fetch species data for Korean name and Flavor text (Description)
    const response2 = await axios.get(data.species.url);
    const speciesData = response2.data;

    // Find Korean Name
    const nameEntry = speciesData.names.find((item) => item.language.name === "ko");
    data.koName = nameEntry ? nameEntry.name : data.name;

    // Find first Korean flavor text entry (Pokédex description)
    const flavorEntry = speciesData.flavor_text_entries.find((item) => item.language.name === "ko");
    if (flavorEntry) {
        // Clean up page break (\f) and line breaks (\n) for clean sentence
        data.flavorText = flavorEntry.flavor_text
            .replace(/\f/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .trim();
    } else {
        data.flavorText = "이 포켓몬에 대해서는 아직 도감 연구가 활발히 진행 중인 모양이라네!";
    }

    return data;
}

// 3. UI Drawing Functions
function drawPoke(data) {
    // Official high-res artwork or fallback to default sprite
    const officialArtwork = data.sprites.other?.['official-artwork']?.front_default;
    const pokemonImg = officialArtwork || data.sprites.front_default;

    // Map types
    const typesHtml = data.types.map(t => {
        const engType = t.type.name;
        const koType = translateType(engType);
        return `<span class="type-badge type-${engType}">${koType}</span>`;
    }).join('');

    // Height & Weight conversions (decimeters -> meters, hectograms -> kg)
    const heightMeters = (data.height / 10).toFixed(1);
    const weightKg = (data.weight / 10).toFixed(1);

    // Audio cry handler (latest or legacy cry)
    const cryUrl = data.cries?.latest || data.cries?.legacy || "";
    const cryButtonHtml = cryUrl 
        ? `<div class="cry-player-wrapper">
             <button id="cryBtn" class="btn-cry">
                 <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                 울음소리 듣기
                 <audio id="pokeCry" src="${cryUrl}"></audio>
             </button>
           </div>`
        : "";

    // Stats variables
    const statsMap = {};
    data.stats.forEach(s => {
        statsMap[s.stat.name] = s.base_stat;
    });

    result.innerHTML = `
        <div class="pokemon-details-card">
            <!-- Left Side: Hologram Visualization -->
            <div class="pokedex-visualizer">
                <div class="holo-pedestal-container">
                    <div class="hologram-glow-circle"></div>
                    <img src="${pokemonImg}" alt="${data.koName}" class="pokemon-sprite" />
                    <div class="holo-floor"></div>
                    <div class="holo-ray"></div>
                </div>
                ${cryButtonHtml}
            </div>

            <!-- Right Side: Numerical & Visual Stats Grid -->
            <div class="pokedex-info-panel">
                <div>
                    <span class="pokedex-id-tag">NO. ${String(data.id).padStart(4, '0')}</span>
                    <div class="pokemon-name-block">
                        <h2 class="pokemon-ko-name">${data.koName}</h2>
                        <span class="pokemon-en-name">${data.name}</span>
                    </div>
                </div>

                <div class="pokemon-types">
                    ${typesHtml}
                </div>

                <div class="pokemon-physical-properties">
                    <div class="phys-box">
                        <span class="label">키 (HEIGHT)</span>
                        <span class="value">${heightMeters} m</span>
                    </div>
                    <div class="phys-box">
                        <span class="label">몸무게 (WEIGHT)</span>
                        <span class="value">${weightKg} kg</span>
                    </div>
                </div>

                <div class="pokemon-stats-block">
                    <!-- HP -->
                    <div class="stat-row stat-hp">
                        <span class="stat-label">체력 HP</span>
                        <span class="stat-value">${statsMap['hp'] || 0}</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar-fill" data-stat-val="${statsMap['hp'] || 0}"></div>
                        </div>
                    </div>
                    <!-- ATTACK -->
                    <div class="stat-row stat-atk">
                        <span class="stat-label">공격력 ATK</span>
                        <span class="stat-value">${statsMap['attack'] || 0}</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar-fill" data-stat-val="${statsMap['attack'] || 0}"></div>
                        </div>
                    </div>
                    <!-- DEFENSE -->
                    <div class="stat-row stat-def">
                        <span class="stat-label">방어력 DEF</span>
                        <span class="stat-value">${statsMap['defense'] || 0}</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar-fill" data-stat-val="${statsMap['defense'] || 0}"></div>
                        </div>
                    </div>
                    <!-- SPECIAL ATTACK -->
                    <div class="stat-row stat-sp-atk">
                        <span class="stat-label">특공 S.ATK</span>
                        <span class="stat-value">${statsMap['special-attack'] || 0}</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar-fill" data-stat-val="${statsMap['special-attack'] || 0}"></div>
                        </div>
                    </div>
                    <!-- SPECIAL DEFENSE -->
                    <div class="stat-row stat-sp-def">
                        <span class="stat-label">특방 S.DEF</span>
                        <span class="stat-value">${statsMap['special-defense'] || 0}</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar-fill" data-stat-val="${statsMap['special-defense'] || 0}"></div>
                        </div>
                    </div>
                    <!-- SPEED -->
                    <div class="stat-row stat-speed">
                        <span class="stat-label">스피드 SPD</span>
                        <span class="stat-value">${statsMap['speed'] || 0}</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar-fill" data-stat-val="${statsMap['speed'] || 0}"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Bind custom audio cry play button
    const cryBtn = document.querySelector("#cryBtn");
    if (cryBtn) {
        cryBtn.addEventListener("click", () => {
            const audio = document.querySelector("#pokeCry");
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(e => console.warn("오디오 재생 불가:", e));
            }
        });
    }
}

// 4. Loading & Error screens
function drawLoadingScreen() {
    result.innerHTML = `
        <div class="welcome-screen">
            <div class="pokeball-loading-icon spinning">
                <div class="pokeball-top"></div>
                <div class="pokeball-center"></div>
                <div class="pokeball-bottom"></div>
            </div>
            <h3 style="color: var(--neon-cyan);">분석 시스템 가동 중...</h3>
            <p>오박사의 메인프레임에서 포켓몬 데이터를 매핑하고 있습니다. 화면에 주사선이 로드될 때까지 대기해 주십시오.</p>
        </div>
    `;
}

function drawErrorScreen() {
    result.innerHTML = `
        <div class="welcome-screen">
            <div class="pokeball-loading-icon" style="border-color: var(--neon-red);">
                <div class="pokeball-top" style="background-color: var(--neon-red);"></div>
                <div class="pokeball-center"></div>
                <div class="pokeball-bottom"></div>
            </div>
            <h3 style="color: var(--neon-red);">조회 에러: 데이터 부재</h3>
            <p>검색한 식별자(한글/영문/번호)에 대한 정보를 찾을 수 없습니다. 오박사의 설명과 힌트를 참고하십시오.</p>
        </div>
    `;
}

// 5. Utilities
function getFormData(event) {
    const formData = new FormData(event.target);
    return formData;
}

// Typewriter animation utility for Professor Oak's speech
function typeWriterSpeech(text) {
    if (!speechText) return;
    
    // Clear any running typewriter timeout
    clearTimeout(speechTimeout);
    speechText.textContent = "";
    
    let index = 0;
    function type() {
        if (index < text.length) {
            speechText.textContent += text.charAt(index);
            index++;
            speechTimeout = setTimeout(type, 25); // 25ms delay per char for snappy animation
        }
    }
    type();
}

// Stat bar fill visualizer animator
function animateStatBars() {
    const bars = document.querySelectorAll(".stat-bar-fill");
    bars.forEach(bar => {
        const val = parseInt(bar.getAttribute("data-stat-val")) || 0;
        // Standard maximum base stat is 255 (e.g. Blissey HP)
        const percent = Math.min((val / 255) * 100, 100);
        bar.style.width = `${percent}%`;
    });
}

// English to Korean translation for Pokémon Types
function translateType(type) {
    const mapping = {
        normal: "노말",
        fire: "불꽃",
        water: "물",
        grass: "풀",
        electric: "전기",
        ice: "얼음",
        fighting: "격투",
        poison: "독",
        ground: "땅",
        flying: "비행",
        psychic: "에스퍼",
        bug: "벌레",
        rock: "바위",
        ghost: "고스트",
        dragon: "드래곤",
        steel: "강철",
        fairy: "페어리",
        dark: "악"
    };
    return mapping[type] || type;
}