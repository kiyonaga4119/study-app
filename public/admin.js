const API_BASE = '/api';

// State
let selectedSubjectId = null;
let selectedCategoryId = null;
let editingQuestionId = null;
let currentQuestions = [];
let currentPage = 1;
let itemsPerPage = 5;

// Init
function init() {
  showTab('section-content'); // Default to content
  loadCsvSubjects();
  loadExportedFiles();
  loadSettings();
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const settings = await res.json();
    if (settings.font_header) document.getElementById('setting-font-header').value = settings.font_header;
    if (settings.font_question) document.getElementById('setting-font-question').value = settings.font_question;
    if (settings.font_title) document.getElementById('setting-font-title').value = settings.font_title;
  } catch (err) {
    console.error('Failed to load settings', err);
  }
}

async function saveSettings() {
  const fontHeader = document.getElementById('setting-font-header').value;
  const fontQuestion = document.getElementById('setting-font-question').value;
  const fontTitle = document.getElementById('setting-font-title').value;

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        font_header: fontHeader,
        font_question: fontQuestion,
        font_title: fontTitle
      })
    });
    if (!res.ok) throw new Error('Save failed');
    alert('設定を保存しました');
  } catch (err) {
    alert('保存に失敗しました: ' + err.message);
  }
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';

  if (tabId === 'rankings') {
    loadRankings();
  }
}

async function loadRankings() {
  try {
    const res = await fetch(`${API_BASE}/admin/rankings`);
    const rankings = await res.json();

    const list = document.getElementById('ranking-list');
    if (!rankings || rankings.length === 0) {
      list.innerHTML = '<p>ランキングデータがありません。</p>';
      return;
    }

    let html = `
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#eee;">
            <th style="padding:8px; border:1px solid #ddd;">ID</th>
            <th style="padding:8px; border:1px solid #ddd;">日時</th>
            <th style="padding:8px; border:1px solid #ddd;">ユーザー</th>
            <th style="padding:8px; border:1px solid #ddd;">教科 - 単元</th>
            <th style="padding:8px; border:1px solid #ddd;">スコア</th>
            <th style="padding:8px; border:1px solid #ddd;">操作</th>
          </tr>
        </thead>
        <tbody>
    `;

    rankings.forEach(r => {
      const date = new Date(r.created_at).toLocaleString();
      html += `
        <tr>
          <td style="padding:8px; border:1px solid #ddd;">${r.id}</td>
          <td style="padding:8px; border:1px solid #ddd;">${date}</td>
          <td style="padding:8px; border:1px solid #ddd;">${r.username}</td>
          <td style="padding:8px; border:1px solid #ddd;">${r.subject_name} - ${r.category_name}</td>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">${r.score}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">
            <button onclick="deleteRanking(${r.id})" style="background:#ff5252; color:white; border:none; padding:5px 10px; cursor:pointer;">削除</button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    list.innerHTML = html;
  } catch (err) {
    console.error(err);
    alert('ランキングの読み込みに失敗しました');
  }
}

async function deleteRanking(id) {
  if (!confirm('本当にこのランキングデータを削除しますか？')) return;

  try {
    const res = await fetch(`${API_BASE}/rankings/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadRankings();
    } else {
      alert('削除に失敗しました');
    }
  } catch (err) {
    console.error(err);
    alert('エラーが発生しました');
  }
}


// --- Users ---
async function loadUsers() {
  const res = await fetch(`${API_BASE}/users`);
  const data = await res.json();
  const list = document.getElementById('user-list');
  list.innerHTML = '';
  data.data.forEach(user => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
            <span>${user.username} (ID: ${user.id})</span>
            <button class="delete-btn" onclick="deleteUser(${user.id})">削除</button>
        `;
    list.appendChild(div);
  });
}

async function deleteUser(id) {
  if (!confirm('本当に削除しますか？')) return;
  await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
  loadUsers();
}

// --- Content: Subjects ---
async function loadSubjects() {
  const res = await fetch(`${API_BASE}/subjects`);
  const data = await res.json();
  const list = document.getElementById('subject-list');
  list.innerHTML = '';
  data.data.forEach(subject => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.style.borderLeft = `5px solid ${subject.color}`;
    div.innerHTML = `
            <span style="cursor:pointer; flex:1;" onclick="selectSubject(${subject.id}, '${subject.name}')">${subject.name}</span>
            <button class="delete-btn" onclick="deleteSubject(${subject.id})">削除</button>
        `;
    list.appendChild(div);
  });
}

async function addSubject() {
  const name = document.getElementById('new-subject-name').value;
  const color = document.getElementById('new-subject-color').value;
  if (!name) return;
  await fetch(`${API_BASE}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color })
  });
  document.getElementById('new-subject-name').value = '';
  loadSubjects();
}

