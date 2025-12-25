// Firebase Configuration
// Credenciais padrão do projeto "word"
const defaultFirebaseConfig = {
    apiKey: "AIzaSyDAjPtokFAFJOOza4TRw6Tru5KxjCb04ys",
    authDomain: "word-b41e0.firebaseapp.com",
    databaseURL: "https://word-b41e0-default-rtdb.firebaseio.com",
    projectId: "word-b41e0",
    storageBucket: "word-b41e0.firebasestorage.app",
    messagingSenderId: "1009938456124",
    appId: "1:1009938456124:web:a565353f45916907caed39"
};

let firebaseConfig = null;
let app = null;
let database = null;

// Game State
let wordList = [];
let currentWordIndex = 0;
let userWords = {};

// Common English words for the game
const commonWords = [
    { word: "house", definition: "a building for human habitation", translation: "casa" },
    { word: "beautiful", definition: "pleasing to the senses or mind aesthetically", translation: "belo" },
    { word: "serendipity", definition: "the occurrence of pleasant things that happen by chance", translation: "serendipidade" },
    { word: "ephemeral", definition: "lasting for a very short time", translation: "efêmero" },
    { word: "ubiquitous", definition: "present, appearing, or found everywhere", translation: "onipresente" },
    { word: "eloquent", definition: "fluent or persuasive in speaking or writing", translation: "eloquente" },
    { word: "resilient", definition: "able to withstand or recover quickly from difficult conditions", translation: "resiliente" },
    { word: "meticulous", definition: "showing great attention to detail; very careful and precise", translation: "meticuloso" },
    { word: "ambiguous", definition: "having more than one possible meaning; unclear", translation: "ambíguo" },
    { word: "profound", definition: "very great or intense; having deep insight", translation: "profundo" },
    { word: "diligent", definition: "having or showing care and conscientiousness in one's work", translation: "diligente" },
    { word: "pragmatic", definition: "dealing with things sensibly and realistically", translation: "pragmático" },
    { word: "tenacious", definition: "tending to keep a firm hold of something; persistent", translation: "tenaz" },
    { word: "voracious", definition: "wanting or devouring great quantities of food or knowledge", translation: "voraz" },
    { word: "serene", definition: "calm, peaceful, and untroubled", translation: "sereno" },
    { word: "ardent", definition: "enthusiastic or passionate", translation: "ardente" },
    { word: "cogent", definition: "clear, logical, and convincing", translation: "cogente" },
    { word: "lucid", definition: "expressed clearly; easy to understand", translation: "lúcido" },
    { word: "pervasive", definition: "spreading widely throughout an area or group of people", translation: "pervasivo" },
    { word: "resilient", definition: "able to recover quickly from difficulties", translation: "resiliente" },
    { word: "sophisticated", definition: "having a refined knowledge of the ways of the world", translation: "sofisticado" },
    { word: "tangible", definition: "perceptible by touch; clear and definite", translation: "tangível" },
    { word: "versatile", definition: "able to adapt or be adapted to many different functions", translation: "versátil" },
    { word: "witty", definition: "showing or characterized by quick and inventive verbal humor", translation: "espirituoso" },
    { word: "zealous", definition: "showing great energy or passion in pursuit of a cause", translation: "zeloso" },
    { word: "abundant", definition: "existing in large quantities; plentiful", translation: "abundante" },
    { word: "coherent", definition: "logical and consistent; forming a unified whole", translation: "coerente" },
    { word: "diverse", definition: "showing a great deal of variety; very different", translation: "diverso" },
    { word: "efficient", definition: "achieving maximum productivity with minimum wasted effort", translation: "eficiente" },
    { word: "genuine", definition: "truly what something is said to be; authentic", translation: "genuíno" },
    { word: "humble", definition: "having or showing a modest or low estimate of one's importance", translation: "humilde" },
    { word: "innovative", definition: "featuring new methods; advanced and original", translation: "inovador" },
    { word: "keen", definition: "having or showing eagerness or enthusiasm", translation: "ansioso" },
    { word: "logical", definition: "of or according to the rules of logic or formal argument", translation: "lógico" },
    { word: "mature", definition: "fully developed physically; full-grown", translation: "maduro" },
    { word: "noble", definition: "having or showing fine personal qualities or high moral principles", translation: "nobre" },
    { word: "optimistic", definition: "hopeful and confident about the future", translation: "otimista" },
    { word: "precise", definition: "marked by exactness and accuracy of expression or detail", translation: "preciso" },
    { word: "rational", definition: "based on or in accordance with reason or logic", translation: "racional" },
    { word: "sincere", definition: "free from pretense or deceit; proceeding from genuine feelings", translation: "sincero" },
    { word: "thorough", definition: "complete with regard to every detail; not superficial", translation: "completo" },
    { word: "unique", definition: "being the only one of its kind; unlike anything else", translation: "único" },
    { word: "vibrant", definition: "full of energy and enthusiasm", translation: "vibrante" },
    { word: "wise", definition: "having or showing experience, knowledge, and good judgment", translation: "sábio" },
    { word: "youthful", definition: "characteristic of young people", translation: "jovem" },
    { word: "zeal", definition: "great energy or enthusiasm in pursuit of a cause", translation: "zelo" },
    { word: "ambitious", definition: "having or showing a strong desire and determination to succeed", translation: "ambicioso" },
    { word: "brilliant", definition: "exceptionally clever or talented", translation: "brilhante" },
    { word: "creative", definition: "relating to or involving the use of imagination or original ideas", translation: "criativo" },
    { word: "dynamic", definition: "characterized by constant change, activity, or progress", translation: "dinâmico" },
    { word: "enthusiastic", definition: "having or showing intense and eager enjoyment, interest, or approval", translation: "entusiasta" }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    prefillFirebaseConfig();
    loadFirebaseConfig();
    setupEventListeners();
    shuffleArray(commonWords);
    wordList = [...commonWords];
});

