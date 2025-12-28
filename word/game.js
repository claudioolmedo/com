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
    // Inicializar com todas as palavras, será filtrado quando Firebase carregar
    wordList = [...commonWords];
    
    // Atualizar estatísticas quando a página recebe foco (volta de um jogo)
    // Usar debounce para evitar múltiplas chamadas
    let statsUpdateTimeout = null;
    const updateStatsOnFocus = async () => {
        if (statsUpdateTimeout) {
            clearTimeout(statsUpdateTimeout);
        }
        statsUpdateTimeout = setTimeout(async () => {
            if (database) {
                console.log('Página voltou ao foco, atualizando estatísticas...');
                try {
                    await loadUserWords();
                    await updateStatistics();
                    await loadStatistics();
                } catch (error) {
                    console.error('Erro ao atualizar estatísticas:', error);
                }
            }
        }, 500); // Debounce de 500ms
    };
    
    document.addEventListener('visibilitychange', updateStatsOnFocus);
    window.addEventListener('focus', updateStatsOnFocus);
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
    
    // Validações adicionais
    if (!apiKey.startsWith('AIza')) {
        showStatus('API Key inválida. Deve começar com "AIza"', 'error');
        return;
    }
    
    if (!databaseURL.startsWith('https://') || !databaseURL.includes('firebaseio.com')) {
        showStatus('Database URL inválida. Deve ser uma URL do Firebase', 'error');
        return;
    }
    
    if (!authDomain.includes('firebaseapp.com')) {
        showStatus('Auth Domain inválido. Deve incluir "firebaseapp.com"', 'error');
        return;
    }
    
    try {
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
    } catch (error) {
        console.error('Error saving Firebase config:', error);
        showStatus('Erro ao salvar configuração. Verifique os dados.', 'error');
    }
}

// Initialize Firebase
async function initializeFirebase() {
    if (!firebaseConfig || !firebaseConfig.apiKey) {
        return;
    }

    try {
        // Mostrar loading
        const configPanel = document.getElementById('firebase-config');
        const saveBtn = document.getElementById('saveConfig');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Conectando...';
        }
        
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
        const { getDatabase } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        
        // Verificar se já existe uma app inicializada
        try {
            app = initializeApp(firebaseConfig);
        } catch (e) {
            // Se já existe, usar a existente
            if (e.code === 'app/duplicate-app') {
                console.log('Firebase app já inicializada, usando instância existente');
                const { getApps, getApp } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
                const apps = getApps();
                if (apps.length > 0) {
                    app = getApp();
                }
            } else {
                throw e;
            }
        }
        
        database = getDatabase(app);
        
        // Hide config panel and show games menu
        if (configPanel) configPanel.style.display = 'none';
        const gamesMenu = document.getElementById('gamesMenu');
        if (gamesMenu) gamesMenu.style.display = 'block';
        const btnViewWords = document.getElementById('btnViewWords');
        if (btnViewWords) btnViewWords.style.display = 'inline-block';
        const btnRefreshStats = document.getElementById('btnRefreshStats');
        if (btnRefreshStats) btnRefreshStats.style.display = 'inline-block';
        
        // Importar e inicializar game-engine
        const { initEngine, loadUserWords: loadWordsEngine, updateStatistics: updateStatsEngine } = await import('./js/game-engine.js');
        initEngine(database);
        
        // Load user words usando game-engine
        await loadWordsEngine();
        
        // Filtrar palavras já mastered da lista inicial
        filterMasteredWords();
        
        // Atualizar estatísticas antes de carregar (garantir que estão atualizadas)
        await updateStatsEngine();
        await loadStatistics();
        
        // Configurar listener para atualizar estatísticas quando palavras mudarem
        await setupStatisticsListener();
        
        showStatus('Firebase conectado com sucesso!', 'success');
    } catch (error) {
        console.error('Firebase initialization error:', error);
        const errorMsg = error.message || 'Erro desconhecido';
        showStatus(`Erro ao inicializar Firebase: ${errorMsg}. Verifique as credenciais.`, 'error');
        
        // Restaurar botão
        const saveBtn = document.getElementById('saveConfig');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salvar Configuração';
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('saveConfig').addEventListener('click', saveFirebaseConfig);
    document.getElementById('btnViewWords').addEventListener('click', viewWords);
    document.getElementById('btnBackToGames').addEventListener('click', backToGames);
    
    // Botão para atualizar estatísticas manualmente
    const btnRefreshStats = document.getElementById('btnRefreshStats');
    if (btnRefreshStats) {
        btnRefreshStats.addEventListener('click', async () => {
            btnRefreshStats.disabled = true;
            btnRefreshStats.textContent = '🔄 Atualizando...';
            
            try {
                await loadUserWords();
                await updateStatistics();
                await loadStatistics();
                showStatus('Estatísticas atualizadas!', 'success');
            } catch (error) {
                console.error('Erro ao atualizar estatísticas:', error);
                showStatus('Erro ao atualizar estatísticas', 'error');
            } finally {
                btnRefreshStats.disabled = false;
                btnRefreshStats.textContent = '🔄 Atualizar Estatísticas';
            }
        });
    }
    
    // Event listeners com tratamento de erro
    const btnKnow = document.getElementById('btnKnow');
    const btnLearning = document.getElementById('btnLearning');
    const btnDontKnow = document.getElementById('btnDontKnow');
    const btnSkip = document.getElementById('btnSkip');
    const btnAddManual = document.getElementById('btnAddManual');
    
    if (btnKnow) btnKnow.addEventListener('click', () => saveWord('mastered', 90));
    if (btnLearning) btnLearning.addEventListener('click', () => saveWord('learning', 50));
    if (btnDontKnow) btnDontKnow.addEventListener('click', () => saveWord('unknown', 0));
    if (btnSkip) btnSkip.addEventListener('click', nextWord);
    if (btnAddManual) btnAddManual.addEventListener('click', addManualWord);
    
    const manualWordInput = document.getElementById('manualWord');
    if (manualWordInput) {
        manualWordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addManualWord();
            }
        });
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterWords(btn.dataset.filter);
        });
    });
}

