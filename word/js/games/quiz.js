// Quiz Game
import { initEngine, loadUserWords, selectWordsForGame, saveGameResult } from '../game-engine.js';
import { allWords, getRandomWords } from '../words-database.js';

let currentWords = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let startTime = null;
let database = null;
let currentQuestion = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initializeGame();
    setupEventListeners();
    showQuestion();
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
    
    currentWords = await selectWordsForGame(allWords, 10, 'quiz');
    if (currentWords.length === 0) {
        currentWords = await getRandomWords(10);
    }
    
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
}

function setupEventListeners() {
    document.getElementById('btnBack').addEventListener('click', () => window.location.href = '../index.html');
}

function showQuestion() {
    console.log(`showQuestion chamado - índice: ${currentIndex}, total: ${currentWords.length}`);
    
    // Verificar se ainda há perguntas
    if (currentIndex >= currentWords.length || currentWords.length === 0) {
        console.log('Fim do jogo - mostrando tela final');
        showEndScreen();
        return;
    }
    
    const word = currentWords[currentIndex];
    if (!word) {
        console.log('Palavra não encontrada - mostrando tela final');
        showEndScreen();
        return;
    }
    
    console.log(`Mostrando pergunta ${currentIndex + 1}: ${word.word}`);
    currentQuestion = word;
    startTime = Date.now();
    
    // Gerar opções (1 correta + 3 incorretas)
    const correctOption = word.translation || word.definition || 'Sem tradução';
    const options = [correctOption];
    
    // Buscar outras palavras para opções incorretas
    const otherWords = allWords
        .filter(w => w.word !== word.word && (w.translation || w.definition))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
    
    otherWords.forEach(w => {
        const option = w.translation || w.definition;
        if (option && !options.includes(option)) {
            options.push(option);
        }
    });
    
    // Se não tiver opções suficientes, adicionar opções genéricas
    while (options.length < 4) {
        const genericOptions = ['sim', 'não', 'talvez', 'sempre', 'nunca', 'aqui', 'ali'];
        const randomOption = genericOptions[Math.floor(Math.random() * genericOptions.length)];
        if (!options.includes(randomOption)) {
            options.push(randomOption);
        }
    }
    
    // Embaralhar opções
    options.sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(correctOption);
    
    // Verificar se os elementos existem antes de atualizar
    const questionEl = document.getElementById('question');
    const currentQEl = document.getElementById('currentQ');
    const totalQEl = document.getElementById('totalQ');
    const optionsContainer = document.getElementById('options');
    
    if (!questionEl || !currentQEl || !totalQEl || !optionsContainer) {
        console.error('Elementos do DOM não encontrados');
        return;
    }
    
    // Mostrar pergunta
    questionEl.textContent = `O que significa "${word.word}"?`;
    currentQEl.textContent = currentIndex + 1;
    totalQEl.textContent = currentWords.length;
    
    // Limpar e mostrar opções
    optionsContainer.innerHTML = '';
    options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        
        // Usar uma função wrapper para garantir que o contexto está correto
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Verificar se o botão ainda está habilitado
            if (this.disabled) return;
            
            const isCorrect = index === correctIndex;
            const speed = Date.now() - startTime;
            handleAnswer(isCorrect, word, speed, this);
        });
        
        optionsContainer.appendChild(btn);
    });
}

async function handleAnswer(isCorrect, word, speed, clickedButton) {
    // Prevenir múltiplos cliques
    const buttons = document.querySelectorAll('.option-btn');
    if (buttons.length === 0) return;
    
    // Verificar se já foi processado
    if (buttons[0].disabled) return;
    
    const correctAnswer = word.translation || word.definition;
    
    // Desabilitar todos os botões imediatamente
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
    });
    
    // Marcar a resposta correta
    buttons.forEach(btn => {
        if (btn.textContent === correctAnswer) {
            btn.classList.add('correct');
        }
    });
    
    if (isCorrect) {
        correctCount++;
    } else {
        wrongCount++;
        // Marcar o botão clicado como incorreto
        if (clickedButton) {
            clickedButton.classList.add('incorrect');
        } else {
            // Fallback: marcar todos exceto o correto como incorretos
            buttons.forEach(btn => {
                if (btn.textContent !== correctAnswer) {
                    btn.classList.add('incorrect');
                }
            });
        }
    }
    
    // Atualizar contadores
    const correctEl = document.getElementById('correct');
    const wrongEl = document.getElementById('wrong');
    if (correctEl) correctEl.textContent = correctCount;
    if (wrongEl) wrongEl.textContent = wrongCount;
    
    // Salvar resultado IMEDIATAMENTE quando acerta ou erra
    console.log(`🎯 Salvando resultado para "${word.word}": ${isCorrect ? '✅ CORRETO' : '❌ ERRADO'}`);
    
    try {
        const saved = await saveGameResult(word.word, {
            correct: isCorrect,
            speed: speed,
            translation: word.translation,
            definition: word.definition,
            difficulty: word.difficulty,
            frequency: word.frequency,
            contextUsed: false
        }, 'quiz');
        
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
                console.log(`📊 Estatísticas atualizadas: ${stats.total_words} palavras totais`);
            }
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    } catch (error) {
        console.error('❌ Erro ao salvar resultado:', error);
        // Continuar mesmo se houver erro, mas logar o erro
    }
    
    // Avançar para próxima pergunta após 2 segundos
    setTimeout(() => {
        currentIndex++;
        console.log(`Avançando para pergunta ${currentIndex + 1} de ${currentWords.length}`);
        
        if (currentIndex < currentWords.length) {
            showQuestion();
        } else {
            showEndScreen();
        }
    }, 2000);
}

function showEndScreen() {
    const quizContainer = document.querySelector('.quiz-container');
    if (quizContainer) {
        quizContainer.innerHTML = `
            <div class="end-screen">
                <h2>🎉 Quiz Concluído!</h2>
                <p class="score-display">Acertos: ${correctCount}</p>
                <p class="score-display">Erros: ${wrongCount}</p>
                <p class="score-display">Taxa de acerto: ${currentWords.length > 0 ? Math.round((correctCount / currentWords.length) * 100) : 0}%</p>
                <button onclick="location.reload()" class="btn btn-primary">Jogar Novamente</button>
            </div>
        `;
    }
}

