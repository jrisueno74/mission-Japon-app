// Misión Japón App
// Este script gestiona la carga de datos, navegación y lógica de misiones y logros.
//
// ¡IMPORTANTE!
// Este archivo ahora se ejecuta como módulo ES. Aprovechamos esto para importar
// las funciones de Firebase necesarias para subir pruebas (fotos o vídeos) de
// cada misión. Además se han incorporado mejoras visuales y de experiencia de
// usuario, incluida la posibilidad de desmarcar misiones, mostrar
// notificaciones motivadoras y guardar el progreso por usuario.

// Importar Firebase SDK (modular v9) desde CDN. Estas importaciones sólo
// funcionan porque script.js se carga con type="module" en index.html. Si
// decides mover este código a otro archivo deberás actualizar las rutas.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

// Configuración de Firebase proporcionada en las instrucciones. No modifiques
// estos valores sin actualizar también la consola de Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyC6e2z56-Rn1759Kjl4ALCmgo9OierW_i4",
  authDomain: "misionjapon-fced6.firebaseapp.com",
  projectId: "misionjapon-fced6",
  storageBucket: "misionjapon-fced6.firebasestorage.app",
  messagingSenderId: "106205770259",
  appId: "1:106205770259:web:0dd1ab8b3a47bc7086c5e6"
};

// Inicializar Firebase sólo una vez. En modo offline no ocurre ningún error.
const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