async function deleteSubject(id) {
  if (!confirm('科目を削除すると、含まれる単元と問題も削除されます（実装依存）。削除しますか？')) return;
  await fetch(`${API_BASE}/subjects/${id}`, { method: 'DELETE' });
  loadSubjects();
  document.getElementById('category-section').style.display = 'none';
  document.getElementById('question-section').style.display = 'none';
}

// --- Content: Categories ---
function selectSubject(id, name) {
  selectedSubjectId = id;
  document.getElementById('selected-subject-name').textContent = `${name} の単元`;
  document.getElementById('category-section').style.display = 'block';
  document.getElementById('question-section').style.display = 'none';
  loadCategories(id);
  // Scroll to section
  document.getElementById('category-section').scrollIntoView({ behavior: 'smooth' });
}

async function loadCategories(subjectId) {
  const res = await fetch(`${API_BASE}/categories/${subjectId}`);
  const data = await res.json();
  const list = document.getElementById('category-list');
  list.innerHTML = '';
  data.data.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
            <span style="cursor:pointer; flex:1;" onclick="selectCategory(${cat.id}, '${cat.name}')">${cat.name}</span>
            <button class="delete-btn" onclick="deleteCategory(${cat.id})">削除</button>
        `;
    list.appendChild(div);
  });
}

async function addCategory() {
  const name = document.getElementById('new-category-name').value;
  if (!name || !selectedSubjectId) return;
  await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject_id: selectedSubjectId, name })
  });
  document.getElementById('new-category-name').value = '';
  loadCategories(selectedSubjectId);
}

async function deleteCategory(id) {
  if (!confirm('削除しますか？')) return;
  await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
  loadCategories(selectedSubjectId);
  document.getElementById('question-section').style.display = 'none';
}

// --- Content: Questions ---
function selectCategory(id, name) {
  selectedCategoryId = id;
  const h3 = document.getElementById('selected-category-name');
  h3.innerHTML = '';

  const span = document.createElement('span');
  span.textContent = `${name} の問題`;
  h3.appendChild(span);

  const editBtn = document.createElement('button');
  editBtn.textContent = '名前を変更';
  editBtn.style.marginLeft = '15px';
  editBtn.style.fontSize = '0.8rem';
  editBtn.style.padding = '5px 10px';
  editBtn.style.cursor = 'pointer';
  editBtn.onclick = () => editCategoryName(id, name);
  h3.appendChild(editBtn);

  document.getElementById('question-section').style.display = 'block';
  loadQuestions(id);
  document.getElementById('question-section').scrollIntoView({ behavior: 'smooth' });
}

async function loadQuestions(categoryId) {
  const res = await fetch(`${API_BASE}/questions/${categoryId}`);
  const data = await res.json();
  currentQuestions = data.data; // Save to state
  currentPage = 1; // Reset to first page
  renderQuestions();
}

function changeItemsPerPage() {
  const select = document.getElementById('items-per-page');
  itemsPerPage = parseInt(select.value, 10);
  currentPage = 1; // Reset to first page
  renderQuestions();
}

function renderQuestions() {
  const list = document.getElementById('question-list');
  list.innerHTML = '';

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageQuestions = currentQuestions.slice(start, end);

  pageQuestions.forEach(q => {
    const div = document.createElement('div');
    div.className = 'list-item';

    // Create elements safely
    const infoDiv = document.createElement('div');
    infoDiv.style.flex = '1';

    const textDiv = document.createElement('div');
    textDiv.style.fontWeight = 'bold';
    textDiv.style.fontSize = '0.9rem';
    // Format text: Replace () with (　　　) and allow HTML
    const formattedText = q.question_text.replace(/\(\)/g, '(　　　)');
    textDiv.innerHTML = formattedText; // Allow HTML tags like <br>, <i>

    // Removed per-question font style application in preview for now,
    // as it's global setting. Preview might need to fetch global settings to be accurate,
    // but for now let's keep preview standard.

    const metaDiv = document.createElement('div');
    metaDiv.style.fontSize = '0.8rem';
    metaDiv.style.color = '#aaa';
    let yearDisplay = '';
    if (q.year) {
      let y = String(q.year);
      if (y.includes('+')) {
        y = y.replace('+', '年 追試');
      } else {
        y += '年';
      }
      yearDisplay = `[${y}] `;
    }
    metaDiv.textContent = `${yearDisplay}${q.type} / 答: ${q.answer}`; // Safe text

    infoDiv.appendChild(textDiv);
    infoDiv.appendChild(metaDiv);

    const btnDiv = document.createElement('div');
    btnDiv.style.display = 'flex';
    btnDiv.style.gap = '10px';

    const editBtn = document.createElement('button');
    editBtn.className = 'delete-btn';
    editBtn.style.background = 'var(--primary-color)';
    editBtn.textContent = '編集';
    editBtn.onclick = () => editQuestion(q.id); // Direct function reference

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '削除';
    delBtn.onclick = () => deleteQuestion(q.id); // Direct function reference

    btnDiv.appendChild(editBtn);
    btnDiv.appendChild(delBtn);

    div.appendChild(infoDiv);
    div.appendChild(btnDiv);

    list.appendChild(div);
  });

  renderPagination();
}

function renderPagination() {
  const paginationDiv = document.getElementById('pagination');
  paginationDiv.innerHTML = '';

  const totalPages = Math.ceil(currentQuestions.length / itemsPerPage);
  if (totalPages <= 1) return;

  // Previous Button
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '前へ';
  prevBtn.className = 'edit-btn';
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
    } else {
      currentPage = totalPages; // Go to last page
    }
    renderQuestions();
  };
  paginationDiv.appendChild(prevBtn);

  // Page Info
  const pageInfo = document.createElement('span');
  pageInfo.textContent = `${currentPage} / ${totalPages}`;
  pageInfo.style.margin = '0 10px';
  paginationDiv.appendChild(pageInfo);

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '次へ';
  nextBtn.className = 'edit-btn';
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
    } else {
      currentPage = 1; // Go to first page
    }
    renderQuestions();
  };
  paginationDiv.appendChild(nextBtn);
}

async function addQuestion() {
  const type = document.querySelector('input[name="question-type"]:checked').value;
  const text = document.getElementById('new-question-text').value;
  const optionsStr = document.getElementById('new-question-options').value;
  const answer = document.getElementById('new-question-answer').value;
  const explanation = document.getElementById('new-question-explanation').value;
  const year = document.getElementById('new-question-year').value;

  // Removed per-question font logic

  if (!text || !answer || !selectedCategoryId) return alert('必須項目を入力してください');

  const options = optionsStr.split(',').map(s => s.trim());

  if (editingQuestionId) {
    // Update Mode
    console.log('Updating question ID:', editingQuestionId);
    try {
      const res = await fetch(`${API_BASE}/questions/${editingQuestionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          question_text: text,
          options,
          answer,
          explanation,
          year
        })
      });
      const json = await res.json();
      console.log('Update response:', json);

      if (!res.ok) throw new Error(json.error || 'Update failed');

      if (!res.ok) throw new Error(json.error || 'Update failed');

      // alert('更新しました！'); // Removed as requested
      // Auto advance to next question
      editNextQuestion();
    } catch (err) {
      console.error('Update error:', err);
      alert('更新に失敗しました: ' + err.message);
      return; // Don't clear form on error
    }
  } else {
    // Create Mode
    try {
      await fetch(`${API_BASE}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: selectedCategoryId,
          type,
          question_text: text,
          options,
          answer,
          explanation,
          year
        })
      });
      alert('追加しました！');
      resetForm();
    } catch (err) {
      console.error('Create error:', err);
      alert('追加に失敗しました: ' + err.message);
      return;
    }
  }

  loadQuestions(selectedCategoryId);
}

function resetForm() {
  editingQuestionId = null;
  document.getElementById('new-question-text').value = '';
  document.getElementById('new-question-options').value = '';
  document.getElementById('new-question-answer').value = '';
  document.getElementById('new-question-explanation').value = '';
  document.getElementById('new-question-year').value = '';
  // Removed font inputs clear

  document.getElementById('add-question-btn').textContent = '追加';
  document.querySelector('.add-form h4').textContent = '問題追加';
  document.getElementById('cancel-edit-btn').style.display = 'none';
  document.getElementById('prev-question-btn').style.display = 'none';
  document.getElementById('next-question-btn').style.display = 'none';
}

function cancelEdit() {
  resetForm();
  // alert('編集をキャンセルしました。');
}

function editPrevQuestion() {
  if (!editingQuestionId) return;
  const idx = currentQuestions.findIndex(q => q.id == editingQuestionId);
  if (idx > 0) {
    editQuestion(currentQuestions[idx - 1].id);
  } else {
    alert('最初の問題です');
  }
}

function editNextQuestion() {
  if (!editingQuestionId) return;
  const idx = currentQuestions.findIndex(q => q.id == editingQuestionId);
  if (idx !== -1 && idx < currentQuestions.length - 1) {
    editQuestion(currentQuestions[idx + 1].id);
  } else {
    alert('最後の問題です');
    resetForm(); // Or stay on last? User said "switch to next". If no next, maybe reset.
  }
}

function editQuestion(id) {
  // console.log('editQuestion called with ID:', id, typeof id);

  try {
    const q = currentQuestions.find(item => item.id == id);
    if (!q) {
      console.error('Question not found for ID:', id);
      alert('エラー: 問題データが見つかりません (ID: ' + id + ')');
      return;
    }

    editingQuestionId = q.id;
    // Set radio button
    const radios = document.getElementsByName('question-type');
    for (const r of radios) {
      if (r.value === (q.type || 'selection')) r.checked = true;
    }

    document.getElementById('new-question-text').value = q.question_text || '';
    document.getElementById('new-question-year').value = q.year || '';

    // Removed font inputs population

    // Handle options
    let optionsVal = '';
    if (Array.isArray(q.options)) {
      optionsVal = q.options.join(',');
    } else if (typeof q.options === 'string') {
      try {
        const parsed = JSON.parse(q.options);
        if (Array.isArray(parsed)) optionsVal = parsed.join(',');
        else optionsVal = q.options;
      } catch (e) {
        optionsVal = q.options;
      }
    }
    document.getElementById('new-question-options').value = optionsVal || '';
    document.getElementById('new-question-answer').value = q.answer || '';
    document.getElementById('new-question-explanation').value = q.explanation || '';

    document.getElementById('add-question-btn').textContent = '更新';
    document.querySelector('.add-form h4').textContent = '問題編集';
    // document.getElementById('cancel-edit-btn').style.display = 'block'; // Hide cancel as requested
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('prev-question-btn').style.display = 'block';
    document.getElementById('next-question-btn').style.display = 'block';

    document.querySelector('.add-form').scrollIntoView();

    // Focus on text field
    document.getElementById('new-question-text').focus();

    // Notify user
    // alert('編集モードになりました。下のフォームで内容を修正し、「更新」ボタンを押してください。');

  } catch (err) {
    console.error('Error in editQuestion:', err);
    alert('編集モードへの切り替えに失敗しました: ' + err.message);
  }
}

async function deleteQuestion(id) {
  if (!confirm('削除しますか？')) return;
  await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE' });
  loadQuestions(selectedCategoryId);
}

async function editCategoryName(id, currentName) {
  const newName = prompt('新しい単元名を入力してください:', currentName);
  if (!newName || newName === currentName) return;

  try {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    if (!res.ok) throw new Error('Update failed');

    alert('単元名を変更しました');
    // Reload categories and update header
    loadCategories(selectedSubjectId);
    selectCategory(id, newName);
  } catch (err) {
    console.error(err);
    alert('変更に失敗しました');
  }
}

// --- CSV Upload/Export ---

async function loadCsvSubjects() {
  const res = await fetch(`${API_BASE}/subjects`);
  const data = await res.json();
  const select = document.getElementById('csv-subject-select');
  select.innerHTML = '<option value="">全教科 (一括)</option>';
  data.data.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub.id;
    opt.textContent = sub.name;
    select.appendChild(opt);
  });
}

async function updateCsvCategorySelect() {
  const subjectId = document.getElementById('csv-subject-select').value;
  const select = document.getElementById('csv-category-select');
  select.innerHTML = '<option value="">全単元</option>';

  if (!subjectId) return;

  const res = await fetch(`${API_BASE}/categories/${subjectId}`);
  const data = await res.json();
  data.data.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
}

async function uploadCSV() {
  const fileInput = document.getElementById('csv-file');
  const file = fileInput.files[0];
  if (!file) return alert('ファイルを選択してください');

  const subjectId = document.getElementById('csv-subject-select').value;
  const categoryId = document.getElementById('csv-category-select').value;

  const formData = new FormData();
  formData.append('file', file);
  if (subjectId) formData.append('subject_id', subjectId);
  if (categoryId) formData.append('category_id', categoryId);

  try {
    const res = await fetch(`${API_BASE}/upload/csv`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadSubjects(); // Refresh main list
      loadCsvSubjects(); // Refresh CSV dropdowns
      fileInput.value = '';
    } else {
      alert('エラー: ' + data.error);
    }
  } catch (e) {
    alert('アップロードエラー');
  }
}

async function exportCSV() {
  const subjectId = document.getElementById('csv-subject-select').value;
  const categoryId = document.getElementById('csv-category-select').value;

  let url = `${API_BASE}/export/csv?`;
  if (subjectId) url += `subject_id=${subjectId}&`;
  if (categoryId) url += `category_id=${categoryId}`;

  window.location.href = url;
}

async function loadExportedFiles() {
  const res = await fetch(`${API_BASE}/exports`);
  const files = await res.json();
  const select = document.getElementById('exported-file-select');
  select.innerHTML = '<option value="">ファイルを選択...</option>';
  files.forEach(file => {
    const opt = document.createElement('option');
    opt.value = file;
    opt.textContent = file;
    select.appendChild(opt);
  });
}

async function downloadExportedFile() {
  const filename = document.getElementById('exported-file-select').value;
  if (!filename) return alert('ファイルを選択してください');
  window.location.href = `${API_BASE}/downloads/${filename}`;
}

init();
