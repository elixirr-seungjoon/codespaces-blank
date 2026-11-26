const STORAGE_KEY = "recall-wrong-notes-v1";
const starterNotes = [
  {
    id: "starter-1",
    category: "한국사",
    question: "조선 후기 실학자 정약용이 지방 행정의 개혁과 수령의 본분을 다루어 저술한 책은?",
    myAnswer: "목민심서",
    answer: "목민심서",
    note: "경세유표는 국가 제도의 개혁 방안을 담은 책이에요.",
    createdAt: "2026-03-18T09:00:00.000Z",
    mastered: false,
    reviewCount: 0,
  },
  {
    id: "starter-2",
    category: "정보처리기사",
    question: "데이터베이스에서 하나의 속성이 취할 수 있는 값의 범위를 무엇이라고 하나요?",
    myAnswer: "튜플",
    answer: "도메인(Domain)",
    note: "튜플은 테이블의 행, 도메인은 속성의 값 범위입니다.",
    createdAt: "2026-03-17T09:00:00.000Z",
    mastered: false,
    reviewCount: 0,
  },
  {
    id: "starter-3",
    category: "영어",
    question: "다음 문장에서 빈칸에 알맞은 동사의 형태를 고르세요: She ___ to work every morning.",
    myAnswer: "go",
    answer: "goes",
    note: "주어가 3인칭 단수이고 현재 시제이므로 동사에 -s를 붙여요.",
    createdAt: "2026-03-15T09:00:00.000Z",
    mastered: true,
    reviewCount: 2,
  },
];

const elements = {
  list: document.querySelector("#question-list"),
  empty: document.querySelector("#empty-state"),
  search: document.querySelector("#search-input"),
  categoryFilter: document.querySelector("#category-filter"),
  categoryNav: document.querySelector("#category-nav"),
  entryDialog: document.querySelector("#entry-dialog"),
  entryForm: document.querySelector("#entry-form"),
  reviewDialog: document.querySelector("#review-dialog"),
  toast: document.querySelector("#toast"),
};

let toastTimer;
let notes = loadNotes();
let activeFilter = "all";
let activeCategory = "all";
let reviewQueue = [];
let reviewIndex = 0;

function loadNotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(starterNotes));
      return [...starterNotes];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("저장된 오답노트 형식이 올바르지 않습니다.");
    return parsed;
  } catch (error) {
    console.error("오답노트를 불러오지 못했습니다.", error);
    showToast("저장된 노트를 불러오지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
    return [...starterNotes];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error("오답노트를 저장하지 못했습니다.", error);
    showToast("저장 공간이 부족해요. 브라우저 저장 공간을 확인해 주세요.");
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

function uniqueCategories() {
  return [...new Set(notes.map((note) => note.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function render() {
  const reviewCount = notes.filter((note) => !note.mastered).length;
  const masteredCount = notes.length - reviewCount;
  document.querySelector("#stat-total").innerHTML = `${notes.length}<span>개</span>`;
  document.querySelector("#stat-review").innerHTML = `${reviewCount}<span>개</span>`;
  document.querySelector("#stat-mastered").innerHTML = `${masteredCount}<span>개</span>`;
  document.querySelector("#banner-count").textContent = reviewCount;
  document.querySelector("#nav-total").textContent = notes.length;
  document.querySelector("#nav-review").textContent = reviewCount;

  renderCategories();
  renderNotes();
}

function renderCategories() {
  const categories = uniqueCategories();
  if (activeCategory !== "all" && !categories.includes(activeCategory)) activeCategory = "all";
  const selected = elements.categoryFilter.value || "all";
  elements.categoryFilter.replaceChildren(new Option("모든 과목", "all"));
  categories.forEach((category) => elements.categoryFilter.add(new Option(category, category)));
  elements.categoryFilter.value = categories.includes(selected) ? selected : "all";

  elements.categoryNav.replaceChildren();
  categories.slice(0, 6).forEach((category, index) => {
    const count = notes.filter((note) => note.category === category).length;
    const item = createTextElement("button", "category-item");
    item.type = "button";
    item.append(createTextElement("span", `category-swatch swatch-${index % 5}`));
    item.append(document.createTextNode(category));
    item.append(createTextElement("span", "category-total", String(count)));
    item.addEventListener("click", () => {
      activeCategory = activeCategory === category ? "all" : category;
      elements.categoryFilter.value = activeCategory;
      renderNotes();
    });
    elements.categoryNav.append(item);
  });

  const datalist = document.querySelector("#category-options");
  datalist.replaceChildren(...categories.map((category) => new Option(category, category)));
}

function renderNotes() {
  const searchTerm = elements.search.value.trim().toLocaleLowerCase("ko");
  const category = activeCategory !== "all" ? activeCategory : elements.categoryFilter.value;
  const filtered = notes.filter((note) => {
    const matchesSearch = [note.question, note.category, note.answer, note.note].join(" ").toLocaleLowerCase("ko").includes(searchTerm);
    const matchesCategory = category === "all" || note.category === category;
    const matchesStatus = activeFilter === "all" || (activeFilter === "review" ? !note.mastered : note.mastered);
    return matchesSearch && matchesCategory && matchesStatus;
  });
  document.querySelector("#list-count").textContent = filtered.length;
  elements.list.replaceChildren(...filtered.map(createNoteCard));
  elements.empty.classList.toggle("hidden", filtered.length > 0);
  elements.list.classList.toggle("hidden", filtered.length === 0);
}

function createNoteCard(note) {
  const card = createTextElement("article", "question-card");
  const top = createTextElement("div", "card-top");
  top.append(createTextElement("span", "subject-tag", note.category));
  top.append(createTextElement("span", `status-tag${note.mastered ? " mastered" : ""}`, note.mastered ? "정복 완료" : "복습 대기"));
  const remove = createTextElement("button", "card-menu", "···");
  remove.type = "button";
  remove.setAttribute("aria-label", "오답 삭제");
  remove.addEventListener("click", () => {
    if (!window.confirm("이 오답 기록을 삭제할까요?")) return;
    notes = notes.filter((item) => item.id !== note.id);
    saveNotes();
    render();
    showToast("오답 기록을 삭제했어요.");
  });
  top.append(remove);
  card.append(top);
  card.append(createTextElement("p", "card-question", note.question));
  const answer = createTextElement("div", "card-answer");
  answer.append(createTextElement("span", "answer-label", "정답"));
  answer.append(document.createTextNode(note.answer));
  card.append(answer);
  if (note.myAnswer) {
    const myAnswer = createTextElement("div", "card-answer");
    myAnswer.append(createTextElement("span", "answer-label wrong-label", "내 답"));
    myAnswer.append(document.createTextNode(note.myAnswer));
    card.append(myAnswer);
  }
  if (note.note) card.append(createTextElement("div", "card-note", `✳  ${note.note}`));
  const bottom = createTextElement("div", "card-bottom");
  bottom.append(document.createTextNode(`복습 ${note.reviewCount || 0}회`));
  bottom.append(createTextElement("span", "card-date", formatDate(note.createdAt)));
  card.append(bottom);
  return card;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2600);
}

function openEntryDialog() {
  elements.entryForm.reset();
  elements.entryDialog.showModal();
  document.querySelector("#entry-category").focus();
}

function startReview() {
  reviewQueue = notes.filter((note) => !note.mastered).map((note) => note.id);
  reviewIndex = 0;
  if (reviewQueue.length === 0) {
    showToast(notes.length ? "복습할 문제가 없어요. 새로운 오답을 기록해 보세요!" : "먼저 복습할 오답을 기록해 보세요!");
    return;
  }
  elements.reviewDialog.showModal();
  renderReviewCard();
}

function renderReviewCard() {
  const note = notes.find((item) => item.id === reviewQueue[reviewIndex]);
  if (!note) {
    elements.reviewDialog.close();
    render();
    return;
  }
  document.querySelector("#review-count").textContent = `${reviewIndex + 1} / ${reviewQueue.length}`;
  document.querySelector("#review-progress-fill").style.width = `${((reviewIndex + 1) / reviewQueue.length) * 100}%`;
  document.querySelector("#review-category").textContent = note.category;
  document.querySelector("#review-title").textContent = note.question;
  const answer = document.querySelector("#review-answer");
  answer.replaceChildren(createTextElement("strong", "", "정답"));
  answer.append(document.createTextNode(note.answer));
  if (note.note) {
    answer.append(createTextElement("strong", "review-note-label", "기억할 포인트"));
    answer.append(document.createTextNode(note.note));
  }
  answer.classList.add("hidden");
  document.querySelector("#reveal-answer").classList.remove("hidden");
  document.querySelector("#review-actions").classList.add("hidden");
}

function recordReview(mastered) {
  const noteId = reviewQueue[reviewIndex];
  notes = notes.map((note) => note.id === noteId
    ? { ...note, mastered, reviewCount: (note.reviewCount || 0) + 1, lastReviewedAt: new Date().toISOString() }
    : note);
  saveNotes();
  reviewIndex += 1;
  if (reviewIndex >= reviewQueue.length) {
    elements.reviewDialog.close();
    render();
    showToast("복습을 마쳤어요. 오늘도 수고했어요!");
    return;
  }
  renderReviewCard();
  render();
}

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date());
document.querySelector("#open-add").addEventListener("click", openEntryDialog);
document.querySelector("#empty-add").addEventListener("click", openEntryDialog);
document.querySelector("#close-dialog").addEventListener("click", () => elements.entryDialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => elements.entryDialog.close());
document.querySelector("#start-review").addEventListener("click", startReview);
document.querySelector("#close-review").addEventListener("click", () => elements.reviewDialog.close());
document.querySelector("#reveal-answer").addEventListener("click", () => {
  document.querySelector("#review-answer").classList.remove("hidden");
  document.querySelector("#review-actions").classList.remove("hidden");
  document.querySelector("#reveal-answer").classList.add("hidden");
});
document.querySelector("#mark-retry").addEventListener("click", () => recordReview(false));
document.querySelector("#mark-mastered").addEventListener("click", () => recordReview(true));
elements.search.addEventListener("input", renderNotes);
elements.categoryFilter.addEventListener("change", () => {
  activeCategory = "all";
  renderNotes();
});
document.querySelectorAll(".toggle-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".toggle-button").forEach((item) => item.classList.toggle("selected", item === button));
    renderNotes();
  });
});
document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    activeFilter = view === "review" ? "review" : "all";
    activeCategory = "all";
    elements.categoryFilter.value = "all";
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".toggle-button").forEach((item) => item.classList.toggle("selected", item.dataset.filter === activeFilter));
    renderNotes();
  });
});
elements.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(elements.entryForm);
  const note = {
    id: crypto.randomUUID(),
    category: String(formData.get("category")).trim(),
    question: String(formData.get("question")).trim(),
    myAnswer: String(formData.get("myAnswer")).trim(),
    answer: String(formData.get("answer")).trim(),
    note: String(formData.get("note")).trim(),
    createdAt: new Date().toISOString(),
    mastered: false,
    reviewCount: 0,
  };
  if (!note.category || !note.question || !note.answer) return;
  notes = [note, ...notes];
  saveNotes();
  elements.entryDialog.close();
  activeFilter = "all";
  activeCategory = "all";
  elements.categoryFilter.value = "all";
  document.querySelectorAll(".toggle-button").forEach((item) => item.classList.toggle("selected", item.dataset.filter === "all"));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === "all"));
  render();
  showToast("오답을 노트에 기록했어요!");
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.search.focus();
  }
});

render();
