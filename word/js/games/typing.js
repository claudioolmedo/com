// Typing Challenge Game
import { initEngine, loadUserWords, selectWordsForGame, saveGameResult } from '../game-engine.js';
import { allWords, getRandomWords } from '../words-database.js';

let currentWords = [];
let currentIndex = 0;
let score = 0;
let startTime = null;
let timeLeft = 30;
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
    
    currentWords = await selectWordsForGame(allWords, 20, 'typing');
    if (currentWords.length === 0) {
        currentWords = await getRandomWords(20);
    }
    
    currentIndex = 0;
    score = 0;
    timeLeft = 30;
}

function setupEventListeners() {
    const input = document.getElementById('typingInput');
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });
    input.addEventListener('input', () => {
        input.classList.remove('correct', 'incorrect');
        document.getElementById('feedback').textContent = '';
    });
    document.getElementById('btnBack').addEventListener('click', () => {
        clearInterval(timerInterval);
        window.location.href = '../index.html';
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
    document.getElementById('wordToType').textContent = word.word;
    document.getElementById('typingInput').value = '';
    document.getElementById('typingInput').focus();
    document.getElementById('currentWordNum').textContent = currentIndex + 1;
    document.getElementById('totalWords').textContent = currentWords.length;
    startTime = Date.now();
}

async function checkAnswer() {
    const input = document.getElementById('typingInput');
    const word = currentWords[currentIndex];
    const answer = input.value.trim().toLowerCase();
    const correctAnswer = (word.translation || '').toLowerCase();
    
    // Aceitar variações (remover acentos, etc)
    const normalize = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedAnswer = normalize(answer);
    const normalizedCorrect = normalize(correctAnswer);
    
    const isCorrect = normalizedAnswer === normalizedCorrect || 
                     answer === word.word.toLowerCase();
    
    const speed = Date.now() - startTime;
    
    if (isCorrect) {
        input.classList.add('correct');
        document.getElementById('feedback').textContent = '✅ Correto!';
        score += Math.max(100 - Math.floor(speed / 100), 10);
        document.getElementById('score').textContent = score;
    } else {
        input.classList.add('incorrect');
        document.getElementById('feedback').textContent = `❌ Errado! A resposta correta é: ${word.translation || word.definition}`;
    }
    
    // Salvar resultado IMEDIATAMENTE
    console.log(`💾 Salvando palavra "${word.word}": ${isCorrect ? '✅ CORRETO' : '❌ ERRADO'}`);
    
    try {
        const saved = await saveGameResult(word.word, {
            correct: isCorrect,
            speed: speed,
            translation: word.translation,
            definition: word.definition,
            difficulty: word.difficulty,
            frequency: word.frequency,
            contextUsed: false
        }, 'typing');
        
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
    }
    
    setTimeout(() => {
        currentIndex++;
        showNextWord();
    }, isCorrect ? 500 : 2000);
}

function endGame() {
    clearInterval(timerInterval);
    document.querySelector('.typing-container').innerHTML = `
        <div class="end-screen">
            <h2>⏱️ Tempo Esgotado!</h2>
            <p class="score-display">Pontuação: ${score}</p>
            <p class="score-display">Palavras completadas: ${currentIndex}</p>
            <button onclick="location.reload()" class="btn btn-primary">Jogar Novamente</button>
        </div>
    `;
}

