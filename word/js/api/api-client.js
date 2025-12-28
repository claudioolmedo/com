// API Client - Cliente para consultar a API do sistema de vocabulário
// Pode ser usado por outras IAs ou aplicações

const API_KEY = 'wlwheklsheio23890w';
let database = null;

// Inicializar com Firebase
export async function initAPI(firebaseConfig) {
    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
        const { getDatabase, ref, get } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        
        const app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        return true;
    } catch (error) {
        console.error('API initialization error:', error);
        return false;
    }
}

// Verificar conhecimento de uma palavra
export async function checkWord(word, apiKey = API_KEY) {
    if (!database) {
        throw new Error('API not initialized');
    }
    
    try {
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        const wordId = word.toLowerCase();
        const wordRef = ref(database, `users/claudio_olmedo/words/${wordId}`);
        const snapshot = await get(wordRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            return {
                known: data.status !== 'unknown',
                confidence: data.confidence || 0,
                status: data.status,
                lastSeen: data.last_reviewed,
                translation: data.translation_pt,
                definition: data.definition_en
            };
        }
        
        return {
            known: false,
            confidence: 0,
            status: 'unknown',
            lastSeen: null
        };
    } catch (error) {
        console.error('Error checking word:', error);
        throw error;
    }
}

// Verificar múltiplas palavras
export async function checkWordsBatch(words, apiKey = API_KEY) {
    const results = {};
    const promises = words.map(async (word) => {
        const result = await checkWord(word, apiKey);
        results[word.toLowerCase()] = result;
    });
    
    await Promise.all(promises);
    return results;
}

// Obter estatísticas
export async function getStats(apiKey = API_KEY) {
    if (!database) {
        throw new Error('API not initialized');
    }
    
    try {
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        const statsRef = ref(database, 'users/claudio_olmedo/statistics');
        const snapshot = await get(statsRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        }
        
        return {
            total_words: 0,
            mastered_count: 0,
            learning_count: 0,
            unknown_count: 0,
            total_confidence_avg: 0
        };
    } catch (error) {
        console.error('Error getting stats:', error);
        throw error;
    }
}

// Analisar texto
export async function analyzeText(text, minConfidence = 50, apiKey = API_KEY) {
    // Extrair palavras do texto
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .filter((word, index, self) => self.indexOf(word) === index); // remover duplicatas
    
    const analysis = {
        total_words: words.length,
        known_words: [],
        unknown_words: [],
        known_percentage: 0
    };
    
    let knownCount = 0;
    
    for (const word of words) {
        const knowledge = await checkWord(word, apiKey);
        if (knowledge.confidence >= minConfidence && knowledge.known) {
            analysis.known_words.push({
                word: word,
                confidence: knowledge.confidence,
                status: knowledge.status
            });
            knownCount++;
        } else {
            analysis.unknown_words.push(word);
        }
    }
    
    analysis.known_percentage = analysis.total_words > 0 
        ? Math.round((knownCount / analysis.total_words) * 100) 
        : 0;
    
    return analysis;
}

// Listar palavras com filtros
export async function listWords(filters = {}, apiKey = API_KEY) {
    if (!database) {
        throw new Error('API not initialized');
    }
    
    try {
        const { ref, get, query, orderByChild, equalTo } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        let wordsRef = ref(database, 'users/claudio_olmedo/words');
        
        // Aplicar filtros
        if (filters.status) {
            wordsRef = query(wordsRef, orderByChild('status'), equalTo(filters.status));
        } else if (filters.difficulty) {
            wordsRef = query(wordsRef, orderByChild('difficulty'), equalTo(filters.difficulty));
        }
        
        const snapshot = await get(wordsRef);
        
        if (snapshot.exists()) {
            return Object.values(snapshot.val());
        }
        
        return [];
    } catch (error) {
        console.error('Error listing words:', error);
        throw error;
    }
}

// Função helper para validar API key
export function validateAPIKey(apiKey) {
    return apiKey === API_KEY;
}

