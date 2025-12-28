// Game Engine - Sistema unificado para todos os jogos
// Gerencia detecção de conhecimento, salvamento no Firebase e estatísticas

let database = null;
let userWords = {};
let statistics = {};

// Exportar userWords para acesso externo se necessário
export function getUserWords() {
    return userWords;
}

// Inicializar engine com Firebase
export function initEngine(firebaseDatabase) {
    database = firebaseDatabase;
}

// Carregar palavras do usuário do Firebase
export async function loadUserWords() {
    if (!database) {
        console.log('Database não inicializado em loadUserWords');
        return {};
    }
    
    try {
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        const wordsRef = ref(database, 'users/claudio_olmedo/words');
        const snapshot = await get(wordsRef);
        
        if (snapshot.exists()) {
            const loadedWords = snapshot.val() || {};
            userWords = loadedWords;
            const count = Object.keys(userWords).length;
            const masteredCount = Object.values(userWords).filter(w => w && w.status === 'mastered').length;
            console.log(`✅ Carregadas ${count} palavras do Firebase (${masteredCount} mastered)`);
            return userWords;
        } else {
            console.log('Nenhuma palavra encontrada no Firebase');
            userWords = {};
            return {};
        }
    } catch (error) {
        console.error('❌ Error loading user words:', error);
        return {};
    }
}

// Atualizar palavra no cache local (sem recarregar do Firebase)
export function updateWordInCache(wordId, wordData) {
    if (userWords && wordId) {
        userWords[wordId] = wordData;
        console.log(`📝 Palavra "${wordId}" atualizada no cache do game-engine`);
    }
}

// Obter informação de uma palavra específica
export function getWordInfo(word) {
    const wordId = word.toLowerCase();
    return userWords[wordId] || null;
}

// Calcular confiança baseado em múltiplos fatores
export function calculateConfidence(gameResult) {
    const {
        correct,           // boolean - resposta correta?
        speed,             // number - tempo em ms (menor = melhor)
        attempts,          // number - tentativas anteriores
        previousCorrect,   // number - acertos anteriores
        contextUsed,       // boolean - usou contexto?
        difficulty         // string - dificuldade da palavra
    } = gameResult;
    
    let confidence = 0;
    
    // Base: resposta correta = 40 pontos
    if (correct) {
        confidence += 40;
        
        // Velocidade: resposta rápida = até 20 pontos
        if (speed < 2000) confidence += 20; // < 2s = muito rápido
        else if (speed < 5000) confidence += 15; // < 5s = rápido
        else if (speed < 10000) confidence += 10; // < 10s = normal
        else confidence += 5; // > 10s = lento
        
        // Consistência: acertos repetidos = até 20 pontos
        if (attempts > 0) {
            const consistencyRate = previousCorrect / attempts;
            confidence += consistencyRate * 20;
        }
        
        // Contexto: conhecer em contexto = 10 pontos
        if (contextUsed) {
            confidence += 10;
        }
        
        // Bônus de dificuldade
        if (difficulty === 'advanced' && correct) confidence += 10;
    } else {
        // Resposta incorreta reduz confiança baseado em tentativas anteriores
        if (attempts > 0) {
            const previousRate = previousCorrect / attempts;
            confidence = previousRate * 30; // Mantém parte da confiança anterior
        }
    }
    
    // Garantir que está entre 0 e 100
    return Math.max(0, Math.min(100, Math.round(confidence)));
}

// Determinar status baseado na confiança
export function getStatusFromConfidence(confidence) {
    if (confidence >= 80) return 'mastered';
    if (confidence >= 40) return 'learning';
    return 'unknown';
}