// View words list
function viewWords() {
    document.getElementById('gamesMenu').style.display = 'none';
    document.getElementById('wordsList').style.display = 'block';
    document.getElementById('btnBackToGames').style.display = 'inline-block';
    document.getElementById('btnViewWords').style.display = 'none';
    
    displayWordsList();
}

// Back to games menu
function backToGames() {
    document.getElementById('gamesMenu').style.display = 'block';
    document.getElementById('wordsList').style.display = 'none';
    document.getElementById('btnBackToGames').style.display = 'none';
    document.getElementById('btnViewWords').style.display = 'inline-block';
}

// Filtrar palavras já mastered da lista
function filterMasteredWords() {
    // Se userWords não está disponível ainda, não filtrar
    if (!userWords || typeof userWords !== 'object') {
        return;
    }
    
    const wordCount = Object.keys(userWords).length;
    if (wordCount === 0) {
        // Se não há palavras no Firebase, manter lista original
        return;
    }
    
    const originalLength = wordList.length;
    const removedWords = [];
    
    // Filtrar palavras que não estão mastered (ou não estão no Firebase)
    wordList = wordList.filter(word => {
        if (!word || !word.word) return false;
        const wordId = word.word.toLowerCase();
        const wordInfo = userWords[wordId];
        
        // Se não está no Firebase, incluir (palavra nova)
        if (!wordInfo) return true;
        
        // Se está mastered com confiança alta, excluir
        if (wordInfo.status === 'mastered' && (wordInfo.confidence || 0) >= 80) {
            removedWords.push(word.word);
            return false;
        }
        
        // Incluir palavras learning, unknown ou com baixa confiança
        return true;
    });
    
    if (removedWords.length > 0) {
        console.log(`✅ Filtradas ${removedWords.length} palavras já mastered: ${removedWords.join(', ')}`);
        console.log(`📊 Restam ${wordList.length} palavras para revisar (de ${originalLength} originais)`);
    }
    
    // Resetar índice se necessário
    if (currentWordIndex >= wordList.length && wordList.length > 0) {
        currentWordIndex = 0;
    }
}

// Show current word
function showCurrentWord() {
    // Filtrar palavras mastered antes de mostrar
    filterMasteredWords();
    
    if (currentWordIndex >= wordList.length) {
        if (wordList.length === 0) {
            document.getElementById('currentWord').textContent = 'Parabéns!';
            document.getElementById('wordDefinition').textContent = 'Você já conhece todas as palavras disponíveis! Adicione novas palavras para continuar aprendendo.';
        } else {
            document.getElementById('currentWord').textContent = 'Fim do jogo!';
            document.getElementById('wordDefinition').textContent = 'Você revisou todas as palavras. Adicione mais palavras ou reinicie!';
        }
        return;
    }

    const word = wordList[currentWordIndex];
    if (!word) {
        nextWord();
        return;
    }
    
    document.getElementById('currentWord').textContent = word.word;
    document.getElementById('wordDefinition').textContent = word.definition || '';
    document.getElementById('currentIndex').textContent = currentWordIndex + 1;
    document.getElementById('totalWordsGame').textContent = wordList.length;
    
    // Update progress bar
    const progress = wordList.length > 0 ? ((currentWordIndex + 1) / wordList.length) * 100 : 0;
    document.getElementById('progressBar').style.width = progress + '%';
}