// Subida de pruebas a Firebase Storage. Devuelve una promesa que se resuelve
// con la URL de descarga del archivo almacenado. Las carpetas se organizan
// por nombre de usuario y misión para mantener las cargas separadas.
async function uploadMissionProof(missionId, file) {
  const userName = localStorage.getItem('userName') || 'anon';
  // Generar una ruta única usando timestamp para evitar sobreescrituras
  const path = `${userName}/${missionId}/${Date.now()}_${file.name}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  return url;
}

// Guardar la URL de la prueba en localStorage bajo una clave de usuario. Se
// mantiene una lista de pruebas por usuario en formato JSON. Esto permite
// consultar posteriormente todas las pruebas que haya subido el jugador.
function addUploadToUserRecord(missionId, url) {
  const userName = localStorage.getItem('userName') || 'anon';
  const key = `pruebas_${userName}`;
  let arr;
  try {
    arr = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(arr)) arr = [];
  } catch (e) {
    arr = [];
  }
  arr.push({ missionId, url });
  localStorage.setItem(key, JSON.stringify(arr));
}

// Mostrar una notificación de éxito al usuario. Las notificaciones se
// posicionan en la parte inferior y desaparecen solas tras unos segundos.
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  // Eliminar después de 3 segundos
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Variables globales
// Datos precargados (se insertarán a continuación). No modificar manualmente.
// Incluir datos de días y misiones directamente en el script para evitar
// restricciones de lectura de archivos locales. Los datos provienen de
// days.json y missions.json en la carpeta data. No editar manualmente estas
// listas a menos que se añadan o modifiquen misiones en el CSV de origen.


let days = [];
let missions = [];

async function loadData() {
  try {
    const [dRes, mRes] = await Promise.all([
      fetch('./data/days.json'),
      fetch('./data/missions.json')
    ]);

    days = await dRes.json();
    missions = await mRes.json();

    // Normaliza los IDs
    missions.forEach(m => {
      m.id = String(m.id);
      m.day_id = String(m.day_id);
    });

    // Ordena por día y orden
    missions.sort((a, b) =>
      a.day_id === b.day_id
        ? Number(a.orden) - Number(b.orden)
        : Number(a.day_id) - Number(b.day_id)
    );

    // Inicia la app (ajusta si usas otro método)
    renderHome();
  } catch (err) {
    console.error('Error cargando JSON:', err);
    alert('No se pudieron cargar los datos del viaje.');
  }
}


// Navegación y arranque de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('homeBtn').addEventListener('click', () => {
    renderHome();
    setActiveNav('homeBtn');
  });
  document.getElementById('badgesBtn').addEventListener('click', () => {
    renderBadges();
    setActiveNav('badgesBtn');
  });
  initApp();
});

// Inicializa la app: muestra pantalla de bienvenida si no hay usuario
function initApp() {
  const storedName = localStorage.getItem('userName');
  const storedAvatar = localStorage.getItem('userAvatar');
  if (!storedName || !storedAvatar) {
    showWelcomeScreen();
  } else {
    updateUserHeader(storedName, storedAvatar);
    loadData();
  }
}

// Actualiza la cabecera con el nombre y avatar del usuario
function updateUserHeader(name, avatarPath) {
  const userInfo = document.getElementById('userInfo');
  if (!userInfo) return;
  userInfo.innerHTML = '';
  const img = document.createElement('img');
  img.src = avatarPath;
  img.alt = '';
  const span = document.createElement('span');
  span.textContent = name;
  userInfo.appendChild(img);
  userInfo.appendChild(span);
}

// Muestra la pantalla de bienvenida con selección de nombre y avatar
function showWelcomeScreen() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const modal = document.createElement('div');
  modal.className = 'welcome-modal';
  const title = document.createElement('h2');
  title.textContent = '¡Bienvenido a Misión Japón!';
  const description = document.createElement('p');
  description.textContent = 'Introduce tu nombre y elige un avatar para comenzar tu aventura.';
  modal.appendChild(title);
  modal.appendChild(description);
  // Avatar options
  const avatarContainer = document.createElement('div');
  avatarContainer.className = 'avatar-options';
  // Avatares renovados con estilos anime y aventuras japonesas
  const avatars = [
    { id: 'avatar_samurai', src: 'images/avatar_samurai.png' },
    { id: 'avatar_ninja', src: 'images/avatar_ninja.png' },
    { id: 'avatar_foxboy', src: 'images/avatar_foxboy.png' },
    { id: 'avatar_hero', src: 'images/avatar_hero.png' },
  ];
  let selectedAvatar = null;
  avatars.forEach((av) => {
    const option = document.createElement('div');
    option.className = 'avatar-option';
    option.dataset.avatar = av.src;
    const img = document.createElement('img');
    img.src = av.src;
    img.alt = '';
    option.appendChild(img);
    option.addEventListener('click', () => {
      // remove previous selection
      avatarContainer.querySelectorAll('.avatar-option').forEach((el) => {
        el.classList.remove('selected');
      });
      option.classList.add('selected');
      selectedAvatar = av.src;
    });
    avatarContainer.appendChild(option);
  });
  modal.appendChild(avatarContainer);
  // Name input
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Tu nombre';
  modal.appendChild(nameInput);
  // Start button
  const startBtn = document.createElement('button');
  startBtn.textContent = 'Comenzar aventura';
  startBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('Por favor, introduce un nombre.');
      return;
    }
    if (!selectedAvatar) {
      alert('Selecciona un avatar.');
      return;
    }
    localStorage.setItem('userName', name);
    localStorage.setItem('userAvatar', selectedAvatar);
    overlay.remove();
    updateUserHeader(name, selectedAvatar);
    loadData();
    setActiveNav('homeBtn');
  });
  modal.appendChild(startBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function setActiveNav(btnId) {
  const buttons = document.querySelectorAll('.nav-btn');
  buttons.forEach((btn) => {
    if (btn.id === btnId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Utilidades de almacenamiento
// ------ Almacenamiento por usuario ------
// Para que cada jugador mantenga su propio progreso, se utilizan claves
// personalizadas que incluyen el nombre de usuario. Si no hay nombre
// almacenado (caso improbable), se utiliza "anon" como prefijo.

function getUserPrefix() {
  return localStorage.getItem('userName') || 'anon';
}

function isMissionCompleted(id) {
  const prefix = getUserPrefix();
  return localStorage.getItem(`${prefix}_mission_${id}_completed`) === 'true';
}

function completeMission(id) {
  const prefix = getUserPrefix();
  localStorage.setItem(`${prefix}_mission_${id}_completed`, 'true');
}

function saveAnswer(id, answer) {
  const prefix = getUserPrefix();
  localStorage.setItem(`${prefix}_mission_${id}_answer`, answer);
  completeMission(id);
}

function saveRating(id, rating) {
  const prefix = getUserPrefix();
  localStorage.setItem(`${prefix}_mission_${id}_rating`, rating);
  completeMission(id);
}

function getAnswer(id) {
  const prefix = getUserPrefix();
  return localStorage.getItem(`${prefix}_mission_${id}_answer`) || '';
}

function getRating(id) {
  const prefix = getUserPrefix();
  return localStorage.getItem(`${prefix}_mission_${id}_rating`) || '';
}

function getUploadUrl(id) {
  const prefix = getUserPrefix();
  return localStorage.getItem(`${prefix}_mission_${id}_upload`) || '';
}

function setUploadUrl(id, url) {
  const prefix = getUserPrefix();
  localStorage.setItem(`${prefix}_mission_${id}_upload`, url);
}

// Permite desmarcar una misión eliminando todas las entradas asociadas a ella.
function uncompleteMission(id) {
  const prefix = getUserPrefix();
  localStorage.removeItem(`${prefix}_mission_${id}_completed`);
  localStorage.removeItem(`${prefix}_mission_${id}_answer`);
  localStorage.removeItem(`${prefix}_mission_${id}_rating`);
  localStorage.removeItem(`${prefix}_mission_${id}_upload`);
}

// Calcular puntos completados por día
function getDayProgress(dayId) {
  const dayMissions = missions.filter((m) => m.day_id === String(dayId));
  let totalPoints = 0;
  let earnedPoints = 0;
  dayMissions.forEach((m) => {
    totalPoints += parseInt(m.puntos);
    if (isMissionCompleted(m.id)) {
      earnedPoints += parseInt(m.puntos);
    }
  });
  return { totalPoints, earnedPoints };
}

// Renderizado de la página principal
function renderHome() {
  const app = document.getElementById('app');
  const container = document.createElement('div');
  container.classList.add('day-list');
  days.forEach((day) => {
    const card = document.createElement('div');
    card.classList.add('day-card');
    card.addEventListener('click', () => {
      renderMissions(day.id);
      setActiveNav('');
    });
    const title = document.createElement('h2');
    // Format date to locale: e.g. 8 de agosto
    const date = new Date(day.fecha);
    const fechaStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    title.textContent = `${fechaStr} – ${day.titulo}`;
    const subtitle = document.createElement('p');
    subtitle.textContent = day.intro;
    // Progress bar
    const progress = getDayProgress(day.id);
    const progressBar = document.createElement('div');
    progressBar.classList.add('progress-bar');
    const progressInner = document.createElement('div');
    progressInner.style.width = progress.totalPoints > 0 ? `${(progress.earnedPoints / progress.totalPoints) * 100}%` : '0%';
    progressBar.appendChild(progressInner);
    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(progressBar);
    container.appendChild(card);
  });
  app.innerHTML = '';
  app.appendChild(container);
}

// Renderizado de misiones de un día específico
function renderMissions(dayId) {
  const app = document.getElementById('app');
  const day = days.find((d) => d.id === String(dayId));
  const heading = document.createElement('h2');
  const date = new Date(day.fecha);
  const fechaStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  heading.textContent = `${fechaStr} – ${day.titulo}`;
  const backBtn = document.createElement('button');
  backBtn.textContent = '← Volver';
  // use nav-btn for base styling and back-btn for custom colors
  backBtn.className = 'nav-btn back-btn';
  backBtn.style.marginBottom = '1rem';
  backBtn.addEventListener('click', renderHome);
  const list = document.createElement('div');
  list.className = 'mission-list';
  missions.filter((m) => m.day_id === String(dayId)).forEach((mission) => {
    const card = document.createElement('div');
    card.className = 'mission-card';
    // Imagen representativa. Utilizamos la URL específica de la misión si
    // existe. Si falla la carga, se recurre al icono genérico como
    // respaldo. Esto permite mostrar imágenes reales o fotorrealistas por
    // misión sin perder funcionalidad offline.
    const img = document.createElement('img');
    img.className = 'icon';
    if (mission.img_url) {
      img.src = mission.img_url;
    } else {
      img.src = `images/${mission.icon}`;
    }
    img.alt = '';
    img.onerror = () => {
      img.src = `images/${mission.icon}`;
    };
    card.appendChild(img);
    // Contenedor de contenido textual y controles
    const content = document.createElement('div');
    content.className = 'mission-content';
    const titleEl = document.createElement('div');
    titleEl.className = 'mission-title';
    titleEl.textContent = mission.titulo;
    const hintEl = document.createElement('div');
    hintEl.textContent = mission.pista;
    hintEl.style.fontSize = '0.85rem';
    hintEl.style.color = '#555';
    // Dato ninja toggle
    const factToggle = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Dato ninja';
    factToggle.appendChild(summary);
    const factP = document.createElement('p');
    factP.textContent = mission.dato_ninja;
    factP.style.fontSize = '0.8rem';
    factP.style.color = '#444';
    factToggle.appendChild(factP);
    // Puntos
    const pointsEl = document.createElement('div');
    pointsEl.className = 'mission-points';
    pointsEl.textContent = `${mission.puntos} pts`;
    // Acciones
    const actions = document.createElement('div');
    actions.className = 'mission-actions';
    const completed = isMissionCompleted(mission.id);
    // Tipos de misión
    if (mission.tipo === 'quiz') {
      const input = document.createElement('input');
      input.className = 'quiz-input';
      input.placeholder = 'Introduce tu respuesta';
      input.value = getAnswer(mission.id);
      actions.appendChild(input);
      const btn = document.createElement('button');
      btn.textContent = completed ? '✓ Completado' : 'Enviar';
      btn.className = 'btn-complete' + (completed ? ' completed' : '');
      btn.addEventListener('click', () => {
        const ans = input.value.trim();
        if (ans === '') {
          alert('Escribe una respuesta.');
          return;
        }
        saveAnswer(mission.id, ans);
        showToast('¡Misión completada! ¡Buen trabajo ninja!');
        renderMissions(dayId);
      });
      actions.appendChild(btn);
    } else if (mission.tipo === 'food-rating') {
      const ratingContainer = document.createElement('div');
      ratingContainer.className = 'rating-container';
      for (let i = 1; i <= 5; i++) {
        const rb = document.createElement('button');
        rb.textContent = i;
        if (getRating(mission.id) === String(i)) {
          rb.classList.add('active');
        }
        rb.addEventListener('click', () => {
          saveRating(mission.id, String(i));
          showToast('¡Misión completada! ¡Buen trabajo ninja!');
          renderMissions(dayId);
        });
        ratingContainer.appendChild(rb);
      }
      actions.appendChild(ratingContainer);
    } else {
      // Para photo, video, drawing, challenge, audio, etc. Simplemente se marca
      // como hecha sin datos asociados.
      const btnComplete = document.createElement('button');
      btnComplete.textContent = completed ? '✓ Hecho' : 'Marcar hecho';
      btnComplete.className = 'btn-complete' + (completed ? ' completed' : '');
      btnComplete.addEventListener('click', () => {
        if (completed) return;
        completeMission(mission.id);
        showToast('¡Misión completada! ¡Buen trabajo ninja!');
        renderMissions(dayId);
      });
      actions.appendChild(btnComplete);
    }
    // Si la misión está completada, añadir botón para desmarcar y cargar prueba
    if (completed) {
      // Botón de desmarcar
      const uncheckBtn = document.createElement('button');
      uncheckBtn.textContent = 'Desmarcar';
      uncheckBtn.className = 'btn-uncomplete';
      uncheckBtn.addEventListener('click', () => {
        uncompleteMission(mission.id);
        showToast('Misión desmarcada.');
        renderMissions(dayId);
      });
      actions.appendChild(uncheckBtn);
      // Botón para subir prueba opcional
      const uploadBtn = document.createElement('button');
      uploadBtn.textContent = 'Subir prueba';
      uploadBtn.className = 'btn-upload';
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*,video/*';
      fileInput.style.display = 'none';
      uploadBtn.addEventListener('click', () => {
        fileInput.click();
      });
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Subiendo…';
        uploadMissionProof(mission.id, file)
          .then((url) => {
            setUploadUrl(mission.id, url);
            addUploadToUserRecord(mission.id, url);
            showToast('¡Prueba subida con éxito!');
            renderMissions(dayId);
          })
          .catch((error) => {
            alert('Error al subir: ' + error.message);
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Subir prueba';
          });
      });
      actions.appendChild(uploadBtn);
      actions.appendChild(fileInput);
      // Mostrar enlace si ya existe
      const existingUrl = getUploadUrl(mission.id);
      if (existingUrl) {
        const link = document.createElement('a');
        link.href = existingUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Ver prueba';
        link.style.display = 'inline-block';
        link.style.marginTop = '0.4rem';
        link.style.fontSize = '0.8rem';
        actions.appendChild(link);
      }
    }
    // Montar card
    content.appendChild(titleEl);
    content.appendChild(hintEl);
    content.appendChild(factToggle);
    content.appendChild(pointsEl);
    content.appendChild(actions);
    card.appendChild(content);
    list.appendChild(card);
  });
  // Update app
  app.innerHTML = '';
  app.appendChild(backBtn);
  app.appendChild(heading);
  app.appendChild(list);
}

// Definición de logros
const badges = [
  {
    id: 'templeMaster',
    nombre: 'Maestro de Templos',
    descripcion: 'Completa al menos 10 misiones de tipo templo/santuario',
    icon: 'temple.png',
    criterio: () => countCompletedByIcon('temple.png') >= 10,
  },
  {
    id: 'cityExplorer',
    nombre: 'Explorador Urbano',
    descripcion: 'Completa al menos 10 misiones de ciudad/neón',
    icon: 'city.png',
    criterio: () => countCompletedByIcon('city.png') >= 10,
  },
  {
    id: 'foodie',
    nombre: 'Catador Gourmet',
    descripcion: 'Completa al menos 10 misiones gastronómicas',
    icon: 'food.png',
    criterio: () => countCompletedByIcon('food.png') >= 10,
  },
  {
    id: 'animalLover',
    nombre: 'Amigo de los Animales',
    descripcion: 'Completa al menos 5 misiones relacionadas con animales',
    icon: 'animals.png',
    criterio: () => countCompletedByIcon('animals.png') >= 5,
  },
  {
    id: 'natureLover',
    nombre: 'Amante de la Naturaleza',
    descripcion: 'Completa al menos 8 misiones de naturaleza',
    icon: 'nature.png',
    criterio: () => countCompletedByIcon('nature.png') >= 8,
  },
  {
    id: 'amusementFan',
    nombre: 'Fan de la Diversión',
    descripcion: 'Completa al menos 5 misiones de parques y diversión',
    icon: 'amusement.png',
    criterio: () => countCompletedByIcon('amusement.png') >= 5,
  },
  {
    id: 'nipponMaster',
    nombre: 'Maestro Nippon',
    descripcion: 'Completa todas las misiones del viaje',
    icon: 'city.png',
    criterio: () => missions.every((m) => isMissionCompleted(m.id)),
  },
];

function countCompletedByIcon(iconName) {
  return missions.filter((m) => m.icon === iconName && isMissionCompleted(m.id)).length;
}

// Renderizado de logros
function renderBadges() {
  const app = document.getElementById('app');
  const heading = document.createElement('h2');
  heading.textContent = 'Logros y Recompensas';
  const grid = document.createElement('div');
  grid.className = 'badge-grid';
  badges.forEach((badge) => {
    const card = document.createElement('div');
    card.className = 'badge-card';
    const img = document.createElement('img');
    img.src = `images/${badge.icon}`;
    img.alt = '';
    const earned = badge.criterio();
    card.classList.add(earned ? 'badge-earned' : 'badge-locked');
    const name = document.createElement('h3');
    name.textContent = badge.nombre;
    const desc = document.createElement('p');
    desc.textContent = badge.descripcion;
    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(desc);
    grid.appendChild(card);
  });
  app.innerHTML = '';
  app.appendChild(heading);
  app.appendChild(grid);
}
