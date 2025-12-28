// Matching Game
import { initEngine, loadUserWords, selectWordsForGame, saveGameResult } from '../game-engine.js';
import { allWords, getRandomWords } from '../words-database.js';

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let attempts = 0;
let database = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initializeGame();
    setupEventListeners();
    createCards();
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
    
    let words = await selectWordsForGame(allWords, 6, 'matching');
    if (words.length === 0) {
        words = await getRandomWords(6);
    }
    
    cards = [];
    words.forEach(word => {
        cards.push({ type: 'word', content: word.word, word: word });
        cards.push({ type: 'translation', content: word.translation || word.definition, word: word });
    });
    cards.sort(() => Math.random() - 0.5);
    
    matchedPairs = 0;
    attempts = 0;
    flippedCards = [];
}

function setupEventListeners() {
    document.getElementById('btnBack').addEventListener('click', () => window.location.href = '../index.html');
    document.getElementById('btnRestart').addEventListener('click', () => {
        initializeGame().then(createCards);
    });
}

function createCards() {
    const grid = document.getElementById('matchingGrid');
    grid.innerHTML = '';
    document.getElementById('totalPairs').textContent = cards.length / 2;
    
    cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'match-card';
        cardEl.textContent = '?';
        cardEl.dataset.index = index;
        cardEl.onclick = () => flipCard(index);
        grid.appendChild(cardEl);
    });
}

function flipCard(index) {
    if (flippedCards.length >= 2 || flippedCards.includes(index)) return;
    
    const cardEl = document.querySelector(`[data-index="${index}"]`);
    cardEl.classList.add('flipped');
    cardEl.textContent = cards[index].content;
    flippedCards.push(index);
    
    if (flippedCards.length === 2) {
        attempts++;
        document.getElementById('attempts').textContent = attempts;
        checkMatch();
    }
}

function checkMatch() {
    const [index1, index2] = flippedCards;
    const card1 = cards[index1];
    const card2 = cards[index2];
    
    if (card1.word.word === card2.word.word && card1.type !== card2.type) {
        // Match!
        matchedPairs++;
        document.getElementById('matched').textContent = matchedPairs;
        
        flippedCards.forEach(idx => {
            const cardEl = document.querySelector(`[data-index="${idx}"]`);
            cardEl.classList.add('matched');
            cardEl.onclick = null;
        });
        
        // Salvar resultado IMEDIATAMENTE
        console.log(`💾 Salvando palavra "${card1.word.word}" do matching`);
        
        try {
            const saved = await saveGameResult(card1.word.word, {
                correct: true,
                speed: 5000,
                translation: card1.word.translation,
                definition: card1.word.definition,
                difficulty: card1.word.difficulty,
                frequency: card1.word.frequency,
                contextUsed: false
            }, 'matching');
            
            if (saved) {
                console.log(`✅ Palavra "${card1.word.word}" salva com sucesso no banco de dados!`);
            } else {
                console.error(`❌ Falha ao salvar palavra "${card1.word.word}"`);
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
        
        flippedCards = [];
        
        if (matchedPairs === cards.length / 2) {
            setTimeout(() => {
                alert(`🎉 Parabéns! Você completou em ${attempts} tentativas!`);
            }, 500);
        }
    } else {
        // No match
        setTimeout(() => {
            flippedCards.forEach(idx => {
                const cardEl = document.querySelector(`[data-index="${idx}"]`);
                cardEl.classList.remove('flipped');
                cardEl.textContent = '?';
            });
            flippedCards = [];
        }, 1000);
    }
}

