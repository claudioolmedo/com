// Hangman Game
import { initEngine, loadUserWords, selectWordsForGame, saveGameResult } from '../game-engine.js';
import { allWords, getRandomWords } from '../words-database.js';

let currentWords = [];
let currentIndex = 0;
let currentWord = '';
let guessedLetters = new Set();
let wrongGuesses = 0;
let maxWrong = 6;
let startTime = null;
let database = null;

const hangmanDrawings = [
    `_______
|     |
|     
|     
|     
|     
|_____`,
    `_______
|     |
|     O
|     
|     
|     
|_____`,
    `_______
|     |
|     O
|     |
|     
|     
|_____`,
    `_______
|     |
|     O
|    /|
|     
|     
|_____`,
    `_______
|     |
|     O
|    /|\\
|     
|     
|_____`,
    `_______
|     |
|     O
|    /|\\
|    /
|     
|_____`,
    `_______
|     |
|     O
|    /|\\
|    / \\
|     
|_____`
];

document.addEventListener('DOMContentLoaded', async () => {
    await initializeGame();
    setupEventListeners();
    startNewWord();
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
    
    currentWords = await selectWordsForGame(allWords, 10, 'hangman');
    if (currentWords.length === 0) {
        currentWords = await getRandomWords(10);
    }
    
    currentIndex = 0;
    createKeyboard();
}

function setupEventListeners() {
    document.getElementById('btnBack').addEventListener('click', () => window.location.href = '../index.html');
    document.getElementById('btnNext').addEventListener('click', () => {
        currentIndex++;
        startNewWord();
    });
}

function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    keyboard.innerHTML = '';
    
    letters.forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'key-btn';
        btn.textContent = letter;
        btn.onclick = () => guessLetter(letter);
        keyboard.appendChild(btn);
    });
}

function startNewWord() {
    if (currentIndex >= currentWords.length) {
        showEndScreen();
        return;
    }
    
    const wordData = currentWords[currentIndex];
    currentWord = wordData.word.toUpperCase();
    guessedLetters = new Set();
    wrongGuesses = 0;
    startTime = Date.now();
    
    document.getElementById('wordNum').textContent = currentIndex + 1;
    document.getElementById('totalWords').textContent = currentWords.length;
    document.getElementById('lives').textContent = maxWrong - wrongGuesses;
    document.getElementById('hint').textContent = `Dica: ${wordData.definition || wordData.translation || ''}`;
    document.getElementById('btnNext').style.display = 'none';
    
    updateDisplay();
    resetKeyboard();
}

function updateDisplay() {
    const display = currentWord.split('').map(letter => 
        guessedLetters.has(letter) ? letter : '_'
    ).join(' ');
    
    document.getElementById('wordDisplay').textContent = display;
    document.getElementById('hangmanDrawing').querySelector('pre').textContent = hangmanDrawings[wrongGuesses];
    document.getElementById('lives').textContent = maxWrong - wrongGuesses;
    
    if (!display.includes('_')) {
        // Word completed!
        handleWin();
    }
}

function guessLetter(letter) {
    if (guessedLetters.has(letter)) return;
    
    guessedLetters.add(letter);
    const btn = document.querySelector(`.key-btn:contains("${letter}")`) || 
                 Array.from(document.querySelectorAll('.key-btn')).find(b => b.textContent === letter);
    if (btn) {
        btn.disabled = true;
        btn.classList.add('used');
    }
    
    if (currentWord.includes(letter)) {
        updateDisplay();
    } else {
        wrongGuesses++;
        updateDisplay();
        
        if (wrongGuesses >= maxWrong) {
            handleLose();
        }
    }
}

async function handleWin() {
    const speed = Date.now() - startTime;
    const word = currentWords[currentIndex].word;
    
    console.log(`💾 Salvando palavra "${word}" - VITÓRIA`);
    
    try {
        const saved = await saveGameResult(word, {
            correct: true,
            speed: speed,
            translation: currentWords[currentIndex].translation,
            definition: currentWords[currentIndex].definition,
            difficulty: currentWords[currentIndex].difficulty,
            frequency: currentWords[currentIndex].frequency,
            contextUsed: false
        }, 'hangman');
        
        if (saved) {
            console.log(`✅ Palavra "${word}" salva com sucesso no banco de dados!`);
        } else {
            console.error(`❌ Falha ao salvar palavra "${word}"`);
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
    
    document.getElementById('wordDisplay').style.color = '#10b981';
    document.getElementById('btnNext').style.display = 'inline-block';
}

async function handleLose() {
    document.getElementById('wordDisplay').textContent = currentWord;
    document.getElementById('wordDisplay').style.color = '#ef4444';
    document.getElementById('btnNext').style.display = 'inline-block';
    
    const word = currentWords[currentIndex].word;
    console.log(`💾 Salvando palavra "${word}" - DERROTA`);
    
    try {
        const saved = await saveGameResult(word, {
            correct: false,
            speed: Date.now() - startTime,
            translation: currentWords[currentIndex].translation,
            definition: currentWords[currentIndex].definition,
            difficulty: currentWords[currentIndex].difficulty,
            frequency: currentWords[currentIndex].frequency,
            contextUsed: false
        }, 'hangman');
        
        if (saved) {
            console.log(`✅ Palavra "${word}" salva com sucesso no banco de dados!`);
        } else {
            console.error(`❌ Falha ao salvar palavra "${word}"`);
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
}

function resetKeyboard() {
    document.querySelectorAll('.key-btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('used');
    });
    document.getElementById('wordDisplay').style.color = '#333';
}

function showEndScreen() {
    document.querySelector('.hangman-container').innerHTML = `
        <div class="end-screen">
            <h2>🎉 Jogo Concluído!</h2>
            <p>Você completou todas as palavras!</p>
            <button onclick="location.reload()" class="btn btn-primary">Jogar Novamente</button>
        </div>
    `;
}

