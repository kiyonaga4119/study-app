const API_BASE = 'http://localhost:3000/api';
const app = document.getElementById('content');
const headerTitle = document.querySelector('header h1');

// State
let currentUser = null;
let currentSubject = null;
let currentCategory = null;
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let globalSettings = {};
let currentMode = 'normal'; // normal, test, review
let incorrectQuestions = []; // IDs of incorrect questions
let selectedCategoryId = null;
let selectedCategoryName = '';
let currentSubjectId = null;
let selectedType = null; // 'selection' or 'sorting' (for English)

// Init
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  checkLogin();
});

async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    globalSettings = await res.json();

    // Apply Header Font immediately
    if (globalSettings.font_header) {
      const h1 = document.querySelector('header h1');
      if (h1) h1.style.fontSize = globalSettings.font_header;
    }
  } catch (err) {
    console.error('Failed to load settings', err);
  }
}

function checkLogin() {
  const savedUser = localStorage.getItem('studyAppUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showSubjects();
  } else {
    showLogin();
  }
}

// Helper to hide all sections
function hideAllSections() {
  const sections = ['login-area', 'register-area', 'subject-selection', 'type-selection', 'category-selection', 'mode-selection', 'quiz-area'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// --- Auth ---

function showLogin() {
  headerTitle.textContent = 'ログイン';
  hideAllSections();
  const loginArea = document.getElementById('login-area');
  loginArea.style.display = 'block';
  loginArea.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'card fade-in';
  card.style.textAlign = 'center';

  const title = document.createElement('h2');
  title.textContent = 'ようこそ';
  title.style.marginBottom = '20px';
  card.appendChild(title);

  const inputUser = document.createElement('input');
  inputUser.type = 'text';
  inputUser.placeholder = 'ユーザー名';
  inputUser.style.width = '100%';
  inputUser.style.padding = '15px';
  inputUser.style.marginBottom = '10px';
  inputUser.style.borderRadius = '10px';
  inputUser.style.border = '1px solid #ccc';
  card.appendChild(inputUser);

  const inputPass = document.createElement('input');
  inputPass.type = 'password';
  inputPass.placeholder = 'パスワード';
  inputPass.style.width = '100%';
  inputPass.style.padding = '15px';
  inputPass.style.marginBottom = '20px';
  inputPass.style.borderRadius = '10px';
  inputPass.style.border = '1px solid #ccc';
  card.appendChild(inputPass);

  const loginBtn = document.createElement('button');
  loginBtn.className = 'next-btn';
  loginBtn.textContent = 'ログイン';
  loginBtn.style.marginTop = '0';
  loginBtn.onclick = async () => {
    const username = inputUser.value;
    const password = inputPass.value;
    if (!username || !password) return alert('入力してください');

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        currentUser = data.user;
        localStorage.setItem('studyAppUser', JSON.stringify(currentUser));
        showSubjects();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('エラーが発生しました');
    }
  };
  card.appendChild(loginBtn);

  const regLink = document.createElement('p');
  regLink.textContent = 'アカウントをお持ちでない方はこちら';
  regLink.style.marginTop = '20px';
  regLink.style.fontSize = '0.9rem';
  regLink.style.cursor = 'pointer';
  regLink.style.textDecoration = 'underline';
  regLink.onclick = showRegister;
  card.appendChild(regLink);

  loginArea.appendChild(card);
}

function showRegister() {
  headerTitle.textContent = '新規登録';
  hideAllSections();
  const regArea = document.getElementById('register-area');
  regArea.style.display = 'block';
  regArea.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'card fade-in';
  card.style.textAlign = 'center';

  const title = document.createElement('h2');
  title.textContent = 'アカウント作成';
  title.style.marginBottom = '20px';
  card.appendChild(title);

  const inputUser = document.createElement('input');
  inputUser.type = 'text';
  inputUser.placeholder = 'ユーザー名';
  inputUser.style.width = '100%';
  inputUser.style.padding = '15px';
  inputUser.style.marginBottom = '10px';
  inputUser.style.borderRadius = '10px';
  inputUser.style.border = '1px solid #ccc';
  card.appendChild(inputUser);

  const inputPass = document.createElement('input');
  inputPass.type = 'password';
  inputPass.placeholder = 'パスワード';
  inputPass.style.width = '100%';
  inputPass.style.padding = '15px';
  inputPass.style.marginBottom = '20px';
  inputPass.style.borderRadius = '10px';
  inputPass.style.border = '1px solid #ccc';
  card.appendChild(inputPass);

  const regBtn = document.createElement('button');
  regBtn.className = 'next-btn';
  regBtn.textContent = '登録してはじめる';
  regBtn.style.marginTop = '0';
  regBtn.onclick = async () => {
    const username = inputUser.value;
    const password = inputPass.value;
    if (!username || !password) return alert('入力してください');

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        alert('登録しました！ログインしてください。');
        showLogin();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('エラーが発生しました');
    }
  };
  card.appendChild(regBtn);

  const loginLink = document.createElement('p');
  loginLink.textContent = 'すでにアカウントをお持ちの方はこちら';
  loginLink.style.marginTop = '20px';
  loginLink.style.fontSize = '0.9rem';
  loginLink.style.cursor = 'pointer';
  loginLink.style.textDecoration = 'underline';
  loginLink.onclick = showLogin;
  card.appendChild(loginLink);

  regArea.appendChild(card);
}