// Next word
function nextWord() {
    // Filtrar palavras mastered antes de avançar
    filterMasteredWords();
    
    currentWordIndex++;
    if (currentWordIndex >= wordList.length) {
        currentWordIndex = 0; // Voltar ao início se chegou ao fim
    }
    
    showCurrentWord();
}

// Save word to Firebase
async function saveWord(status, confidence) {
    if (!database) {
        showStatus('Firebase não configurado!', 'error');
        return;
    }

    if (currentWordIndex >= wordList.length || !wordList[currentWordIndex]) {
        showStatus('Nenhuma palavra disponível!', 'error');
        return;
    }

    const word = wordList[currentWordIndex];
    if (!word || !word.word) {
        showStatus('Palavra inválida!', 'error');
        return;
    }

    const wordId = word.word.toLowerCase();
    
    // Verificar se a palavra já existe no Firebase
    const existingWord = userWords[wordId];
    
    const { ref, set } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
    
    // Preservar dados existentes ou criar novos
    const wordData = {
        word: wordId,
        status: status,
        confidence: confidence,
        translation_pt: word.translation || existingWord?.translation_pt || '',
        definition_en: word.definition || existingWord?.definition_en || '',
        difficulty: getDifficulty(word.word),
        frequency: getFrequency(word.word),
        contexts: {
            ...(existingWord?.contexts || {}),
            game: {
                confidence: confidence,
                last_seen: new Date().toISOString().split('T')[0]
            }
        },
        first_seen: existingWord?.first_seen || new Date().toISOString(),
        last_reviewed: new Date().toISOString(),
        sources: [
            ...(existingWord?.sources || []),
            {
                type: 'game',
                name: 'Word Game',
                date: new Date().toISOString().split('T')[0]
            }
        ],
        metadata: {
            created_at: existingWord?.metadata?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    };
    
    // Preservar tentativas e acertos se existirem
    if (existingWord) {
        if (existingWord.attempts !== undefined) wordData.attempts = existingWord.attempts;
        if (existingWord.correct_answers !== undefined) wordData.correct_answers = existingWord.correct_answers;
    }

    try {
        console.log(`💾 Salvando palavra "${word.word}" com status: ${status}, confiança: ${confidence}`);
        
        const wordRef = ref(database, `users/claudio_olmedo/words/${wordId}`);
        await set(wordRef, wordData);
        
        console.log(`✅ Palavra "${word.word}" salva no Firebase`);
        
        // Atualizar cache local imediatamente ANTES de atualizar estatísticas
        userWords[wordId] = wordData;
        console.log(`📝 Cache local atualizado. Total de palavras no cache: ${Object.keys(userWords).length}`);
        
        // Atualizar no game-engine
        const { initEngine, loadUserWords: loadWordsEngine, updateStatistics: updateStatsEngine, updateWordInCache } = await import('./js/game-engine.js');
        if (database) {
            initEngine(database);
            
            // Atualizar cache do game-engine imediatamente (antes de recarregar)
            updateWordInCache(wordId, wordData);
            
            // Recarregar palavras para garantir sincronização completa
            await loadWordsEngine();
            
            // Atualizar estatísticas IMEDIATAMENTE após salvar
            console.log('🔄 Atualizando estatísticas após salvar palavra...');
            const updatedStats = await updateStatsEngine();
            console.log('📊 Estatísticas atualizadas:', updatedStats);
            
            // Atualizar UI das estatísticas
            if (updatedStats) {
                updateStatisticsUIFromStats(updatedStats);
            }
        }
        
        // Atualizar estatísticas na UI também (garantir dupla atualização)
        await loadStatistics();
        
        showStatus(`Palavra "${word.word}" salva como ${status}!`, 'success');
        
        // Se a palavra foi marcada como mastered, remover da lista
        if (status === 'mastered' && confidence >= 80) {
            console.log(`🗑️ Removendo palavra mastered "${word.word}" da lista`);
            // Remover palavra atual da lista
            const removedIndex = currentWordIndex;
            wordList = wordList.filter((w, idx) => {
                if (idx === removedIndex) {
                    console.log(`   Removida: ${w.word}`);
                    return false;
                }
                return true;
            });
            console.log(`📋 Lista atualizada: ${wordList.length} palavras restantes`);
            
            // Ajustar índice
            if (currentWordIndex >= wordList.length && wordList.length > 0) {
                currentWordIndex = Math.max(0, wordList.length - 1);
            } else if (wordList.length === 0) {
                currentWordIndex = 0;
            }
        } else {
            // Avançar para próxima palavra normalmente
            currentWordIndex++;
        }
        
        // Filtrar palavras mastered antes de mostrar próxima
        filterMasteredWords();
        
        // Mostrar próxima palavra após 1 segundo
        setTimeout(() => {
            showCurrentWord();
        }, 1000);
    } catch (error) {
        console.error('❌ Error saving word:', error);
        showStatus('Erro ao salvar palavra. Verifique as permissões do Firebase.', 'error');
    }
}

// Add manual word
async function addManualWord() {
    const input = document.getElementById('manualWord');
    const wordText = input.value.trim().toLowerCase();
    
    // Validação melhorada
    if (!wordText) {
        showStatus('Digite uma palavra!', 'error');
        input.focus();
        return;
    }
    
    // Validar que é uma palavra válida (apenas letras, hífen ou apóstrofo)
    if (!/^[a-z]+([-']?[a-z]+)*$/.test(wordText)) {
        showStatus('Digite uma palavra válida (apenas letras)!', 'error');
        input.focus();
        return;
    }
    
    // Verificar se a palavra já está mastered no Firebase
    if (userWords[wordText]) {
        const wordInfo = userWords[wordText];
        if (wordInfo.status === 'mastered' && wordInfo.confidence >= 80) {
            showStatus(`A palavra "${wordText}" já está mastered! Não precisa revisar.`, 'info');
            input.value = '';
            input.focus();
            return;
        }
    }
    
    // Verificar se a palavra já existe na lista
    if (wordList.some(w => w.word.toLowerCase() === wordText)) {
        showStatus(`A palavra "${wordText}" já está na lista!`, 'error');
        input.focus();
        return;
    }

    if (!database) {
        showStatus('Firebase não configurado!', 'error');
        return;
    }

    try {
        // Add to word list
        const newWord = {
            word: wordText,
            definition: '',
            translation: ''
        };
        
        wordList.push(newWord);
        input.value = '';
        
        // Ir para a nova palavra
        currentWordIndex = wordList.length - 1;
        showCurrentWord();
        
        // Save to Firebase (mas não avançar automaticamente)
        const wordId = wordText.toLowerCase();
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        
        const wordData = {
            word: wordId,
            status: 'unknown',
            confidence: 0,
            translation_pt: '',
            definition_en: '',
            difficulty: getDifficulty(wordText),
            frequency: getFrequency(wordText),
            contexts: {
                game: {
                    confidence: 0,
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
        
        const wordRef = ref(database, `users/claudio_olmedo/words/${wordId}`);
        await set(wordRef, wordData);
        
        // Atualizar cache local
        userWords[wordId] = wordData;
        
        // Atualizar estatísticas
        await loadStatistics();
        
        showStatus(`Palavra "${wordText}" adicionada!`, 'success');
    } catch (error) {
        console.error('Error adding manual word:', error);
        showStatus('Erro ao adicionar palavra. Tente novamente.', 'error');
    }
}

// Load user words from Firebase - delega para game-engine
async function loadUserWords() {
    try {
        const { loadUserWords: loadWordsEngine } = await import('./js/game-engine.js');
        const loadedWords = await loadWordsEngine();
        userWords = loadedWords || {};
        
        const totalWords = Object.keys(userWords).length;
        const masteredCount = Object.values(userWords).filter(w => w.status === 'mastered').length;
        
        console.log(`📚 Carregadas ${totalWords} palavras do Firebase (${masteredCount} mastered)`);
        
        // Filtrar palavras mastered após carregar
        filterMasteredWords();
        
        return userWords;
    } catch (error) {
        console.error('❌ Error loading words:', error);
        return {};
    }
}

// Cache para evitar múltiplas chamadas simultâneas
let isLoadingStatistics = false;

// Load statistics
async function loadStatistics() {
    if (!database) {
        console.log('❌ Database não inicializado, não é possível carregar estatísticas');
        return;
    }

    // Evitar múltiplas chamadas simultâneas
    if (isLoadingStatistics) {
        console.log('⏳ Estatísticas já estão sendo carregadas, aguardando...');
        return;
    }

    isLoadingStatistics = true;

    try {
        // Primeiro, garantir que temos as palavras mais recentes
        await loadUserWords();
        
        // Depois, calcular estatísticas atualizadas
        console.log('🔄 Calculando estatísticas atualizadas...');
        const stats = await updateStatistics();
        
        if (stats) {
            console.log('✅ Estatísticas atualizadas e exibidas:', stats);
        } else {
            // Se updateStatistics falhou, tentar carregar do Firebase
            const { ref, get } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
            const statsRef = ref(database, 'users/claudio_olmedo/statistics');
            const snapshot = await get(statsRef);
            
            if (snapshot.exists()) {
                const stats = snapshot.val();
                console.log('📊 Estatísticas carregadas do Firebase:', stats);
                updateStatisticsUIFromStats(stats);
            } else {
                console.log('⚠️ Nenhuma estatística encontrada, usando valores zerados');
                updateStatisticsUIFromStats({
                    total_words: 0,
                    mastered_count: 0,
                    learning_count: 0,
                    unknown_count: 0,
                    total_confidence_avg: 0
                });
            }
        }
    } catch (error) {
        console.error('❌ Error loading statistics:', error);
    } finally {
        isLoadingStatistics = false;
    }
}

// Função auxiliar para atualizar UI
function updateStatisticsUIFromStats(stats) {
    const totalWordsEl = document.getElementById('totalWords');
    const masteredWordsEl = document.getElementById('masteredWords');
    const learningWordsEl = document.getElementById('learningWords');
    const avgConfidenceEl = document.getElementById('avgConfidence');
    const statsPanel = document.getElementById('stats');
    
    console.log('🎨 Atualizando UI das estatísticas:', stats);
    
    if (totalWordsEl) {
        const oldValue = totalWordsEl.textContent;
        totalWordsEl.textContent = stats.total_words || 0;
        if (oldValue !== totalWordsEl.textContent) {
            console.log(`   ✅ Total: ${oldValue} → ${totalWordsEl.textContent}`);
        }
    }
    
    if (masteredWordsEl) {
        const oldValue = masteredWordsEl.textContent;
        masteredWordsEl.textContent = stats.mastered_count || 0;
        if (oldValue !== masteredWordsEl.textContent) {
            console.log(`   ✅ Mastered: ${oldValue} → ${masteredWordsEl.textContent}`);
        }
    }
    
    if (learningWordsEl) {
        const oldValue = learningWordsEl.textContent;
        learningWordsEl.textContent = stats.learning_count || 0;
        if (oldValue !== learningWordsEl.textContent) {
            console.log(`   ✅ Learning: ${oldValue} → ${learningWordsEl.textContent}`);
        }
    }
    
    if (avgConfidenceEl) {
        const oldValue = avgConfidenceEl.textContent;
        avgConfidenceEl.textContent = (stats.total_confidence_avg || 0) + '%';
        if (oldValue !== avgConfidenceEl.textContent) {
            console.log(`   ✅ Confiança: ${oldValue} → ${avgConfidenceEl.textContent}`);
        }
    }
    
    if (statsPanel) statsPanel.style.display = 'grid';
}

// Configurar listener para atualizar estatísticas em tempo real
async function setupStatisticsListener() {
    if (!database) return;
    
    try {
        const { ref, onValue } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        const statsRef = ref(database, 'users/claudio_olmedo/statistics');
        
        onValue(statsRef, (snapshot) => {
            if (snapshot.exists()) {
                const stats = snapshot.val();
                console.log('Estatísticas atualizadas em tempo real:', stats);
                
                const totalWordsEl = document.getElementById('totalWords');
                const masteredWordsEl = document.getElementById('masteredWords');
                const learningWordsEl = document.getElementById('learningWords');
                const avgConfidenceEl = document.getElementById('avgConfidence');
                
                if (totalWordsEl) totalWordsEl.textContent = stats.total_words || 0;
                if (masteredWordsEl) masteredWordsEl.textContent = stats.mastered_count || 0;
                if (learningWordsEl) learningWordsEl.textContent = stats.learning_count || 0;
                if (avgConfidenceEl) avgConfidenceEl.textContent = (stats.total_confidence_avg || 0) + '%';
            }
        });
    } catch (error) {
        console.error('Error setting up statistics listener:', error);
    }
}

// Update statistics - delega para game-engine
async function updateStatistics() {
    // Importar função do game-engine
    const { updateStatistics: updateStatsEngine } = await import('./js/game-engine.js');
    return await updateStatsEngine();
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

