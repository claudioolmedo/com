// Speed Test Game
import { initEngine, loadUserWords, selectWordsForGame, saveGameResult } from '../game-engine.js';
import { allWords, getRandomWords } from '../words-database.js';

let currentWords = [];
let currentIndex = 0;
let knownCount = 0;
let startTime = null;
let wordStartTime = null;
let timeLeft = 60;
let timerInterval = null;
let database = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initializeGame();
    setupEventListeners();
    startTimer();
    showNextWord();
});

async function initializeGame() {
    const saved = localStorage.getItem('firebaseConfig');
    if (saved) {
        try {
            const firebaseConfig = JSON.parse(saved);
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
            const { getDatabase } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js');
            
            const app = initializeApp(firebaseConfig);
            database = getDatabase(app);
            initEngine(database);
            await loadUserWords();
        } catch (error) {
            console.error('Firebase error:', error);
        }
    }
    
    currentWords = await selectWordsForGame(allWords, 100, 'speedtest');
    if (currentWords.length === 0) {
        currentWords = await getRandomWords(100);
    }
    
    currentIndex = 0;
    knownCount = 0;
    timeLeft = 60;
}

function setupEventListeners() {
    const btnKnow = document.getElementById('btnKnow');
    const btnDontKnow = document.getElementById('btnDontKnow');
    const btnBack = document.getElementById('btnBack');
    
    if (btnKnow) {
        btnKnow.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão CONHEÇO clicado');
            handleAnswer(true);
        });
    }
    
    if (btnDontKnow) {
        btnDontKnow.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão NÃO CONHEÇO clicado');
            handleAnswer(false);
        });
    }
    
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            clearInterval(timerInterval);
            window.location.href = '../index.html';
        });
    }
    
    // Teclas de atalho
    document.addEventListener('keydown', (e) => {
        if (e.key === '1' || e.key === 'ArrowLeft') {
            e.preventDefault();
            handleAnswer(true);
        }
        if (e.key === '2' || e.key === 'ArrowRight') {
            e.preventDefault();
            handleAnswer(false);
        }
    });
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft + 's';
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function showNextWord() {
    if (currentIndex >= currentWords.length || timeLeft <= 0) {
        endGame();
        return;
    }
    
    const word = currentWords[currentIndex];
    if (!word) {
        endGame();
        return;
    }
    
    const wordDisplay = document.getElementById('wordDisplay');
    const currentNumEl = document.getElementById('currentNum');
    const totalEl = document.getElementById('total');
    
    if (wordDisplay) {
        wordDisplay.textContent = word.word.toUpperCase();
        // Adicionar animação
        wordDisplay.style.opacity = '0';
        setTimeout(() => {
            wordDisplay.style.opacity = '1';
            wordDisplay.style.transition = 'opacity 0.3s';
        }, 50);
    }
    
    if (currentNumEl) currentNumEl.textContent = currentIndex + 1;
    if (totalEl) totalEl.textContent = currentWords.length;
    
    wordStartTime = Date.now();
}

async function handleAnswer(know) {
    console.log(`handleAnswer chamado - know: ${know}, currentIndex: ${currentIndex}`);
    
    // Prevenir múltiplos cliques
    if (wordStartTime === null) {
        console.log('wordStartTime é null, ignorando');
        return;
    }
    
    if (currentIndex >= currentWords.length) {
        console.log('Fim das palavras, encerrando jogo');
        endGame();
        return;
    }
    
    const word = currentWords[currentIndex];
    if (!word) {
        console.log('Palavra não encontrada, encerrando jogo');
        endGame();
        return;
    }
    
    console.log(`Processando palavra: ${word.word}, know: ${know}`);
    const speed = Date.now() - wordStartTime;
    
    // Atualizar contador imediatamente
    if (know) {
        knownCount++;
        const knownEl = document.getElementById('known');
        if (knownEl) {
            knownEl.textContent = knownCount;
            // Animação visual
            knownEl.style.transform = 'scale(1.2)';
            setTimeout(() => {
                knownEl.style.transform = 'scale(1)';
            }, 200);
        }
    }
    
    // Salvar resultado IMEDIATAMENTE
    console.log(`💾 Salvando palavra "${word.word}": ${know ? '✅ CONHEÇO' : '❌ NÃO CONHEÇO'}`);
    
    try {
        const saved = await saveGameResult(word.word, {
            correct: know,
            speed: speed,
            translation: word.translation,
            definition: word.definition,
            difficulty: word.difficulty,
            frequency: word.frequency,
            contextUsed: false
        }, 'speedtest');
        
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
    console.log(`Avançando para palavra ${currentIndex + 1}`);
    
    // Mostrar próxima palavra imediatamente
    if (currentIndex < currentWords.length && timeLeft > 0) {
        showNextWord();
    } else {
        endGame();
    }
}

function endGame() {
    clearInterval(timerInterval);
    document.querySelector('.speed-test-container').innerHTML = `
        <div class="end-screen">
            <h2>⏱️ Tempo Esgotado!</h2>
            <p class="score-display">Palavras revisadas: ${currentIndex}</p>
            <p class="score-display">Conhece: ${knownCount}</p>
            <p class="score-display">Velocidade: ${Math.round(currentIndex / 60)} palavras/min</p>
            <button onclick="location.reload()" class="btn btn-primary">Jogar Novamente</button>
        </div>
    `;
}