function logout() {
  currentUser = null;
  localStorage.removeItem('studyAppUser');
  showLogin();
}

// --- Views ---

async function showSubjects() {
  headerTitle.textContent = `ようこそ、${currentUser.username}さん`;
  hideAllSections();
  const subjectSelection = document.getElementById('subject-selection');
  subjectSelection.style.display = 'block';
  const list = document.getElementById('subject-list');
  list.innerHTML = '<div class="loader">Loading...</div>';

  try {
    const res = await fetch(`${API_BASE}/subjects`);
    const data = await res.json();
    const subjects = data.data;

    list.innerHTML = '';
    subjects.forEach(subject => {
      const card = document.createElement('div');
      card.className = 'card subject-card fade-in';
      card.style.borderLeft = `5px solid ${subject.color || '#00e5ff'}`;
      card.textContent = subject.name;
      card.onclick = () => showCategories(subject.id);
      list.appendChild(card);
    });

  } catch (e) {
    list.innerHTML = '<p class="error">エラーが発生しました。</p>';
  }
}

function showCategories(subjectId) {
  currentSubjectId = subjectId;
  selectedType = null; // Reset type

  hideAllSections();

  // If English (ID 1), show Type Selection first
  // Note: Hardcoding ID 1 for English based on DB check.
  // Ideally we should check subject name or have a flag.
  if (subjectId == 1) {
    document.getElementById('type-selection').style.display = 'block';
    return;
  }

  fetchCategories(subjectId);
}

function selectType(type) {
  selectedType = type;
  hideAllSections();
  fetchCategories(currentSubjectId, type);
}

function backToTypesOrSubjects() {
  hideAllSections();
  if (currentSubjectId == 1) {
    document.getElementById('type-selection').style.display = 'block';
  } else {
    showSubjects();
  }
}

function backToCategories() {
  hideAllSections();
  // Re-fetch categories to show the list
  fetchCategories(currentSubjectId, selectedType);
}