// Prefill Firebase config fields with default values
function prefillFirebaseConfig() {
    // Only prefill if fields are empty and no saved config exists
    if (!localStorage.getItem('firebaseConfig')) {
        document.getElementById('apiKey').value = defaultFirebaseConfig.apiKey;
        document.getElementById('authDomain').value = defaultFirebaseConfig.authDomain;
        document.getElementById('databaseURL').value = defaultFirebaseConfig.databaseURL;
        document.getElementById('projectId').value = defaultFirebaseConfig.projectId;
        document.getElementById('storageBucket').value = defaultFirebaseConfig.storageBucket;
        document.getElementById('messagingSenderId').value = defaultFirebaseConfig.messagingSenderId;
        document.getElementById('appId').value = defaultFirebaseConfig.appId;
    }
}

// Load Firebase config from localStorage
function loadFirebaseConfig() {
    const saved = localStorage.getItem('firebaseConfig');
    if (saved) {
        try {
            firebaseConfig = JSON.parse(saved);
            initializeFirebase();
        } catch (e) {
            console.error('Error loading config:', e);
            // If saved config is invalid, use default
            firebaseConfig = defaultFirebaseConfig;
            initializeFirebase();
        }
    }
}

// Save Firebase config to localStorage
function saveFirebaseConfig() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const authDomain = document.getElementById('authDomain').value.trim();
    const databaseURL = document.getElementById('databaseURL').value.trim();
    const projectId = document.getElementById('projectId').value.trim();
    const storageBucket = document.getElementById('storageBucket').value.trim();
    const messagingSenderId = document.getElementById('messagingSenderId').value.trim();
    const appId = document.getElementById('appId').value.trim();
    
    // Validate that all fields are filled
    if (!apiKey || !authDomain || !databaseURL || !projectId || !storageBucket || !messagingSenderId || !appId) {
        showStatus('Preencha todos os campos!', 'error');
        return;
    }
    
    firebaseConfig = {
        apiKey: apiKey,
        authDomain: authDomain,
        databaseURL: databaseURL,
        projectId: projectId,
        storageBucket: storageBucket,
        messagingSenderId: messagingSenderId,
        appId: appId
    };
    
    localStorage.setItem('firebaseConfig', JSON.stringify(firebaseConfig));
    initializeFirebase();
    showStatus('Configuração salva!', 'success');
}

