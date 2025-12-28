// Flashcards Game
import { initEngine, loadUserWords, selectWordsForGame, saveGameResult } from '../game-engine.js';
import { allWords, getRandomWords } from '../words-database.js';

let currentWords = [];
let currentIndex = 0;
let score = 0;
let startTime = null;
let cardFlipped = false;
let database = null;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    await initializeGame();
    setupEventListeners();
});

async function initializeGame() {
    // Carregar Firebase config
    const saved = localStorage.getItem('firebaseConfig');
    if (saved) {
        try {
            const firebaseConfig = JSON.parse(saved);
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
            const { getDatabase } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
            
            const app = initializeApp(firebaseConfig);
            database = getDatabase(app);
            initEngine(database);
            
            // Carregar palavras ANTES de selecionar
            console.log('📥 Carregando palavras do Firebase...');
            await loadUserWords();
            console.log('✅ Palavras carregadas do Firebase');
        } catch (error) {
            console.error('Firebase error:', error);
        }
    }
    
    // Selecionar palavras para o jogo (apenas palavras NUNCA verificadas)
    console.log('🎮 Selecionando palavras para o jogo...');
    currentWords = await selectWordsForGame(allWords, 20, 'flashcards');
    if (currentWords.length === 0) {
        console.log('⚠️ Nenhuma palavra nova encontrada, tentando fallback...');
        currentWords = await getRandomWords(20);
    }
    
    console.log(`✅ ${currentWords.length} palavras selecionadas para o jogo`);
    
    currentIndex = 0;
    score = 0;
    updateDisplay();
}

function setupEventListeners() {
    const cardInner = document.getElementById('cardInner');
    const btnKnow = document.getElementById('btnKnow');
    const btnLearning = document.getElementById('btnLearning');
    const btnDontKnow = document.getElementById('btnDontKnow');
    const btnBack = document.getElementById('btnBack');
    const btnRestart = document.getElementById('btnRestart');
    
    if (cardInner) {
        cardInner.addEventListener('click', flipCard);
    }
    
    if (btnKnow) {
        btnKnow.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAnswer('mastered', 90);
        });
    }
    
    if (btnLearning) {
        btnLearning.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAnswer('learning', 50);
        });
    }
    
    if (btnDontKnow) {
        btnDontKnow.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAnswer('unknown', 0);
        });
    }
    
    if (btnBack) {
        btnBack.addEventListener('click', () => window.location.href = '../index.html');
    }
    
    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            initializeGame().then(() => updateDisplay());
        });
    }
}

function flipCard() {
    const cardInner = document.getElementById('cardInner');
    if (!cardFlipped) {
        cardInner.classList.add('flipped');
        cardFlipped = true;
        if (!startTime) startTime = Date.now();
    }
}

function updateDisplay() {
    if (currentIndex >= currentWords.length) {
        showEndScreen();
        return;
    }
    
    const word = currentWords[currentIndex];
    document.getElementById('wordDisplay').textContent = word.word;
    document.getElementById('translationDisplay').textContent = word.translation || 'Sem tradução';
    document.getElementById('definitionDisplay').textContent = word.definition || '';
    document.getElementById('currentCard').textContent = currentIndex + 1;
    document.getElementById('totalCards').textContent = currentWords.length;
    document.getElementById('score').textContent = score;
    
    // Reset card
    cardFlipped = false;
    startTime = null;
    document.getElementById('cardInner').classList.remove('flipped');
    
    // Update progress
    const progress = ((currentIndex + 1) / currentWords.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

async function handleAnswer(status, confidence) {
    // Prevenir múltiplos cliques
    if (currentIndex >= currentWords.length) return;
    
    // Se o cartão não estiver virado, virar rapidamente
    if (!cardFlipped) {
        flipCard();
    }
    
    const word = currentWords[currentIndex];
    if (!word) {
        showEndScreen();
        return;
    }
    
    const speed = startTime ? Date.now() - startTime : 10000;
    
    // Atualizar pontuação imediatamente
    if (status !== 'unknown') {
        score += 10;
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = score;
    }
    
    // Salvar resultado IMEDIATAMENTE
    console.log(`💾 Salvando palavra "${word.word}" com status: ${status}`);
    
    try {
        const saved = await saveGameResult(word.word, {
            correct: status !== 'unknown',
            speed: speed,
            translation: word.translation,
            definition: word.definition,
            difficulty: word.difficulty,
            frequency: word.frequency,
            contextUsed: false
        }, 'flashcards');
        
        if (saved) {
            console.log(`✅ Palavra "${word.word}" salva com sucesso no banco de dados!`);
        } else {
            console.error(`❌ Falha ao salvar palavra "${word.word}"`);
        }
        
        // Atualizar estatísticas após salvar
        try {
            const { updateStatistics, updateStatisticsUI } = await import('../game-engine.js');
            const stats = await updateStatistics();
            if (stats) {
                updateStatisticsUI(stats);
            }
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    } catch (error) {
        console.error('❌ Erro ao salvar resultado:', error);
        // Continuar mesmo se houver erro
    }
    
    // Avançar imediatamente para próxima palavra
    currentIndex++;
    
    // Mostrar próxima palavra sem delay
    if (currentIndex < currentWords.length) {
        updateDisplay();
    } else {
        showEndScreen();
    }
}

function showEndScreen() {
    document.getElementById('flashcard').innerHTML = `
        <div class="end-screen">
            <h2>🎉 Parabéns!</h2>
            <p>Você completou o jogo de Flashcards!</p>
            <p class="score-display">Pontuação: ${score} pontos</p>
            <p class="score-display">Palavras revisadas: ${currentWords.length}</p>
            <button onclick="location.reload()" class="btn btn-primary">Jogar Novamente</button>
        </div>
    `;
}