async function fetchCategories(subjectId, type = null) {
  try {
    let url = `${API_BASE}/categories?subject_id=${subjectId}`;
    if (type) url += `&type=${type}`;
    console.log('Fetching URL:', url);

    const res = await fetch(url);
    const data = await res.json();
    const categories = data.data;

    hideAllSections();
    const categorySelection = document.getElementById('category-selection');
    categorySelection.style.display = 'block';

    const list = document.getElementById('category-list');
    list.innerHTML = '';

    // Update Back Button
    const backBtn = document.getElementById('back-to-type-btn');
    if (subjectId == 1) {
      backBtn.textContent = '← 出題形式へ戻る';
      backBtn.onclick = backToTypesOrSubjects;
    } else {
      backBtn.textContent = '← 科目一覧へ戻る';
      backBtn.onclick = showSubjects;
    }

    // Header for categories
    const subjectName = (await (await fetch(`${API_BASE}/subjects/${subjectId}`)).json()).data.name;
    headerTitle.textContent = subjectName;

    if (categories.length === 0) {
      list.innerHTML = '<p>まだ単元がありません。</p>';
      return;
    }

    categories.forEach(category => {
      const card = document.createElement('div');
      card.className = 'card category-card fade-in';
      card.textContent = category.name;
      card.onclick = () => showModeSelection(category.id, category.name);
      list.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    alert('エラーが発生しました。');
  }
}

function showModeSelection(categoryId, categoryName) {
  selectedCategoryId = categoryId;
  selectedCategoryName = categoryName; // Update selectedCategoryName
  hideAllSections();

  const modeSelection = document.getElementById('mode-selection');
  modeSelection.style.display = 'block';

  // Update header if needed, or just rely on global headerTitle
  // index.html has <h2>学習モードを選択</h2>
  // Maybe add category name to it?
  // Let's just keep it simple for now or update a specific element if it existed.
}

async function startQuiz(mode) {
  currentMode = mode;
  hideAllSections();
  const quizArea = document.getElementById('quiz-area');
  quizArea.style.display = 'block';
  quizArea.innerHTML = '<div class="loader">Loading...</div>';

  try {
    const res = await fetch(`${API_BASE}/questions/${selectedCategoryId}`);
    const data = await res.json();
    let allQuestions = data.data;

    // Deduplicate
    const uniqueQuestions = [];
    const seenTexts = new Set();
    for (const q of allQuestions) {
      // Filter by type if selected
      if (selectedType && q.type !== selectedType) continue;

      if (!seenTexts.has(q.question_text)) {
        seenTexts.add(q.question_text);
        uniqueQuestions.push(q);
      }
    }
    allQuestions = uniqueQuestions;

    if (mode === 'normal') {
      questions = allQuestions.sort((a, b) => a.id - b.id);

      // Check for progress
      const userId = currentUser ? currentUser.id : 'guest';
      const lastId = localStorage.getItem(`normal_progress_${userId}_${selectedCategoryId}`);

      if (lastId) {
        // Find index
        const lastIndex = questions.findIndex(q => q.id == lastId);
        if (lastIndex !== -1 && lastIndex < questions.length - 1) {
          // Show Resume UI
          quizArea.innerHTML = '';
          const card = document.createElement('div');
          card.className = 'card fade-in';
          card.style.textAlign = 'center';
          card.innerHTML = `
            <h2>前回の続きから始めますか？</h2>
            <p>前回は ${lastIndex + 1} 問目まで終了しています。</p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
              <button class="next-btn" id="resume-btn">続きから</button>
              <button class="text-btn" id="restart-btn">最初から</button>
            </div>
          `;
          quizArea.appendChild(card);

          document.getElementById('resume-btn').onclick = () => {
            currentQuestionIndex = lastIndex + 1;
            showQuestion();
          };
          document.getElementById('restart-btn').onclick = () => {
            currentQuestionIndex = 0;
            // Optional: Clear progress?
            // localStorage.removeItem(`normal_progress_${userId}_${selectedCategoryId}`);
            showQuestion();
          };
          return; // Stop here, wait for user input
        }
      }

    } else if (mode === 'test') {
      questions = allQuestions.sort(() => Math.random() - 0.5);
    } else if (mode === 'review') {
      const userId = currentUser ? currentUser.id : 'guest';
      const stored = localStorage.getItem(`wrong_questions_${userId}_${selectedCategoryId}`);
      const wrongIds = stored ? JSON.parse(stored) : [];

      if (wrongIds.length === 0) {
        alert('復習する問題がありません。');
        showModeSelection(selectedCategoryId, selectedCategoryName);
        return;
      }

      questions = allQuestions.filter(q => wrongIds.includes(q.id));
      if (questions.length === 0) {
        alert('復習する問題が見つかりません。');
        showModeSelection(selectedCategoryId, selectedCategoryName);
        return;
      }
      questions.sort(() => Math.random() - 0.5);
    } else if (mode === 'classification') {
      const userId = currentUser ? currentUser.id : 'guest';
      const stored = localStorage.getItem(`sorted_history_${userId}_${selectedCategoryId}`);
      const sortedIds = stored ? JSON.parse(stored) : [];

      questions = allQuestions.filter(q => !sortedIds.includes(q.id));

      if (questions.length === 0) {
        // All sorted
        quizArea.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'card fade-in';
        card.style.textAlign = 'center';
        card.innerHTML = `
          <h2>全て仕分け済みです</h2>
          <p>この単元の問題はすべて出題されました。</p>
          <button class="next-btn" onclick="resetSortedHistory()">リセットして最初から</button>
          <button class="text-btn" onclick="showModeSelection(selectedCategoryId, selectedCategoryName)">モード選択に戻る</button>
        `;
        quizArea.appendChild(card);
        return;
      }

      questions.sort(() => Math.random() - 0.5);
    }

    currentQuestionIndex = 0;
    userAnswers = [];

    if (questions.length === 0) {
      quizArea.innerHTML = '<p>問題がありません。</p>';
      const backBtn = document.createElement('button');
      backBtn.textContent = '戻る';
      backBtn.className = 'next-btn';
      backBtn.onclick = () => showModeSelection(selectedCategoryId, selectedCategoryName);
      quizArea.appendChild(backBtn);
      return;
    }

    showQuestion();
  } catch (err) {
    console.error(err);
    alert('問題の読み込みに失敗しました');
    showModeSelection(selectedCategoryId, selectedCategoryName);
  }
}

function showQuestion() {
  const quizArea = document.getElementById('quiz-area');
  if (currentQuestionIndex >= questions.length) {
    showResult();
    return;
  }

  const question = questions[currentQuestionIndex];
  quizArea.innerHTML = '';

  // Back Button (In-Quiz)
  const backBtn = document.createElement('button');
  backBtn.textContent = '← モード選択に戻る';
  backBtn.style.background = 'none';
  backBtn.style.border = 'none';
  backBtn.style.color = '#888';
  backBtn.style.fontSize = '0.85rem';
  backBtn.style.cursor = 'pointer';
  backBtn.style.padding = '5px 0';
  backBtn.style.marginBottom = '15px';
  backBtn.style.textAlign = 'left';
  backBtn.style.display = 'block';
  backBtn.style.fontWeight = 'normal';
  backBtn.onmouseover = () => backBtn.style.color = '#ccc';
  backBtn.onmouseout = () => backBtn.style.color = '#888';
  backBtn.onclick = () => showModeSelection(selectedCategoryId, selectedCategoryName);
  quizArea.appendChild(backBtn);

  const container = document.createElement('div');
  container.className = 'question-container fade-in';

  // Progress
  const progress = document.createElement('div');
  progress.style.display = 'flex';
  progress.style.justifyContent = 'space-between';
  progress.style.color = '#666';
  progress.style.marginBottom = '10px';

  const qNum = document.createElement('span');
  qNum.textContent = `問 ${currentQuestionIndex + 1} / ${questions.length}`;
  progress.appendChild(qNum);

  if (question.year) {
    let y = String(question.year);
    if (y.includes('+')) {
      y = y.replace('+', '年 追試');
    } else {
      y += '年';
    }
    const yearSpan = document.createElement('span');
    yearSpan.textContent = `[${y}]`;
    progress.appendChild(yearSpan);
  }

  // Apply Global Title Font
  if (globalSettings.font_title) {
    progress.style.fontSize = globalSettings.font_title;
  }

  // Loop Count (Normal Mode)
  if (currentMode === 'normal') {
    const loopCount = getNormalLoopCount();
    const loopSpan = document.createElement('span');
    loopSpan.textContent = ` (${loopCount}周目)`;
    loopSpan.style.marginLeft = '10px';
    progress.appendChild(loopSpan);
  }

  container.appendChild(progress);

  // Question Text
  const qText = document.createElement('div');
  qText.className = 'question-text';
  // Format text: Replace () with (　　　) and allow HTML
  const formattedText = question.question_text.replace(/\(\)/g, '(　　　)');
  qText.innerHTML = formattedText;

  // Apply Global Question Font
  if (globalSettings.font_question) {
    qText.style.fontSize = globalSettings.font_question;
  }

  if (question.font_size) {
    try {
      const styles = JSON.parse(question.font_size);
      if (styles.question) qText.style.fontSize = styles.question;
      if (styles.title) progress.style.fontSize = styles.title;
    } catch (e) {
      // Legacy
      qText.style.fontSize = question.font_size;
    }
  }
  container.appendChild(qText);

  // Answer Area
  const answerArea = document.createElement('div');
  answerArea.className = 'answer-area';
  container.appendChild(answerArea);

  // Render based on type
  if (question.type === 'selection') {
    renderSelection(question, answerArea);
  } else if (question.type === 'sorting') {
    renderSorting(question, answerArea);
  } else {
    answerArea.textContent = 'この問題形式はまだ対応していません。';
    setTimeout(nextQuestion, 2000);
  }

  quizArea.appendChild(container);
}

function renderSelection(question, container) {
  const optionsGrid = document.createElement('div');
  optionsGrid.className = 'options-grid';

  // Check if all options are short (e.g., <= 15 chars) to switch to 2-column layout
  const allShort = question.options.every(opt => opt.length <= 15);
  if (allShort) {
    optionsGrid.classList.add('grid-2x2');
  }

  // Shuffle options
  const shuffledOptions = [...question.options];
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
  }

  shuffledOptions.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = option;
    btn.onclick = () => checkAnswer(question, option, btn);
    optionsGrid.appendChild(btn);
  });

  container.appendChild(optionsGrid);
}