// Salvar resultado do jogo no Firebase
export async function saveGameResult(word, gameResult, gameType = 'unknown') {
    if (!database) {
        console.error('❌ Database not initialized - não é possível salvar palavra');
        return false;
    }
    
    const wordId = word.toLowerCase();
    const wordInfo = getWordInfo(word);
    
    // Se é palavra nova (não existe no banco), criar registro
    const isNewWord = !wordInfo;
    
    if (isNewWord) {
        console.log(`🆕 Palavra NOVA detectada: "${word}" - será criada no banco de dados`);
    } else {
        console.log(`🔄 Atualizando palavra existente: "${word}" (status atual: ${wordInfo.status}, confiança: ${wordInfo.confidence}%)`);
    }
    
    // Calcular nova confiança
    const currentConfidence = wordInfo?.confidence || 0;
    const newConfidence = calculateConfidence({
        ...gameResult,
        attempts: wordInfo?.attempts || 0,
        previousCorrect: wordInfo?.correct_answers || 0
    });
    
    // Média ponderada: 70% nova confiança + 30% confiança anterior (se existir)
    const finalConfidence = wordInfo 
        ? Math.round((newConfidence * 0.7) + (currentConfidence * 0.3))
        : newConfidence;
    
    const status = getStatusFromConfidence(finalConfidence);
    
    // Atualizar estatísticas da palavra
    const attempts = (wordInfo?.attempts || 0) + 1;
    const correctAnswers = wordInfo?.correct_answers || 0;
    if (gameResult.correct) correctAnswers++;
    
    // Preparar dados da palavra
    const wordData = {
        word: wordId,
        status: status,
        confidence: finalConfidence,
        translation_pt: gameResult.translation || wordInfo?.translation_pt || '',
        definition_en: gameResult.definition || wordInfo?.definition_en || '',
        difficulty: gameResult.difficulty || getDifficulty(wordId),
        frequency: gameResult.frequency || getFrequency(wordId),
        attempts: attempts,
        correct_answers: correctAnswers,
        last_reviewed: new Date().toISOString(),
        contexts: {
            ...(wordInfo?.contexts || {}),
            [gameType]: {
                confidence: finalConfidence,
                last_seen: new Date().toISOString().split('T')[0],
                attempts: (wordInfo?.contexts?.[gameType]?.attempts || 0) + 1,
                correct: (wordInfo?.contexts?.[gameType]?.correct || 0) + (gameResult.correct ? 1 : 0)
            }
        },
        sources: [
            ...(wordInfo?.sources || []),
            {
                type: 'game',
                name: gameType,
                date: new Date().toISOString().split('T')[0],
                correct: gameResult.correct,
                speed: gameResult.speed
            }
        ],
        metadata: {
            created_at: wordInfo?.metadata?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    };
    
    // Se é primeira vez vendo a palavra
    if (!wordInfo) {
        wordData.first_seen = new Date().toISOString();
    } else {
        wordData.first_seen = wordInfo.first_seen;
    }
    
    try {
        console.log(`💾 Salvando palavra "${word}" no Firebase...`);
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        const wordRef = ref(database, `users/claudio_olmedo/words/${wordId}`);
        await set(wordRef, wordData);
        
        console.log(`✅ Palavra "${word}" salva no Firebase com status: ${status}, confiança: ${finalConfidence}%`);
        
        // Atualizar cache local IMEDIATAMENTE
        userWords[wordId] = wordData;
        console.log(`📝 Cache local atualizado. Total de palavras no cache: ${Object.keys(userWords).length}`);
        
        // Atualizar estatísticas gerais (aguardar para garantir que está atualizado)
        const updatedStats = await updateStatistics();
        console.log(`📊 Estatísticas atualizadas após salvar "${word}":`, updatedStats);
        
        return true;
    } catch (error) {
        console.error('❌ Error saving game result:', error);
        return false;
    }
}

// Atualizar estatísticas gerais
export async function updateStatistics() {
    if (!database) {
        console.log('❌ Database não inicializado, não é possível atualizar estatísticas');
        return null;
    }
    
    console.log('🔄 Recarregando palavras do Firebase antes de calcular estatísticas...');
    
    // Recarregar palavras do Firebase para garantir dados atualizados
    const reloadedWords = await loadUserWords();
    
    // Garantir que userWords está atualizado
    if (reloadedWords && Object.keys(reloadedWords).length > 0) {
        userWords = reloadedWords;
    }
    
    const wordCount = Object.keys(userWords).length;
    console.log(`📊 Calculando estatísticas com ${wordCount} palavras do Firebase`);
    
    if (wordCount === 0) {
        console.log('⚠️ Nenhuma palavra encontrada, retornando estatísticas zeradas');
        const emptyStats = {
            total_words: 0,
            mastered_count: 0,
            learning_count: 0,
            unknown_count: 0,
            blocker_count: 0,
            total_confidence_avg: 0,
            words_by_difficulty: { basic: 0, intermediate: 0, advanced: 0 },
            last_activity: new Date().toISOString()
        };
        updateStatisticsUI(emptyStats);
        return emptyStats;
    }
    
    const stats = {
        total_words: wordCount,
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
        if (!word) return;
        
        if (word.status === 'mastered') stats.mastered_count++;
        else if (word.status === 'learning') stats.learning_count++;
        else if (word.status === 'unknown') stats.unknown_count++;
        else if (word.status === 'blocker') stats.blocker_count++;
        
        if (word.difficulty) {
            stats.words_by_difficulty[word.difficulty] = 
                (stats.words_by_difficulty[word.difficulty] || 0) + 1;
        }
        
        if (word.confidence !== undefined && word.confidence !== null) {
            totalConfidence += word.confidence;
            wordsWithConfidence++;
        }
    });
    
    stats.total_confidence_avg = wordsWithConfidence > 0 
        ? Math.round(totalConfidence / wordsWithConfidence) 
        : 0;
    
    console.log('✅ Estatísticas calculadas:', stats);
    
    try {
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
        const statsRef = ref(database, 'users/claudio_olmedo/statistics');
        await set(statsRef, stats);
        statistics = stats;
        
        // Atualizar UI imediatamente
        updateStatisticsUI(stats);
        
        return stats;
    } catch (error) {
        console.error('❌ Error updating statistics:', error);
        // Mesmo com erro, atualizar UI com dados calculados
        updateStatisticsUI(stats);
        return stats;
    }
}