// Initialize Firebase
async function initializeFirebase() {
    if (!firebaseConfig || !firebaseConfig.apiKey) {
        return;
    }

    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
        const { getDatabase } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        
        // Hide config panel and show game
        document.getElementById('firebase-config').style.display = 'none';
        document.getElementById('btnStartGame').style.display = 'inline-block';
        document.getElementById('btnViewWords').style.display = 'inline-block';
        
        // Load user words
        await loadUserWords();
        await loadStatistics();
    } catch (error) {
        console.error('Firebase initialization error:', error);
        showStatus('Erro ao inicializar Firebase. Verifique as credenciais.', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('saveConfig').addEventListener('click', saveFirebaseConfig);
    document.getElementById('btnStartGame').addEventListener('click', startGame);
    document.getElementById('btnViewWords').addEventListener('click', viewWords);
    document.getElementById('btnBackToGame').addEventListener('click', backToGame);
    
    document.getElementById('btnKnow').addEventListener('click', () => saveWord('mastered', 90));
    document.getElementById('btnLearning').addEventListener('click', () => saveWord('learning', 50));
    document.getElementById('btnDontKnow').addEventListener('click', () => saveWord('unknown', 0));
    document.getElementById('btnSkip').addEventListener('click', nextWord);
    document.getElementById('btnAddManual').addEventListener('click', addManualWord);
    
    document.getElementById('manualWord').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addManualWord();
        }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterWords(btn.dataset.filter);
        });
    });
}

// Start game
function startGame() {
    document.getElementById('game').style.display = 'block';
    document.getElementById('wordsList').style.display = 'none';
    document.getElementById('btnBackToGame').style.display = 'none';
    document.getElementById('btnStartGame').style.display = 'none';
    document.getElementById('btnViewWords').style.display = 'inline-block';
    
    currentWordIndex = 0;
    showCurrentWord();
}

// View words list
function viewWords() {
    document.getElementById('game').style.display = 'none';
    document.getElementById('wordsList').style.display = 'block';
    document.getElementById('btnBackToGame').style.display = 'inline-block';
    document.getElementById('btnStartGame').style.display = 'inline-block';
    document.getElementById('btnViewWords').style.display = 'none';
    
    displayWordsList();
}

// Back to game
function backToGame() {
    startGame();
}