function renderSorting(question, container) {
  let currentOrder = [];
  const options = [...question.options]; // Copy
  // Shuffle options for display? Usually sorting implies shuffling.
  // For now, let's assume they come shuffled or we shuffle them.
  options.sort(() => Math.random() - 0.5);

  const sortArea = document.createElement('div');
  sortArea.className = 'sortable-area';
  container.appendChild(sortArea);

  const wordBank = document.createElement('div');
  wordBank.className = 'word-bank';
  container.appendChild(wordBank);

  const checkBtn = document.createElement('button');
  checkBtn.className = 'next-btn';
  checkBtn.textContent = '回答する';
  checkBtn.style.marginTop = '20px';
  checkBtn.onclick = () => {
    const answer = currentOrder.join(' ');
    checkAnswer(question, answer, null);
  };
  container.appendChild(checkBtn);

  // Render words
  options.forEach(word => {
    const chip = document.createElement('div');
    chip.className = 'word-chip';
    chip.textContent = word;
    chip.onclick = () => {
      if (currentOrder.includes(word)) {
        // Remove from area, back to bank
        currentOrder = currentOrder.filter(w => w !== word);
        renderSortingState(sortArea, wordBank, options, currentOrder);
      } else {
        // Add to area
        currentOrder.push(word);
        renderSortingState(sortArea, wordBank, options, currentOrder);
      }
    };
    wordBank.appendChild(chip);
  });
}

