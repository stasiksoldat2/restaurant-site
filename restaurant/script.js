// ---------- Налаштування ----------
const OPEN_HOUR = 12;       // відкриття
const LAST_SLOT = "21:30";  // останній час початку
const STEP_MIN = 30;        // крок часу, хв
const DURATION_MIN = 120;   // скільки столик зайнятий, хв
const TABLES = 6;           // кількість столиків
const MAX_GUESTS = 10;
const MAX_DAYS_AHEAD = 60;

// ---------- Елементи ----------
const dateEl = document.getElementById("date");
const guestsEl = document.getElementById("guests");
const slotsEl = document.getElementById("slots");
const slotsHint = document.getElementById("slots-hint");
const nameEl = document.getElementById("name");
const phoneEl = document.getElementById("phone");
const commentEl = document.getElementById("comment");
const errorEl = document.getElementById("form-error");
const form = document.getElementById("booking-form");
const confirmEl = document.getElementById("confirmation");
const myList = document.getElementById("my-list");
const myEmpty = document.getElementById("my-empty");

let selectedTime = null;
let bookings = load();

// ---------- Допоміжні функції ----------
function load() {
  try { return JSON.parse(localStorage.getItem("bookings") || "[]"); }
  catch { return []; }
}
function save() {
  try { localStorage.setItem("bookings", JSON.stringify(bookings)); } catch {}
}
function pad(n) { return String(n).padStart(2, "0"); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function toMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("uk-UA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}
function guestsWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "гість";
  if (n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14)) return "гості";
  return "гостей";
}

function allSlots() {
  const list = [];
  for (let m = OPEN_HOUR * 60; m <= toMin(LAST_SLOT); m += STEP_MIN) {
    list.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return list;
}

function isTaken(date, time) {
  const t = toMin(time);
  const overlapping = bookings.filter(b =>
    b.date === date && Math.abs(toMin(b.time) - t) < DURATION_MIN
  ).length;
  return overlapping >= TABLES;
}

function isPast(date, time) {
  const now = new Date();
  if (date !== toISO(now)) return date < toISO(now);
  return toMin(time) <= now.getHours() * 60 + now.getMinutes();
}

// ---------- Відображення ----------
function renderSlots() {
  slotsEl.innerHTML = "";
  const date = dateEl.value;
  if (!date) { slotsHint.textContent = "Спершу оберіть дату."; return; }

  let free = 0;
  allSlots().forEach(time => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot";
    btn.textContent = time;
    const unavailable = isPast(date, time) || isTaken(date, time);
    btn.disabled = unavailable;
    if (!unavailable) free++;
    if (time === selectedTime && !unavailable) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      selectedTime = time;
      renderSlots();
    });
    slotsEl.append(btn);
  });

  if (selectedTime && (isPast(date, selectedTime) || isTaken(date, selectedTime))) selectedTime = null;
  slotsHint.textContent = free
    ? "Вільний час доступний для вибору. Зайнятий час закреслено."
    : "На цю дату вільних місць немає. Оберіть іншу дату.";
}

function renderMine() {
  myList.innerHTML = "";
  const mine = [...bookings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  myEmpty.hidden = mine.length > 0;

  mine.forEach(b => {
    const li = document.createElement("li");
    const info = document.createElement("div");
    const title = document.createElement("span");
    title.textContent = `${fmtDate(b.date)}, ${b.time}`;
    const small = document.createElement("small");
    small.textContent = `${b.guests} ${guestsWord(b.guests)} · ${b.name}`;
    info.append(title, small);

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "cancel";
    cancel.textContent = "Скасувати";
    cancel.addEventListener("click", () => {
      bookings = bookings.filter(x => x.id !== b.id);
      save();
      confirmEl.hidden = true;
      renderSlots();
      renderMine();
    });

    li.append(info, cancel);
    myList.append(li);
  });
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

// ---------- Події ----------
dateEl.addEventListener("change", () => { selectedTime = null; renderSlots(); });

form.addEventListener("submit", e => {
  e.preventDefault();
  errorEl.hidden = true;

  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const digits = phone.replace(/\D/g, "");

  if (!dateEl.value) return showError("Оберіть дату.");
  if (!selectedTime) return showError("Оберіть час бронювання.");
  if (name.length < 2) return showError("Вкажіть ім’я.");
  if (digits.length < 10 || digits.length > 12) return showError("Вкажіть коректний номер телефону, наприклад +380 50 123 45 67.");
  if (isTaken(dateEl.value, selectedTime)) { renderSlots(); return showError("Цей час уже зайнято. Оберіть інший."); }

  const booking = {
    id: Date.now(),
    date: dateEl.value,
    time: selectedTime,
    guests: Number(guestsEl.value),
    name,
    phone,
    comment: commentEl.value.trim()
  };
  bookings.push(booking);
  save();

  confirmEl.hidden = false;
  confirmEl.innerHTML = "";
  const h = document.createElement("h3");
  h.textContent = "Столик заброньовано";
  const p1 = document.createElement("p");
  p1.textContent = `${fmtDate(booking.date)}, о ${booking.time}`;
  const p2 = document.createElement("p");
  p2.textContent = `${booking.guests} ${guestsWord(booking.guests)}, на ім’я ${booking.name}`;
  const p3 = document.createElement("p");
  p3.textContent = "Ми зателефонуємо за номером " + booking.phone + ", якщо потрібно уточнити деталі.";
  confirmEl.append(h, p1, p2, p3);
  confirmEl.scrollIntoView({ behavior: "smooth", block: "center" });

  selectedTime = null;
  commentEl.value = "";
  renderSlots();
  renderMine();
});

// ---------- Старт ----------
(function init() {
  const today = new Date();
  const max = new Date();
  max.setDate(max.getDate() + MAX_DAYS_AHEAD);
  dateEl.min = toISO(today);
  dateEl.max = toISO(max);
  dateEl.value = toISO(today);

  for (let i = 1; i <= MAX_GUESTS; i++) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = `${i} ${guestsWord(i)}`;
    if (i === 2) o.selected = true;
    guestsEl.append(o);
  }

  document.getElementById("year").textContent = today.getFullYear();
  renderSlots();
  renderMine();
})();