// Atualizar UI das estatísticas (exportada para uso em outros arquivos)
export function updateStatisticsUI(stats) {
    // Verificar se estamos na página principal (index.html)
    const totalWordsEl = document.getElementById('totalWords');
    const masteredWordsEl = document.getElementById('masteredWords');
    const learningWordsEl = document.getElementById('learningWords');
    const avgConfidenceEl = document.getElementById('avgConfidence');
    const statsPanel = document.getElementById('stats');
    
    if (totalWordsEl) {
        totalWordsEl.textContent = stats.total_words || 0;
        // Animação visual
        totalWordsEl.style.transform = 'scale(1.1)';
        setTimeout(() => {
            totalWordsEl.style.transform = 'scale(1)';
        }, 300);
    }
    if (masteredWordsEl) masteredWordsEl.textContent = stats.mastered_count || 0;
    if (learningWordsEl) learningWordsEl.textContent = stats.learning_count || 0;
    if (avgConfidenceEl) avgConfidenceEl.textContent = (stats.total_confidence_avg || 0) + '%';
    if (statsPanel) statsPanel.style.display = 'grid';
    
    console.log('UI de estatísticas atualizada:', stats);
}

// Obter estatísticas
export function getStatistics() {
    return statistics;
}

// Obter todas as palavras disponíveis (do Firebase + lista estática)
export async function getAllAvailableWords(staticWordList = []) {
    // Garantir que userWords está carregado
    if (Object.keys(userWords).length === 0 && database) {
        await loadUserWords();
    }
    
    // Converter palavras do Firebase para o formato usado pelos jogos
    const firebaseWords = Object.values(userWords).map(wordData => ({
        word: wordData.word,
        translation: wordData.translation_pt || '',
        definition: wordData.definition_en || '',
        difficulty: wordData.difficulty || 'intermediate',
        frequency: wordData.frequency || 'medium'
    }));
    
    // Combinar palavras do Firebase com lista estática
    const allAvailable = [...firebaseWords];
    
    // Adicionar palavras estáticas que não estão no Firebase
    const firebaseWordIds = new Set(firebaseWords.map(w => w.word.toLowerCase()));
    staticWordList.forEach(word => {
        if (word && word.word && !firebaseWordIds.has(word.word.toLowerCase())) {
            allAvailable.push(word);
        }
    });
    
    console.log(`Total de palavras disponíveis: ${allAvailable.length} (${firebaseWords.length} do Firebase + ${allAvailable.length - firebaseWords.length} estáticas)`);
    
    return allAvailable;
}