function renderSortingState(sortArea, wordBank, allWords, currentOrder) {
  sortArea.innerHTML = '';
  wordBank.innerHTML = '';

  currentOrder.forEach(word => {
    const chip = document.createElement('div');
    chip.className = 'word-chip';
    chip.textContent = word;
    chip.onclick = () => {
      // Remove logic
      // (Need to access parent scope variables or pass them down.
      //  Re-rendering whole thing is easier for this simple app)
      const newOrder = currentOrder.filter(w => w !== word);
      renderSortingState(sortArea, wordBank, allWords, newOrder);
      // Update the main currentOrder variable in closure if possible or return it
      // This is a bit tricky with simple functions. Let's use a simple DOM manipulation approach instead for next iteration if this gets complex.
      // Actually, let's just re-trigger the click logic by finding the element.
      // For simplicity in this v1, let's just assume the user taps words in bank to add, taps in area to remove.
    };
    sortArea.appendChild(chip);
  });

  const remainingWords = allWords.filter(w => !currentOrder.includes(w)); // Simple filter, assumes unique words for now.
  // If duplicate words exist, we need index tracking. For v1 assume unique.

  remainingWords.forEach(word => {
    const chip = document.createElement('div');
    chip.className = 'word-chip';
    chip.textContent = word;
    chip.onclick = () => {
      const newOrder = [...currentOrder, word];
      renderSortingState(sortArea, wordBank, allWords, newOrder);
    };
    wordBank.appendChild(chip);
  });

  // Update the closure variable 'currentOrder' is hard here without a class or object.
  // Let's hack it: update the DOM, and when 'Check' is clicked, read the text from sortArea.
}
// Fix for sorting logic:
// We will rewrite renderSorting to be self-contained or use a global/object state.
// Let's use a simpler approach for the 'renderSorting' above: just read from DOM on submit.