// Show current word
function showCurrentWord() {
    if (currentWordIndex >= wordList.length) {
        document.getElementById('currentWord').textContent = 'Fim do jogo!';
        document.getElementById('wordDefinition').textContent = 'Você revisou todas as palavras. Adicione mais palavras ou reinicie!';
        return;
    }

    const word = wordList[currentWordIndex];
    document.getElementById('currentWord').textContent = word.word;
    document.getElementById('wordDefinition').textContent = word.definition || '';
    document.getElementById('currentIndex').textContent = currentWordIndex + 1;
    document.getElementById('totalWordsGame').textContent = wordList.length;
    
    // Update progress bar
    const progress = ((currentWordIndex + 1) / wordList.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

// Next word
function nextWord() {
    currentWordIndex++;
    if (currentWordIndex < wordList.length) {
        showCurrentWord();
    } else {
        showCurrentWord();
    }
}

// Save word to Firebase
async function saveWord(status, confidence) {
    if (!database) {
        showStatus('Firebase não configurado!', 'error');
        return;
    }

    const word = wordList[currentWordIndex];
    const wordId = word.word.toLowerCase();
    
    const { ref, set } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
    
    const wordData = {
        word: wordId,
        status: status,
        confidence: confidence,
        translation_pt: word.translation || '',
        definition_en: word.definition || '',
        difficulty: getDifficulty(word.word),
        frequency: getFrequency(word.word),
        contexts: {
            game: {
                confidence: confidence,
                last_seen: new Date().toISOString().split('T')[0]
            }
        },
        first_seen: new Date().toISOString(),
        last_reviewed: new Date().toISOString(),
        sources: [{
            type: 'game',
            name: 'Word Game',
            date: new Date().toISOString().split('T')[0]
        }],
        metadata: {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    };

    try {
        const wordRef = ref(database, `users/claudio_olmedo/words/${wordId}`);
        await set(wordRef, wordData);
        
        userWords[wordId] = wordData;
        
        showStatus(`Palavra "${word.word}" salva como ${status}!`, 'success');
        await updateStatistics();
        await loadStatistics();
        
        // Auto advance after 1 second
        setTimeout(() => {
            nextWord();
        }, 1000);
    } catch (error) {
        console.error('Error saving word:', error);
        showStatus('Erro ao salvar palavra. Verifique as permissões do Firebase.', 'error');
    }
}

// Add manual word
async function addManualWord() {
    const input = document.getElementById('manualWord');
    const wordText = input.value.trim().toLowerCase();
    
    if (!wordText) {
        showStatus('Digite uma palavra!', 'error');
        return;
    }

    if (!database) {
        showStatus('Firebase não configurado!', 'error');
        return;
    }

    // Add to word list
    const newWord = {
        word: wordText,
        definition: '',
        translation: ''
    };
    
    wordList.push(newWord);
    input.value = '';
    
    // Save to Firebase
    await saveWord('unknown', 0);
    showStatus(`Palavra "${wordText}" adicionada!`, 'success');
}

// Load user words from Firebase
async function loadUserWords() {
    if (!database) return;

    try {
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        const wordsRef = ref(database, 'users/claudio_olmedo/words');
        const snapshot = await get(wordsRef);
        
        if (snapshot.exists()) {
            userWords = snapshot.val();
        }
    } catch (error) {
        console.error('Error loading words:', error);
    }
}

// Load statistics
async function loadStatistics() {
    if (!database) return;

    try {
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        const statsRef = ref(database, 'users/claudio_olmedo/statistics');
        const snapshot = await get(statsRef);
        
        if (snapshot.exists()) {
            const stats = snapshot.val();
            document.getElementById('totalWords').textContent = stats.total_words || 0;
            document.getElementById('masteredWords').textContent = stats.mastered_count || 0;
            document.getElementById('learningWords').textContent = stats.learning_count || 0;
            document.getElementById('avgConfidence').textContent = (stats.total_confidence_avg || 0) + '%';
            document.getElementById('stats').style.display = 'grid';
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Update statistics
async function updateStatistics() {
    if (!database) return;

    const stats = {
        total_words: Object.keys(userWords).length,
        mastered_count: 0,
        learning_count: 0,
        unknown_count: 0,
        blocker_count: 0,
        total_confidence_avg: 0,
        words_by_difficulty: {
            basic: 0,
            intermediate: 0,
            advanced: 0
        },
        last_activity: new Date().toISOString()
    };

    let totalConfidence = 0;
    let wordsWithConfidence = 0;

    Object.values(userWords).forEach(word => {
        if (word.status === 'mastered') stats.mastered_count++;
        else if (word.status === 'learning') stats.learning_count++;
        else if (word.status === 'unknown') stats.unknown_count++;
        else if (word.status === 'blocker') stats.blocker_count++;

        if (word.difficulty) {
            stats.words_by_difficulty[word.difficulty] = 
                (stats.words_by_difficulty[word.difficulty] || 0) + 1;
        }

        if (word.confidence !== undefined) {
            totalConfidence += word.confidence;
            wordsWithConfidence++;
        }
    });

    stats.total_confidence_avg = wordsWithConfidence > 0 
        ? Math.round(totalConfidence / wordsWithConfidence) 
        : 0;

    try {
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        const statsRef = ref(database, 'users/claudio_olmedo/statistics');
        await set(statsRef, stats);
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Display words list
function displayWordsList(filter = 'all') {
    const container = document.getElementById('wordsContainer');
    container.innerHTML = '';

    let wordsToShow = Object.values(userWords);
    
    if (filter !== 'all') {
        wordsToShow = wordsToShow.filter(word => word.status === filter);
    }

    if (wordsToShow.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Nenhuma palavra encontrada. Comece a jogar para adicionar palavras!</p>';
        return;
    }

    wordsToShow.sort((a, b) => a.word.localeCompare(b.word));

    wordsToShow.forEach(word => {
        const wordDiv = document.createElement('div');
        wordDiv.className = `word-item ${word.status}`;
        
        wordDiv.innerHTML = `
            <div class="word-item-header">
                <span class="word-item-word">${word.word}</span>
                <span class="word-item-confidence">${word.confidence || 0}%</span>
            </div>
            ${word.translation_pt ? `<div class="word-item-translation">${word.translation_pt}</div>` : ''}
            <span class="word-item-status ${word.status}">${getStatusLabel(word.status)}</span>
        `;
        
        container.appendChild(wordDiv);
    });
}

// Filter words
function filterWords(filter) {
    displayWordsList(filter);
}

// Helper functions
function getDifficulty(word) {
    const length = word.length;
    if (length <= 4) return 'basic';
    if (length <= 7) return 'intermediate';
    return 'advanced';
}

function getFrequency(word) {
    // Simple heuristic based on word length
    if (word.length <= 4) return 'very_high';
    if (word.length <= 6) return 'high';
    if (word.length <= 8) return 'medium';
    return 'low';
}

function getStatusLabel(status) {
    const labels = {
        mastered: 'Dominada',
        learning: 'Aprendendo',
        unknown: 'Desconhecida',
        blocker: 'Bloqueadora'
    };
    return labels[status] || status;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type} show`;
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 3000);
}