// Selecionar palavras para o jogo baseado em algoritmo inteligente
// IMPORTANTE: NUNCA inclui palavras que já estão no banco de dados (qualquer status)
// Objetivo: aumentar a quantidade de palavras verificadas, não repetir palavras já conhecidas
export async function selectWordsForGame(wordList, count = 10, gameType = 'general') {
    // SEMPRE recarregar palavras do Firebase para garantir dados atualizados
    if (database) {
        console.log('🔄 Recarregando palavras do Firebase antes de selecionar...');
        await loadUserWords();
        console.log(`📚 Total de palavras no banco: ${Object.keys(userWords).length}`);
    } else {
        console.log('⚠️ Database não inicializado, não é possível filtrar palavras verificadas');
    }
    
    // Primeiro, obter todas as palavras disponíveis (Firebase + estáticas)
    const allAvailable = await getAllAvailableWords(wordList);
    
    // FILTRAR TODAS as palavras que já estão no banco de dados (qualquer status)
    // Se a palavra já foi verificada, não deve aparecer novamente
    const filteredAvailable = allAvailable.filter(w => {
        if (!w || !w.word) return false;
        const wordId = w.word.toLowerCase();
        const info = userWords[wordId];
        
        // Se NÃO está no Firebase, incluir (palavra nova, nunca verificada)
        if (!info) {
            return true;
        }
        
        // Se JÁ está no banco de dados (qualquer status), EXCLUIR
        // Não importa se é mastered, learning ou unknown - se já foi verificada, não mostra mais
        console.log(`🚫 Excluindo palavra já verificada: ${w.word} (status: ${info.status}, confiança: ${info.confidence}%)`);
        return false;
    });
    
    const excludedCount = allAvailable.length - filteredAvailable.length;
    console.log(`📊 Selecionando palavras para ${gameType}:`);
    console.log(`   - Total disponível: ${allAvailable.length}`);
    console.log(`   - Já verificadas (excluídas): ${excludedCount}`);
    console.log(`   - Novas palavras disponíveis: ${filteredAvailable.length}`);
    
    if (filteredAvailable.length === 0) {
        console.log('⚠️ Nenhuma palavra nova disponível! Todas as palavras já foram verificadas.');
        return [];
    }
    
    // Selecionar apenas palavras NUNCA VISTAS (não estão no banco)
    const selected = [];
    const used = new Set();
    
    // Embaralhar e selecionar palavras novas
    const shuffled = [...filteredAvailable].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        const word = shuffled[i];
        const wordId = word.word.toLowerCase();
        
        // Garantir que não está no banco (dupla verificação)
        if (!userWords[wordId] && !used.has(wordId)) {
            selected.push(word);
            used.add(wordId);
        }
    }
    
    const finalSelection = selected.slice(0, count);
    console.log(`✅ Selecionadas ${finalSelection.length} palavras NOVAS para ${gameType} (nunca verificadas antes)`);
    
    return finalSelection;
}

// Helper: Determinar dificuldade da palavra
function getDifficulty(word) {
    const length = word.length;
    if (length <= 4) return 'basic';
    if (length <= 7) return 'intermediate';
    return 'advanced';
}

// Helper: Determinar frequência
function getFrequency(word) {
    if (word.length <= 4) return 'very_high';
    if (word.length <= 6) return 'high';
    if (word.length <= 8) return 'medium';
    return 'low';
}

// Verificar se palavra é conhecida (para API)
export function isWordKnown(word, minConfidence = 50) {
    const wordId = word.toLowerCase();
    const info = userWords[wordId];
    if (!info) return false;
    return info.confidence >= minConfidence && info.status !== 'unknown';
}

// Obter nível de conhecimento de uma palavra
export function getWordKnowledgeLevel(word) {
    const wordId = word.toLowerCase();
    const info = userWords[wordId];
    if (!info) {
        return {
            known: false,
            confidence: 0,
            status: 'unknown',
            lastSeen: null
        };
    }
    
    return {
        known: info.status !== 'unknown',
        confidence: info.confidence || 0,
        status: info.status,
        lastSeen: info.last_reviewed
    };
}