function checkAnswer(question, userAnswer, btnElement) {
  const isCorrect = userAnswer === question.answer;

  // For selection questions, allow retrying if incorrect (ONLY in Normal/Review mode?)
  // User asked for "Test Mode" to track results.
  // In Test Mode, usually you don't retry immediately, you move on?
  // Or do you retry but it's marked wrong?
  // "一通りの問題を重複なく出題し、正解した問題と不正解の問題を仕分けするモード"
  // This implies we record the FIRST attempt.

  if (currentMode === 'test') {
    // Record result on first attempt
    if (!isCorrect) {
      saveIncorrectQuestion(question.id);
    } else {
      handleCorrectAnswer(question.id);
    }
  } else if (currentMode === 'classification') {
    // Save as sorted (attempted)
    saveSortedQuestion(question.id);

    // Check if there were prior incorrect attempts (for selection questions)
    const hasPriorIncorrect = document.querySelector('.option-btn.incorrect') !== null;

    // Also track correctness for review
    if (!isCorrect) {
      saveIncorrectQuestion(question.id);
    } else {
      // Only remove if they got it right on the FIRST attempt (no prior incorrects)
      if (!hasPriorIncorrect) {
        handleCorrectAnswer(question.id);
      }
    }
  } else if (currentMode === 'normal') {
    // Save progress
    saveNormalProgress(question.id);
  } else if (currentMode === 'review') {
    // Check if there were prior incorrect attempts
    const hasPriorIncorrect = document.querySelector('.option-btn.incorrect') !== null;

    if (!isCorrect) {
      saveIncorrectQuestion(question.id); // Reset count
    } else {
      // Only increment count if answered correctly on FIRST attempt
      if (!hasPriorIncorrect) {
        handleCorrectAnswer(question.id);
      }
    }
  }

  // In Normal/Review mode, allow retry for selection questions if incorrect
  if (currentMode !== 'test' && question.type === 'selection' && !isCorrect) {
    if (btnElement) {
      btnElement.classList.add('incorrect');
      btnElement.disabled = true;
    }
    return;
  }

  // Disable all buttons (for correct answer or other types)
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(b => b.disabled = true);



  // Visual Feedback
  if (btnElement) {
    btnElement.classList.add(isCorrect ? 'correct' : 'incorrect');
  }

  const feedback = document.createElement('div');
  feedback.className = `feedback show ${isCorrect ? 'correct' : 'incorrect'}`;

  let msg = isCorrect ? '正解！' : '残念...';
  if (isCorrect) {
    // Check consecutive count if it was in review list
    const userId = currentUser ? currentUser.id : 'guest';
    const key = `wrong_questions_${userId}_${selectedCategoryId}`;
    const stored = localStorage.getItem(key);
    const wrongIds = stored ? JSON.parse(stored) : [];

    if (wrongIds.includes(question.id)) {
      const countKey = `review_count_${userId}_${selectedCategoryId}`;
      const countStored = localStorage.getItem(countKey);
      const counts = countStored ? JSON.parse(countStored) : {};
      const currentCount = counts[question.id] || 0;
      // Note: handleCorrectAnswer has already been called and incremented it (or removed it)
      // If removed, currentCount would be undefined or we need to check if it's still in wrongIds?
      // Actually handleCorrectAnswer is called BEFORE this feedback generation in checkAnswer?
      // Yes, checkAnswer calls handleCorrectAnswer first.

      // So if it was removed, it means it reached 3.
      // If not removed, it shows current count.
      // Let's re-read the count.
      const newCountStored = localStorage.getItem(countKey);
      const newCounts = newCountStored ? JSON.parse(newCountStored) : {};
      const newCount = newCounts[question.id];

      if (newCount) {
        msg += ` (連続正解: ${newCount}/3)`;
      } else {
        msg += ` (復習クリア！)`;
      }
    }
  }

  feedback.innerHTML = `
        <p>${msg}</p>
        <p style="font-size:0.9rem; margin-top:5px;">${question.explanation || ''}</p>
    `;
  document.querySelector('.question-container').appendChild(feedback);

  // Save Log
  fetch(`${API_BASE}/study_logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: currentUser ? currentUser.id : 'guest',
      question_id: question.id,
      is_correct: isCorrect ? 1 : 0
    })
  });

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'next-btn';
  nextBtn.textContent = currentQuestionIndex < questions.length - 1 ? '次の問題へ' : '結果を見る';
  nextBtn.onclick = nextQuestion;
  document.querySelector('.question-container').appendChild(nextBtn);
}

function nextQuestion() {
  currentQuestionIndex++;
  showQuestion();
}

function showModeSelection(categoryId, categoryName) {
  selectedCategoryId = categoryId;
  if (categoryName) selectedCategoryName = categoryName;
  hideAllSections();

  const modeSelection = document.getElementById('mode-selection');
  modeSelection.style.display = 'block';
  modeSelection.innerHTML = ''; // Clear previous content

  // Back button
  const backBtn = document.createElement('button');
  backBtn.textContent = '← 単元一覧へ戻る';
  backBtn.className = 'text-btn';
  backBtn.style.marginBottom = '10px';
  backBtn.style.border = 'none';
  backBtn.style.background = 'none';
  backBtn.style.color = '#666';
  backBtn.style.cursor = 'pointer';
  backBtn.onclick = backToCategories;
  modeSelection.appendChild(backBtn);

  const h2 = document.createElement('h2');
  h2.textContent = `${selectedCategoryName} - 学習モード選択`;
  modeSelection.appendChild(h2);

  const modes = [
    { id: 'normal', name: 'ノーマルモード', desc: '順番通りに出題します。' },
    { id: 'test', name: '実力テストモード', desc: 'ランダムに出題し、苦手な問題を記録します。' },
    { id: 'review', name: '復習モード', desc: '間違えた問題のみを出題します。' },
    { id: 'classification', name: '仕分けモード', desc: 'ランダムに出題し、一度出題された問題はリセットするまで出題されません。' }
  ];

  modes.forEach(mode => {
    const card = document.createElement('div');
    card.className = 'mode-card';
    card.onclick = () => startQuiz(mode.id);

    const h3 = document.createElement('h3');
    h3.textContent = mode.name;
    card.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = mode.desc;
    card.appendChild(p);

    modeSelection.appendChild(card);
  });

  // Update header if needed, or just rely on global headerTitle
  // index.html has <h2>学習モードを選択</h2>
  // Maybe add category name to it?
  // Let's just keep it simple for now or update a specific element if it existed.
}

function showResult() {
  headerTitle.textContent = '学習完了';
  const quizArea = document.getElementById('quiz-area');
  quizArea.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'card fade-in';
  card.style.textAlign = 'center';

  const title = document.createElement('h2');
  title.textContent = 'お疲れ様でした！';
  card.appendChild(title);

  const msg = document.createElement('p');
  msg.textContent = 'この単元の学習が終了しました。';
  card.appendChild(msg);

  if (currentMode === 'normal') {
    // Buttons for Normal Mode
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';
    btnContainer.style.justifyContent = 'center';
    btnContainer.style.marginTop = '20px';

    const backBtn = document.createElement('button');
    backBtn.className = 'text-btn';
    backBtn.textContent = '前の画面にもどる';
    backBtn.onclick = () => showModeSelection(selectedCategoryId, '');
    btnContainer.appendChild(backBtn);

    const loopCount = getNormalLoopCount();
    const restartBtn = document.createElement('button');
    restartBtn.className = 'next-btn';
    restartBtn.textContent = `最初の問題に戻る (${loopCount + 1}周目へ)`;
    restartBtn.onclick = () => {
      incrementNormalLoopCount();
      currentQuestionIndex = 0;
      showQuestion();
    };
    btnContainer.appendChild(restartBtn);

    card.appendChild(btnContainer);
  } else {
    // Default button
    const btn = document.createElement('button');
    btn.className = 'next-btn';
    btn.textContent = '科目一覧に戻る';
    btn.onclick = showSubjects;
    card.appendChild(btn);
  }

  quizArea.appendChild(card);
}

// LocalStorage Helpers
function saveIncorrectQuestion(id) {
  const userId = currentUser ? currentUser.id : 'guest';
  const listKey = `wrong_questions_${userId}_${selectedCategoryId}`;
  const countKey = `review_count_${userId}_${selectedCategoryId}`;

  let storedList = localStorage.getItem(listKey);
  let ids = storedList ? JSON.parse(storedList) : [];

  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(listKey, JSON.stringify(ids));
  }

  // Reset count to 0
  let storedCounts = localStorage.getItem(countKey);
  let counts = storedCounts ? JSON.parse(storedCounts) : {};
  counts[id] = 0;
  localStorage.setItem(countKey, JSON.stringify(counts));
}

function removeIncorrectQuestion(id) {
  // Deprecated, use handleCorrectAnswer
  handleCorrectAnswer(id);
}

function handleCorrectAnswer(id) {
  const userId = currentUser ? currentUser.id : 'guest';
  const listKey = `wrong_questions_${userId}_${selectedCategoryId}`;
  const countKey = `review_count_${userId}_${selectedCategoryId}`;

  let storedList = localStorage.getItem(listKey);
  let ids = storedList ? JSON.parse(storedList) : [];

  if (!ids.includes(id)) return; // Not in list, nothing to do

  let storedCounts = localStorage.getItem(countKey);
  let counts = storedCounts ? JSON.parse(storedCounts) : {};

  let count = counts[id] || 0;
  count++;

  if (count >= 3) {
    // Remove from list and counts
    ids = ids.filter(i => i !== id);
    delete counts[id];
  } else {
    // Update count
    counts[id] = count;
  }

  localStorage.setItem(listKey, JSON.stringify(ids));
  localStorage.setItem(countKey, JSON.stringify(counts));
}

function saveIncorrectQuestion(id) {
  const userId = currentUser ? currentUser.id : 'guest';
  const listKey = `wrong_questions_${userId}_${selectedCategoryId}`;
  const countKey = `review_count_${userId}_${selectedCategoryId}`;

  let storedList = localStorage.getItem(listKey);
  let ids = storedList ? JSON.parse(storedList) : [];

  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(listKey, JSON.stringify(ids));
  }

  // Reset count to 0
  let storedCounts = localStorage.getItem(countKey);
  let counts = storedCounts ? JSON.parse(storedCounts) : {};
  counts[id] = 0;
  localStorage.setItem(countKey, JSON.stringify(counts));
}

function saveSortedQuestion(id) {
  const userId = currentUser ? currentUser.id : 'guest';
  const key = `sorted_history_${userId}_${selectedCategoryId}`;
  let stored = localStorage.getItem(key);
  let ids = stored ? JSON.parse(stored) : [];
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(key, JSON.stringify(ids));
  }
}

function resetSortedHistory() {
  const userId = currentUser ? currentUser.id : 'guest';
  const key = `sorted_history_${userId}_${selectedCategoryId}`;
  localStorage.removeItem(key);
  startQuiz('classification');
}

function saveNormalProgress(id) {
  const userId = currentUser ? currentUser.id : 'guest';
  const key = `normal_progress_${userId}_${selectedCategoryId}`;
  localStorage.setItem(key, id);
}

function getNormalLoopCount() {
  const userId = currentUser ? currentUser.id : 'guest';
  const key = `normal_loop_${userId}_${selectedCategoryId}`;
  const count = localStorage.getItem(key);
  return count ? parseInt(count, 10) : 1;
}

function incrementNormalLoopCount() {
  const userId = currentUser ? currentUser.id : 'guest';
  const key = `normal_loop_${userId}_${selectedCategoryId}`;
  let count = getNormalLoopCount();
  count++;
  localStorage.setItem(key, count);
}

// Start
init();
