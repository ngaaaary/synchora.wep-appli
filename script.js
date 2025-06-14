// script.js

// --- 1. Gestion de l'état global de l'application ---
// Objet global pour gérer les données et l'état de l'application
const Synchora = {
    tasks: [], // Tableau pour stocker toutes les tâches
    projects: [], // Tableau pour stocker tous les projets
    currentView: 'dashboard', // Vue active (dashboard, tasks, calendar, etc.)
    settings: {
        theme: 'light', // 'light', 'dark', 'system'
        notifications: {
            push: true,
            email: false
        }
    },
    // Stockage des données (persistance simple via localStorage pour commencer)
    // Idéalement, cela devrait être géré par un backend pour une application pro complète
    saveData() {
        localStorage.setItem('synchora_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('synchora_projects', JSON.stringify(this.projects));
        localStorage.setItem('synchora_settings', JSON.stringify(this.settings));
    },
    loadData() {
        this.tasks = JSON.parse(localStorage.getItem('synchora_tasks')) || [];
        // MODIFICATION ICI: Initialiser les champs 'progress' et 'lastActivity' si manquants
        const loadedProjects = JSON.parse(localStorage.getItem('synchora_projects')) || [];
        this.projects = loadedProjects.map(p => ({
            ...p,
            progress: p.progress !== undefined ? p.progress : 0, // S'assurer que 'progress' existe
            lastActivity: p.lastActivity ? new Date(p.lastActivity) : new Date(p.createdAt || Date.now()) // Convertir en objet Date
        }));
        this.settings = JSON.parse(localStorage.getItem('synchora_settings')) || this.settings; // Utilise les paramètres par défaut si non trouvés
    },
    // Initialisation du thème au chargement
    applyTheme() {
        document.documentElement.classList.remove('light-theme', 'dark-theme'); // Nettoie les classes existantes
        if (this.settings.theme === 'dark') {
            document.documentElement.classList.add('dark-theme');
        } else if (this.settings.theme === 'light') {
            document.documentElement.classList.add('light-theme');
        } else { // 'system' theme
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark-theme');
            } else {
                document.documentElement.classList.add('light-theme');
            }
        }
    }
};

// --- 2. Éléments du DOM Couramment Utilisés ---
const elements = {
    // Navigation
    navLinks: document.querySelectorAll('.nav-item'),
    contentSections: document.querySelectorAll('.content-section'),
    pageTitle: document.getElementById('pageTitle'),
    // Sidebar
    sidebar: document.querySelector('.sidebar'),
    toggleSidebarBtn: document.querySelector('.toggle-sidebar-btn'),
    addNewBtn: document.querySelector('.add-new-btn'),
    // Modale générique
    genericModal: document.getElementById('genericModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalDescription'), // C'est le conteneur pour le formulaire
    closeModalBtn: document.querySelector('.close-modal-btn'),
    dynamicForm: document.getElementById('dynamicForm'),
    // Dashboard
    tasksDueToday: document.getElementById('tasksDueToday'),
    upcomingEvents: document.getElementById('upcomingEvents'),
    tasksCompletedThisWeek: document.getElementById('tasksCompletedThisWeek'),
    focusTimeToday: document.getElementById('focusTimeToday'),
    recentActivityList: document.getElementById('recentActivityList'),
    // Tasks
    taskList: document.getElementById('taskList'),
    taskFilterCategory: document.getElementById('taskFilterCategory'),
    taskFilterStatus: document.getElementById('taskFilterStatus'),
    taskSearchInput: document.getElementById('taskSearchInput'),
    addTaskFloatingBtn: document.querySelector('.add-task-floating-btn'),
    // Calendar
    prevViewBtn: document.getElementById('prevViewBtn'),
    nextViewBtn: document.getElementById('nextViewBtn'),
    currentCalendarView: document.getElementById('currentCalendarView'),
    calendarDisplay: document.getElementById('calendarDisplay'),
    calendarViewButtons: document.querySelectorAll('.view-switcher .view-btn'),
    // Projects
    projectList: document.getElementById('projectList'),
    addProjectBtn: document.querySelector('.add-project-btn'),
    projectSearch: document.getElementById('projectSearch'),
    // Settings
    settingsForm: null, // Sera initialisé dynamiquement ou directement si c'est un formulaire fixe
    themeRadios: document.querySelectorAll('input[name="app-theme"]'),
    enablePushNotifications: document.getElementById('enablePushNotifications'),
    enableEmailNotifications: document.getElementById('enableEmailNotifications'),
    saveSettingsBtn: document.querySelector('.save-settings-btn'),
    // Rapports
    tasksByCategoryChart: document.getElementById('tasksByCategoryChart'),
    timeSpentByProjectChart: document.getElementById('timeSpentByProjectChart'),
    // NOUVEAU: Conteneur pour le message du graphique des projets (à créer si besoin)
    timeSpentByProjectChartMessage: document.getElementById('timeSpentByProjectChartMessage'),
    completionRate: document.getElementById('completionRate'),
    avgTasksPerDay: document.getElementById('avgTasksPerDay'),
    totalFocusHours: document.getElementById('totalFocusHours'),
    // User Profile
    userProfile: document.querySelector('.user-profile'),
    profileDropdownMenu: document.querySelector('.profile-dropdown-menu'),
};

// --- 3. Fonctions Utilitaires ---

/**
 * Génère un ID unique simple (pour les tâches, projets, etc.)
 * Une implémentation plus robuste utiliserait des UUIDs.
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Formate une date en chaîne lisible.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

/**
 * Formate une date pour l'affichage de la modale des tâches.
 * @param {Date} date
 * @returns {string}
 */
function formatModalDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long', // jour de la semaine (ex: Lundi)
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(date);
}


/**
 * Affiche ou masque une modale.
 * @param {HTMLElement} modalElement - L'élément DOM de la modale.
 * @param {boolean} show - True pour afficher, false pour masquer.
 */
function toggleModal(modalElement, show) {
    if (show) {
        modalElement.classList.add('active');
        // Ajoute un écouteur pour l'échap pour fermer la modale
        document.addEventListener('keydown', handleEscapeKey);
    } else {
        modalElement.classList.remove('active');
        document.removeEventListener('keydown', handleEscapeKey);
        // Réinitialise le formulaire dans la modale
        if (elements.dynamicForm) { // Assure que dynamicForm existe avant de l'appeler
            elements.dynamicForm.reset();
        }
        // Nettoie le contenu dynamique si nécessaire
        elements.modalBody.innerHTML = '';
    }
}

/**
 * Gère la fermeture des modales avec la touche Échap.
 * @param {KeyboardEvent} event
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape' || event.keyCode === 27) {
        if (elements.genericModal.classList.contains('active')) {
            toggleModal(elements.genericModal, false);
        }
    }
}

/**
 * Retourne le premier jour de la semaine (Lundi) pour une date donnée.
 * @param {Date} date
 * @returns {Date}
 */
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    const diff = day === 0 ? 6 : day - 1; // Ajuste pour que Lundi soit le début (si dimanche est 0, on retire 6 jours)
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0); // Réinitialise l'heure pour éviter les problèmes de fuseau horaire
    return d;
}

/**
 * Retourne le dernier jour de la semaine (Dimanche) pour une date donnée.
 * @param {Date} date
 * @returns {Date}
 */
function getEndOfWeek(date) {
    const startOfWeek = getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
}

/**
 * Formate une date en chaîne lisible pour l'affichage du calendrier.
 * @param {Date} date
 * @param {string} viewType - 'month', 'week', 'day'
 * @returns {string}
 */
function formatCalendarHeader(date, viewType) {
    const optionsMonth = { month: 'long', year: 'numeric' };
    const optionsWeek = { day: 'numeric', month: 'short' };
    const optionsDay = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

    switch (viewType) {
        case 'month':
            return new Intl.DateTimeFormat('fr-FR', optionsMonth).format(date);
        case 'week':
            const startOfWeek = getStartOfWeek(date);
            const endOfWeek = getEndOfWeek(date);
            if (startOfWeek.getFullYear() !== endOfWeek.getFullYear()) {
                return `${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(startOfWeek)} - ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(endOfWeek)}`;
            } else if (startOfWeek.getMonth() !== endOfWeek.getMonth()) {
                return `${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(startOfWeek)} - ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(endOfWeek)} ${startOfWeek.getFullYear()}`;
            }
            return `${new Intl.DateTimeFormat('fr-FR', optionsWeek).format(startOfWeek)} - ${new Intl.DateTimeFormat('fr-FR', optionsWeek).format(endOfWeek)} ${startOfWeek.getFullYear()}`;
        case 'day':
            return new Intl.DateTimeFormat('fr-FR', optionsDay).format(date);
        default:
            return '';
    }
}


// --- 4. Fonctions de Rendu du Contenu (UI Rendering) ---

/**
 * Met à jour le contenu de la section du tableau de bord.
 */
function updateDashboard() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Lundi de la semaine actuelle
    startOfWeek.setHours(0, 0, 0, 0); // Réinitialise l'heure pour comparaison

    const tasksDueTodayCount = Synchora.tasks.filter(task =>
        task.dueDate && new Date(task.dueDate).toDateString() === today.toDateString() && !task.completed
    ).length;

    const completedTasksThisWeekCount = Synchora.tasks.filter(task =>
        task.completed && task.completedDate && new Date(task.completedDate) >= startOfWeek
    ).length;

    // TODO: Implémenter le calcul des événements à venir et du temps de focus réel
    const upcomingEventsCount = Synchora.tasks.filter(task =>
        task.dueDate && new Date(task.dueDate) > today && !task.completed
    ).length;

    elements.tasksDueToday.textContent = tasksDueTodayCount;
    elements.upcomingEvents.textContent = upcomingEventsCount;
    elements.tasksCompletedThisWeek.textContent = completedTasksThisWeekCount;
    elements.focusTimeToday.textContent = '0h 0m'; // Placeholder, à implémenter avec la fonctionnalité focus

    renderRecentActivity();
}

/**
 * Rend la liste des activités récentes (un sous-ensemble des tâches modifiées).
 */
function renderRecentActivity() {
    elements.recentActivityList.innerHTML = '';
    if (Synchora.tasks.length === 0) {
        elements.recentActivityList.innerHTML = `<li class="activity-item placeholder"><i class="fas fa-info-circle"></i> Aucune activité récente.</li>`;
        return;
    }

    // Affiche les 5 tâches les plus récemment ajoutées/modifiées
    const sortedTasks = [...Synchora.tasks].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt);
        const dateB = new Date(b.updatedAt || b.createdAt);
        return dateB - dateA;
    });
    const recentActivities = sortedTasks.slice(0, 5);

    recentActivities.forEach(task => {
        const li = document.createElement('li');
        li.classList.add('activity-item');
        const statusIcon = task.completed ? '<i class="fas fa-check-circle" style="color: var(--accent-color);"></i>' : '<i class="fas fa-circle-notch" style="color: var(--primary-color);"></i>';
        const dueDateText = task.dueDate ? ` - Échéance: ${formatDate(new Date(task.dueDate))}` : '';
        li.innerHTML = `
            <div>
                ${statusIcon}
                <span>${task.title}</span>
            </div>
            <small>${task.completed ? 'Terminée' : 'Créée'}${dueDateText}</small>
        `;
        elements.recentActivityList.appendChild(li);
    });
}


/**
 * Rend la liste des tâches dans la section "Mes Tâches".
 */
function renderTaskList() {
    elements.taskList.innerHTML = ''; // Vide la liste actuelle

    // Appliquer les filtres et la recherche
    const filterCategory = elements.taskFilterCategory.value;
    const filterStatus = elements.taskFilterStatus.value;
    const searchTerm = elements.taskSearchInput.value.toLowerCase();

    const filteredTasks = Synchora.tasks.filter(task => {
        const matchesCategory = filterCategory === 'all' || task.category === filterCategory || (filterCategory === 'urgent' && task.priority === 'urgent');
        const matchesStatus = filterStatus === 'all' || (filterStatus === 'pending' && !task.completed) || (filterStatus === 'completed' && task.completed);
        const matchesSearch = task.title.toLowerCase().includes(searchTerm) || (task.description && task.description.toLowerCase().includes(searchTerm));
        return matchesCategory && matchesStatus && matchesSearch;
    });

    if (filteredTasks.length === 0) {
        elements.taskList.innerHTML = `<li class="task-item placeholder"><i class="fas fa-ellipsis-h"></i> Votre liste de tâches est vide ou aucun résultat ne correspond aux filtres.</li>`;
        return;
    }

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.classList.add('task-item');
        if (task.completed) {
            li.classList.add('completed');
        }
        li.dataset.taskId = task.id; // Pour retrouver la tâche facilement

        const priorityClass = `priority-${task.priority}`; // Pour styliser la priorité en CSS
        const dueDateText = task.dueDate ? ` (${formatDate(new Date(task.dueDate))})` : '';

        li.innerHTML = `
            <div class="task-info">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Marquer la tâche comme terminée">
                <span class="task-title ${priorityClass}">${task.title}${dueDateText}</span>
                <p class="task-description">${task.description || ''}</p>
                ${task.projectId ? `<span class="task-project-tag">Projet: ${Synchora.projects.find(p => p.id === task.projectId)?.name || 'Inconnu'}</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="edit-task-btn" aria-label="Modifier la tâche"><i class="fas fa-pencil-alt"></i></button> <button class="delete-task-btn" aria-label="Supprimer la tâche"><i class="fas fa-trash"></i></button> </div>
        `;
        elements.taskList.appendChild(li);
    });

    // Attache les écouteurs d'événements après le rendu
    attachTaskEventListeners();
}

/**
 * Attache les écouteurs d'événements aux boutons des tâches (modifier, supprimer, checkbox).
 */
function attachTaskEventListeners() {
    elements.taskList.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const taskId = e.target.closest('.task-item').dataset.taskId;
            toggleTaskCompletion(taskId, e.target.checked);
        });
    });

    elements.taskList.querySelectorAll('.edit-task-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.target.closest('.task-item').dataset.taskId;
            editTask(taskId);
        });
    });

    elements.taskList.querySelectorAll('.delete-task-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.target.closest('.task-item').dataset.taskId;
            deleteTask(taskId);
        });
    });
}

// Ajout d'une variable globale pour la date actuellement affichée dans le calendrier
let currentCalendarDate = new Date();
let currentCalendarViewType = 'month'; // 'day', 'week', 'month'

/**
 * Rend le calendrier pour la vue spécifiée et la date actuelle.
 */
function renderCalendar() {
    elements.calendarDisplay.innerHTML = ''; // Vide l'affichage actuel
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Pour une comparaison précise des dates

    // Mettre à jour le titre du calendrier
    elements.currentCalendarView.textContent = formatCalendarHeader(currentCalendarDate, currentCalendarViewType);

    // Supprimer la classe 'active' de tous les boutons de vue
    elements.calendarViewButtons.forEach(btn => btn.classList.remove('active'));
    // Ajouter la classe 'active' au bouton de la vue actuelle
    document.querySelector(`.view-switcher .view-btn[data-view="${currentCalendarViewType}"]`).classList.add('active');


    if (currentCalendarViewType === 'month') {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        //const daysInMonth = lastDayOfMonth.getDate(); // Non utilisé directement

        const startOfMonthWeek = getStartOfWeek(firstDayOfMonth);
        const endOfMonthWeek = getEndOfWeek(lastDayOfMonth);

        const gridTemplate = document.createElement('div');
        gridTemplate.classList.add('calendar-grid-template'); // Applique la grille CSS

        // En-têtes des jours de la semaine
        ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].forEach(dayName => {
            const header = document.createElement('div');
            header.classList.add('calendar-day-header');
            header.textContent = dayName;
            gridTemplate.appendChild(header);
        });

        let currentDateIterator = new Date(startOfMonthWeek);

        // Boucle pour remplir toutes les semaines visibles dans le mois
        while (currentDateIterator <= endOfMonthWeek) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');

            // N'affiche le numéro que si le jour est dans le mois en cours ou mois visible
            if (currentDateIterator.getMonth() === month || (currentDateIterator >= firstDayOfMonth && currentDateIterator <= lastDayOfMonth)) {
                dayElement.textContent = currentDateIterator.getDate();
            } else {
                dayElement.classList.add('empty'); // Marque les jours des mois précédents/suivants
            }

            // Mise en évidence du jour actuel
            if (currentDateIterator.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }

            // Vérifier les tâches pour ce jour
            const tasksOnThisDay = Synchora.tasks.filter(task =>
                task.dueDate && new Date(task.dueDate).toDateString() === currentDateIterator.toDateString()
            );

            if (tasksOnThisDay.length > 0) {
                dayElement.classList.add('has-events');
                const eventBadge = document.createElement('span');
                eventBadge.classList.add('event-badge');
                eventBadge.textContent = `${tasksOnThisDay.length} tâche(s)`;
                dayElement.appendChild(eventBadge);
            }

            // Ajouter un écouteur de clic pour afficher les tâches dans une modale
            if (!dayElement.classList.contains('empty')) {
                const dateToDisplay = new Date(currentDateIterator); // Capture la date correcte
                dayElement.addEventListener('click', () => {
                    displayTasksForDate(dateToDisplay);
                });
            }

            gridTemplate.appendChild(dayElement);
            currentDateIterator.setDate(currentDateIterator.getDate() + 1); // Passe au jour suivant
        }

        elements.calendarDisplay.appendChild(gridTemplate);

    } else if (currentCalendarViewType === 'week') {
        const startOfWeek = getStartOfWeek(currentCalendarDate);
        //const endOfWeek = getEndOfWeek(currentCalendarDate); // Non utilisé directement

        const weekGrid = document.createElement('div');
        weekGrid.classList.add('calendar-week-grid'); // Nouvelle classe CSS pour la grille semaine
        elements.calendarDisplay.appendChild(weekGrid);

        // En-têtes de jour avec la date
        for (let i = 0; i < 7; i++) {
            const dayHeader = new Date(startOfWeek);
            dayHeader.setDate(startOfWeek.getDate() + i);
            const headerDiv = document.createElement('div');
            headerDiv.classList.add('week-day-header');
            if (dayHeader.toDateString() === today.toDateString()) {
                headerDiv.classList.add('today');
            }
            headerDiv.innerHTML = `
                <span class="day-name">${new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(dayHeader)}</span>
                <span class="day-date">${dayHeader.getDate()} / ${dayHeader.getMonth() + 1}</span>
            `;
            // Modifier l'écouteur de clic pour la vue semaine
            headerDiv.addEventListener('click', () => {
                displayTasksForDate(dayHeader);
            });
            weekGrid.appendChild(headerDiv);
        }

        // Section des événements (peut être gérée par heures ou juste une liste)
        const eventsContainer = document.createElement('div');
        eventsContainer.classList.add('week-events-container');
        weekGrid.appendChild(eventsContainer);

        let tempDay = new Date(startOfWeek);
        for(let i = 0; i < 7; i++) {
            const dayEvents = document.createElement('div');
            dayEvents.classList.add('week-events-day');
            const tasksForDay = Synchora.tasks.filter(task =>
                task.dueDate && new Date(task.dueDate).toDateString() === tempDay.toDateString()
            );
            if (tasksForDay.length === 0) {
                dayEvents.innerHTML = '<p class="no-events">Aucune tâche</p>';
            } else {
                tasksForDay.forEach(task => {
                    const taskDiv = document.createElement('div');
                    taskDiv.classList.add('week-task-item');
                    if (task.completed) taskDiv.classList.add('completed');
                    taskDiv.innerHTML = `<i class="fas fa-circle ${task.priority}"></i> ${task.title}`;
                    dayEvents.appendChild(taskDiv);
                });
            }
            eventsContainer.appendChild(dayEvents);
            tempDay.setDate(tempDay.getDate() + 1);
        }


    } else if (currentCalendarViewType === 'day') {
        //const dayYear = currentCalendarDate.getFullYear(); // Non utilisé directement
        //const dayMonth = currentCalendarDate.getMonth(); // Non utilisé directement
        //const dayDate = currentCalendarDate.getDate(); // Non utilisé directement

        const dayView = document.createElement('div');
        dayView.classList.add('calendar-day-view'); // Nouvelle classe CSS
        elements.calendarDisplay.appendChild(dayView);

        // Affiche toutes les tâches et événements pour le jour sélectionné
        const tasksForSelectedDay = Synchora.tasks.filter(task =>
            task.dueDate && new Date(task.dueDate).toDateString() === currentCalendarDate.toDateString()
        ).sort((a,b) => (a.dueTime || '').localeCompare(b.dueTime || '')); // Trie par heure si dispo

        if (tasksForSelectedDay.length === 0) {
            dayView.innerHTML = '<p class="no-events">Aucune tâche ou événement prévu pour ce jour.</p>';
        } else {
            tasksForSelectedDay.forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.classList.add('day-view-task-item');
                if (task.completed) taskDiv.classList.add('completed');

                const time = task.dueTime ? `<span class="task-time">${task.dueTime}</span>` : '';
                const description = task.description ? `<p class="task-description-detail">${task.description}</p>` : '';
                const priorityBadge = `<span class="priority-badge priority-${task.priority}">${task.priority}</span>`;

                taskDiv.innerHTML = `
                    <div class="task-header">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
                        <h4 class="task-title-detail">${task.title} ${time}</h4>
                        ${priorityBadge}
                    </div>
                    ${description}
                    <div class="task-actions-detail">
                        <button class="edit-task-btn" data-task-id="${task.id}" aria-label="Modifier la tâche"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-task-btn" data-task-id="${task.id}" aria-label="Supprimer la tâche"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                dayView.appendChild(taskDiv);
            });
            // Attacher les écouteurs d'événements pour les tâches individuelles dans la vue jour
            dayView.querySelectorAll('.task-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const taskId = e.target.dataset.taskId;
                    toggleTaskCompletion(taskId, e.target.checked);
                });
            });
            dayView.querySelectorAll('.edit-task-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const taskId = e.target.dataset.taskId;
                    editTask(taskId);
                });
            });
            dayView.querySelectorAll('.delete-task-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const taskId = e.target.dataset.taskId;
                    deleteTask(taskId);
                });
            });
        }
    }
}


/**
 * Affiche la liste des tâches pour une date spécifique dans une modale.
 * @param {Date} date - La date pour laquelle afficher les tâches.
 */
function displayTasksForDate(date) {
    elements.modalTitle.textContent = `Tâches pour le ${formatModalDate(date)}`;
    elements.modalBody.innerHTML = ''; // Nettoie le contenu précédent

    const tasksForSelectedDay = Synchora.tasks.filter(task =>
        task.dueDate && new Date(task.dueDate).toDateString() === date.toDateString()
    ).sort((a,b) => (a.dueTime || '').localeCompare(b.dueTime || ''));

    if (tasksForSelectedDay.length === 0) {
        elements.modalBody.innerHTML = '<p class="no-events-modal">Aucune tâche prévue pour ce jour.</p>';
    } else {
        const taskListContainer = document.createElement('div');
        taskListContainer.classList.add('modal-task-list');

        tasksForSelectedDay.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.classList.add('modal-task-item');
            if (task.completed) taskDiv.classList.add('completed');

            const time = task.dueTime ? `<span class="task-time">${task.dueTime}</span>` : '';
            const description = task.description ? `<p class="task-description-detail">${task.description}</p>` : '';
            const priorityBadge = `<span class="priority-badge priority-${task.priority}">${task.priority}</span>`;

            taskDiv.innerHTML = `
                <div class="task-header">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
                    <h4 class="task-title-detail">${task.title} ${time}</h4>
                    ${priorityBadge}
                </div>
                ${description}
                <div class="task-actions-detail">
                    <button class="edit-task-btn" data-task-id="${task.id}" aria-label="Modifier la tâche"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-task-btn" data-task-id="${task.id}" aria-label="Supprimer la tâche"><i class="fas fa-trash"></i></button>
                </div>
            `;
            taskListContainer.appendChild(taskDiv);
        });
        elements.modalBody.appendChild(taskListContainer);

        // Attacher les écouteurs d'événements pour les tâches individuelles dans la modale
        taskListContainer.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = e.target.dataset.taskId;
                toggleTaskCompletion(taskId, e.target.checked);
                displayTasksForDate(date); // Re-render la modale après la modification
                renderCalendar(); // Mettre à jour le calendrier principal
                updateReports(); // MIS À JOUR: Pour refléter les changements dans les rapports
            });
        });
        taskListContainer.querySelectorAll('.edit-task-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                toggleModal(elements.genericModal, false); // Ferme la modale actuelle
                openTaskFormModal(taskId); // Ouvre la modale d'édition de tâche
            });
        });
        taskListContainer.querySelectorAll('.delete-task-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                deleteTask(taskId);
                displayTasksForDate(date); // Re-render la modale après suppression
                renderCalendar(); // Mettre à jour le calendrier principal
                updateReports(); // MIS À JOUR: Pour refléter les changements dans les rapports
            });
        });
    }

    toggleModal(elements.genericModal, true);
}


/**
 * Rend la liste des projets dans la section "Projets & Espaces".
 */
function renderProjectList() {
    elements.projectList.innerHTML = '';
    if (Synchora.projects.length === 0) {
        elements.projectList.innerHTML = `<li class="project-card placeholder">
            <i class="fas fa-lightbulb"></i> Aucun projet créé. Créez-en un pour organiser vos tâches par thème !
        </li>`;
        return;
    }

    const searchTerm = elements.projectSearch.value.toLowerCase();
    const filteredProjects = Synchora.projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm) ||
        (project.description && project.description.toLowerCase().includes(searchTerm))
    );

    filteredProjects.forEach(project => {
        const li = document.createElement('li');
        li.classList.add('project-card');
        li.dataset.projectId = project.id;

        // Le calcul de la progression est maintenant géré par updateProjectProgress si basé sur les tâches
        // Ou vous pouvez utiliser project.progress directement si vous avez une logique plus complexe
        const progress = project.progress !== undefined ? project.progress : 0; // Utilise la progression stockée
        const projectTasks = Synchora.tasks.filter(task => task.projectId === project.id);
        const completedProjectTasks = projectTasks.filter(task => task.completed).length;


        li.innerHTML = `
            <h4><i class="fas fa-folder-open"></i> ${project.name}</h4>
            <p>${project.description || 'Aucune description.'}</p>
            <div class="project-progress">
                <div class="project-progress-bar" style="width: ${progress.toFixed(0)}%;"></div>
            </div>
            <small>${progress.toFixed(0)}% terminé (${completedProjectTasks}/${projectTasks.length} tâches)</small>
            <div class="project-actions" style="margin-top: var(--spacing-sm)">
                <button class="edit-project-btn" aria-label="Modifier le projet"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete-project-btn" aria-label="Supprimer le projet"><i class="fas fa-trash"></i></button>
            </div>
        `;
        elements.projectList.appendChild(li);
    });

    attachProjectEventListeners();
}

/**
 * Attache les écouteurs d'événements aux boutons des projets.
 */
function attachProjectEventListeners() {
    elements.projectList.querySelectorAll('.edit-project-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const projectId = e.target.closest('.project-card').dataset.projectId;
            editProject(projectId);
        });
    });

    elements.projectList.querySelectorAll('.delete-project-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const projectId = e.target.closest('.project-card').dataset.projectId;
            deleteProject(projectId);
        });
    });
}

// Global variable for Chart instances to allow destruction
let tasksChart, timeChart;

/**
 * Met à jour les rapports (graphiques et métriques).
 * Nécessite Chart.js pour les graphiques.
 */
function updateReports() {
    // Suppression des anciennes instances de graphique pour éviter les doublons
    if (tasksChart) tasksChart.destroy();
    if (timeChart) timeChart.destroy();

    // Gestion du message du graphique des projets
    if (elements.timeSpentByProjectChartMessage) {
        elements.timeSpentByProjectChartMessage.remove(); // Supprime l'ancien message s'il existe
    }

    // Données pour le graphique des tâches par catégorie
    const categoryCounts = Synchora.tasks.reduce((acc, task) => {
        acc[task.category || 'Sans catégorie'] = (acc[task.category || 'Sans catégorie'] || 0) + 1;
        return acc;
    }, {});

    const tasksData = {
        labels: Object.keys(categoryCounts),
        datasets: [{
            data: Object.values(categoryCounts),
            backgroundColor: [
                'rgba(0, 123, 255, 0.7)', // primary-color
                'rgba(40, 167, 69, 0.7)',  // accent-color
                'rgba(108, 117, 125, 0.7)', // secondary-color
                'rgba(255, 193, 7, 0.7)',   // warn-color
                'rgba(220, 53, 69, 0.7)',    // danger-color
                'rgba(153, 102, 255, 0.7)' // Nouvelle couleur pour "Sans catégorie" ou autres
            ],
            borderColor: [
                'rgba(0, 123, 255, 1)',
                'rgba(40, 167, 69, 1)',
                'rgba(108, 117, 125, 1)',
                'rgba(255, 193, 7, 1)',
                'rgba(220, 53, 69, 1)',
                'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
        }]
    };

    const tasksCtx = elements.tasksByCategoryChart.getContext('2d');
    tasksChart = new Chart(tasksCtx, {
        type: 'pie',
        data: tasksData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: Synchora.settings.theme === 'dark' ? '#e0e0e0' : '#343a40' // Adapte la couleur des labels
                    }
                },
                title: {
                    display: false,
                    text: 'Tâches par Catégorie'
                }
            }
        }
    });

    // --- GRAPHIQUE DE PROGRESSION DES PROJETS ---
    const projectLabels = Synchora.projects.map(p => p.name);
    const projectProgressData = Synchora.projects.map(p => p.progress);

    if (Synchora.projects.length === 0) {
        // Crée et affiche le message si aucun projet n'existe
        const messageDiv = document.createElement('div');
        messageDiv.id = 'timeSpentByProjectChartMessage';
        messageDiv.classList.add('chart-message-placeholder');
        messageDiv.innerHTML = `<i class="fas fa-info-circle"></i> Créez des projets pour visualiser leur progression ici.`;
        elements.timeSpentByProjectChart.parentNode.insertBefore(messageDiv, elements.timeSpentByProjectChart.nextSibling);
        elements.timeSpentByProjectChart.style.display = 'none'; // Masque le canvas du graphique
    } else {
        // Affiche le graphique si des projets existent
        elements.timeSpentByProjectChart.style.display = 'block'; // S'assure que le canvas est visible

        const timeCtx = elements.timeSpentByProjectChart.getContext('2d');
        timeChart = new Chart(timeCtx, {
            type: 'bar',
            data: {
                labels: projectLabels, // UTILISE LES NOMS RÉELS DES PROJETS
                datasets: [{
                    label: 'Progression (%)', // Libellé pour la légende
                    data: projectProgressData, // UTILISE LA PROGRESSION RÉELLE DES PROJETS
                    backgroundColor: 'rgba(90, 103, 216, 0.8)', // Couleur principale (comme discuté)
                    borderColor: 'rgba(90, 103, 216, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false, // On ne veut pas afficher la légende "Progression (%)" sous les barres
                        labels: {
                            color: Synchora.settings.theme === 'dark' ? '#e0e0e0' : '#343a40'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Progression de vos Projets', // Ajout d'un titre explicite
                        font: { size: 16 },
                        color: Synchora.settings.theme === 'dark' ? '#e0e0e0' : '#4a5568'
                    },
                    tooltip: { // Amélioration de l'infobulle
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed.y}%`; // Affiche "Nom Projet: X%"
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100, // La progression va de 0 à 100%
                        title: {
                            display: true,
                            text: 'Progression (%)', // Titre de l'axe Y
                            color: Synchora.settings.theme === 'dark' ? '#e0e0e0' : '#718096'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%'; // Ajoute le symbole %
                            },
                            color: Synchora.settings.theme === 'dark' ? '#e0e0e0' : '#343a40'
                        }
                    },
                    x: {
                        title: {
                            display: false // Le nom du projet est déjà le label
                        },
                        ticks: {
                            color: Synchora.settings.theme === 'dark' ? '#e0e0e0' : '#343a40'
                        }
                    }
                }
            }
        });
    }


    // Métriques de productivité
    const totalTasks = Synchora.tasks.length;
    const completedTasks = Synchora.tasks.filter(task => task.completed).length;
    elements.completionRate.textContent = `${totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(0) : 0}%`;

    // TODO: Calculer la moyenne de tâches par jour et le temps de focus total
    elements.avgTasksPerDay.textContent = '0';
    elements.totalFocusHours.textContent = '0h';
}

/**
 * Recalcule la progression d'un projet basé sur ses tâches associées.
 * Appelé lorsque des tâches sont ajoutées, modifiées ou supprimées.
 * @param {string} projectId L'ID du projet à mettre à jour.
 */
function updateProjectProgress(projectId) {
    const project = Synchora.projects.find(p => p.id === projectId);
    if (!project) return; // Le projet n'existe pas

    const projectTasks = Synchora.tasks.filter(task => task.projectId === projectId);
    const completedProjectTasks = projectTasks.filter(task => task.completed).length;

    const newProgress = projectTasks.length > 0 ? (completedProjectTasks / projectTasks.length) * 100 : 0;

    // Mise à jour de la progression et de la dernière activité
    project.progress = parseFloat(newProgress.toFixed(0)); // Arrondir à l'entier le plus proche
    project.lastActivity = new Date().toISOString(); // Mettre à jour la date de dernière activité

    Synchora.saveData(); // Sauvegarder l'état mis à jour des projets
    renderProjectList(); // Mettre à jour l'affichage de la liste des projets
    updateReports(); // Mettre à jour le graphique des rapports
}

/**
 * Charge et affiche les paramètres actuels de l'utilisateur.
 */
function loadSettings() {
    // Thème
    elements.themeRadios.forEach(radio => {
        radio.checked = (radio.value === Synchora.settings.theme);
    });

    // Notifications
    elements.enablePushNotifications.checked = Synchora.settings.notifications.push;
    elements.enableEmailNotifications.checked = Synchora.settings.notifications.email;
}

/**
 * Sauvegarde les paramètres de l'utilisateur.
 */
function saveSettings() {
    Synchora.settings.theme = document.querySelector('input[name="app-theme"]:checked').value;
    Synchora.settings.notifications.push = elements.enablePushNotifications.checked;
    Synchora.settings.notifications.email = elements.enableEmailNotifications.checked;

    Synchora.saveData();
    Synchora.applyTheme(); // Applique le nouveau thème immédiatement
    alert('Paramètres sauvegardés avec succès !');
}


// --- 5. Logique des Fonctionnalités (CRUD) ---

/**
 * Crée ou met à jour une tâche.
 * @param {object} taskData - Les données de la tâche. Si taskData.id existe, c'est une mise à jour.
 */
function saveTask(taskData) {
    let projectIdToUpdate = taskData.projectId; // Capture le projectId avant la modification
    if (taskData.id) {
        // Mise à jour d'une tâche existante
        const index = Synchora.tasks.findIndex(t => t.id === taskData.id);
        if (index !== -1) {
            // Si le projectId change pour une tâche existante, il faut potentiellement mettre à jour l'ancien projet aussi
            const oldProjectId = Synchora.tasks[index].projectId;
            Synchora.tasks[index] = { ...Synchora.tasks[index], ...taskData, updatedAt: new Date().toISOString() };
            if (oldProjectId && oldProjectId !== projectIdToUpdate) {
                updateProjectProgress(oldProjectId); // Mettre à jour l'ancien projet si la tâche lui était associée
            }
        }
    } else {
        // Nouvelle tâche
        const newTask = {
            id: generateUniqueId(),
            createdAt: new Date().toISOString(),
            completed: false,
            ...taskData
        };
        Synchora.tasks.push(newTask);
    }
    Synchora.saveData();
    renderTaskList();
    updateDashboard(); // Mise à jour du tableau de bord après modification des tâches
    renderCalendar(); // Mettre à jour le calendrier si nécessaire
    if (projectIdToUpdate) {
        updateProjectProgress(projectIdToUpdate); // Mettre à jour le nouveau projet
    }
    updateReports(); // MIS À JOUR: Pour refléter les changements dans les rapports (y compris la progression des projets)
    toggleModal(elements.genericModal, false);
}

/**
 * Affiche la modale pour créer ou éditer une tâche.
 * @param {string|null} taskId - ID de la tâche à éditer, ou null pour une nouvelle tâche.
 */
function openTaskFormModal(taskId = null) {
    elements.modalTitle.textContent = taskId ? 'Modifier la Tâche' : 'Ajouter une Nouvelle Tâche';
    // Construire le formulaire de tâche dynamiquement
    elements.modalBody.innerHTML = `
        <form id="taskForm">
            <div class="form-group">
                <label for="taskFormTitle">Titre de la tâche :</label>
                <input type="text" id="taskFormTitle" required placeholder="Ex: Réunion de projet">
            </div>
            <div class="form-group">
                <label for="taskFormDescription">Description (optionnel) :</label>
                <textarea id="taskFormDescription" rows="3" placeholder="Détails de la tâche..."></textarea>
            </div>
            <div class="form-group">
                <label for="taskFormDueDate">Date d'échéance :</label>
                <input type="date" id="taskFormDueDate">
            </div>
            <div class="form-group">
                <label for="taskFormDueTime">Heure d'échéance (optionnel) :</label>
                <input type="time" id="taskFormDueTime">
            </div>
            <div class="form-group">
                <label for="taskFormPriority">Priorité :</label>
                <select id="taskFormPriority">
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>
            <div class="form-group">
                <label for="taskFormCategory">Catégorie :</label>
                <select id="taskFormCategory">
                    <option value="">Sélectionner</option>
                    <option value="work">Travail</option>
                    <option value="study">Études</option>
                    <option value="personal">Personnel</option>
                    <option value="health">Santé</option>
                    <option value="finance">Finances</option>
                </select>
            </div>
            <div class="form-group">
                <label for="taskFormProject">Projet (optionnel) :</label>
                <select id="taskFormProject">
                    <option value="">Aucun projet</option>
                    ${Synchora.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>
            <button type="submit" class="submit-form-btn">${taskId ? 'Sauvegarder les modifications' : 'Ajouter la Tâche'}</button>
        </form>
    `;

    // Si c'est une édition, pré-remplir le formulaire
    if (taskId) {
        const task = Synchora.tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('taskFormTitle').value = task.title;
            document.getElementById('taskFormDescription').value = task.description || '';
            document.getElementById('taskFormDueDate').value = task.dueDate || '';
            document.getElementById('taskFormDueTime').value = task.dueTime || '';
            document.getElementById('taskFormPriority').value = task.priority || 'medium';
            document.getElementById('taskFormCategory').value = task.category || '';
            document.getElementById('taskFormProject').value = task.projectId || '';
        }
    }

    const currentTaskForm = document.getElementById('taskForm');
    currentTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskData = {
            id: taskId, // Sera null pour une nouvelle tâche
            title: document.getElementById('taskFormTitle').value,
            description: document.getElementById('taskFormDescription').value,
            dueDate: document.getElementById('taskFormDueDate').value,
            dueTime: document.getElementById('taskFormDueTime').value,
            priority: document.getElementById('taskFormPriority').value,
            category: document.getElementById('taskFormCategory').value,
            projectId: document.getElementById('taskFormProject').value || null // Assure null si vide
        };
        saveTask(taskData);
    });

    toggleModal(elements.genericModal, true);
}


/**
 * Modifie le statut de complétion d'une tâche.
 * @param {string} taskId
 * @param {boolean} completed
 */
function toggleTaskCompletion(taskId, completed) {
    const task = Synchora.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = completed;
        task.completedDate = completed ? new Date().toISOString() : null; // Enregistre la date de complétion
        Synchora.saveData();
        renderTaskList();
        updateDashboard();
        renderCalendar();
        if (task.projectId) {
            updateProjectProgress(task.projectId); // Mettre à jour la progression du projet
        }
        updateReports(); // MIS À JOUR: Pour refléter les changements dans les rapports
    }
}

/**
 * Lance l'édition d'une tâche.
 * @param {string} taskId
 */
function editTask(taskId) {
    openTaskFormModal(taskId);
}

/**
 * Supprime une tâche.
 * @param {string} taskId
 */
function deleteTask(taskId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
        const task = Synchora.tasks.find(t => t.id === taskId);
        const projectIdToUpdate = task ? task.projectId : null; // Capture l'ID du projet avant suppression

        Synchora.tasks = Synchora.tasks.filter(t => t.id !== taskId);
        Synchora.saveData();
        renderTaskList();
        updateDashboard();
        renderCalendar();
        if (projectIdToUpdate) {
            updateProjectProgress(projectIdToUpdate); // Mettre à jour la progression du projet
        }
        updateReports(); // MIS À JOUR: Pour refléter les changements dans les rapports
    }
}


/**
 * Crée ou met à jour un projet.
 * @param {object} projectData - Les données du projet. Si projectData.id existe, c'est une mise à jour.
 */
function saveProject(projectData) {
    if (projectData.id) {
        const index = Synchora.projects.findIndex(p => p.id === projectData.id);
        if (index !== -1) {
            Synchora.projects[index] = { ...Synchora.projects[index], ...projectData, updatedAt: new Date().toISOString() };
        }
    } else {
        const newProject = {
            id: generateUniqueId(),
            createdAt: new Date().toISOString(),
            progress: 0, // Initialise la progression à 0 pour un nouveau projet
            lastActivity: new Date().toISOString(), // Initialise la dernière activité
            ...projectData
        };
        Synchora.projects.push(newProject);
    }
    Synchora.saveData();
    renderProjectList();
    renderTaskList(); // Rafraîchit les listes de tâches qui pourraient être affectées par ce projet
    updateReports(); // MIS À JOUR: Pour que le nouveau projet apparaisse dans le graphique
    toggleModal(elements.genericModal, false);
}

/**
 * Affiche la modale pour créer ou éditer un projet.
 * @param {string|null} projectId - ID du projet à éditer, ou null pour un nouveau projet.
 */
function openProjectFormModal(projectId = null) {
    elements.modalTitle.textContent = projectId ? 'Modifier le Projet' : 'Créer un Nouveau Projet';
    elements.modalBody.innerHTML = `
        <form id="projectForm">
            <div class="form-group">
                <label for="projectFormName">Nom du Projet :</label>
                <input type="text" id="projectFormName" required placeholder="Ex: Rénovation de la maison">
            </div>
            <div class="form-group">
                <label for="projectFormDescription">Description (optionnel) :</label>
                <textarea id="projectFormDescription" rows="4" placeholder="Objectifs et détails du projet..."></textarea>
            </div>
            <button type="submit" class="submit-form-btn">${projectId ? 'Sauvegarder les modifications' : 'Créer le Projet'}</button>
        </form>
    `;

    if (projectId) {
        const project = Synchora.projects.find(p => p.id === projectId);
        if (project) {
            document.getElementById('projectFormName').value = project.name;
            document.getElementById('projectFormDescription').value = project.description || '';
        }
    }

    const currentProjectForm = document.getElementById('projectForm');
    currentProjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const projectData = {
            id: projectId,
            name: document.getElementById('projectFormName').value,
            description: document.getElementById('projectFormDescription').value
        };
        saveProject(projectData);
    });

    toggleModal(elements.genericModal, true);
}


/**
 * Lance l'édition d'un projet.
 * @param {string} projectId
 */
function editProject(projectId) {
    openProjectFormModal(projectId);
}

/**
 * Supprime un projet et ses tâches associées.
 * @param {string} projectId
 */
function deleteProject(projectId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Toutes les tâches associées seront également supprimées !')) {
        Synchora.projects = Synchora.projects.filter(p => p.id !== projectId);
        Synchora.tasks = Synchora.tasks.filter(t => t.projectId !== projectId); // Supprime les tâches liées
        Synchora.saveData();
        renderProjectList();
        renderTaskList(); // Rafraîchit la liste des tâches
        updateDashboard();
        renderCalendar();
        updateReports(); // MIS À JOUR: Pour que le projet disparaisse du graphique
    }
}


// --- 6. Écouteurs d'Événements Globaux et Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    // 6.1 Chargement initial des données et application du thème
    Synchora.loadData();
    Synchora.applyTheme();

    // 6.2 Gestion de la navigation entre sections
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Retirer 'active' des liens et sections
            elements.navLinks.forEach(nav => nav.classList.remove('active'));
            elements.contentSections.forEach(section => section.classList.remove('active'));

            // Ajouter 'active' au lien cliqué et à la section correspondante
            e.currentTarget.classList.add('active');
            const targetId = e.currentTarget.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');

            // Mettre à jour le titre de la page
            elements.pageTitle.textContent = e.currentTarget.querySelector('.nav-text').textContent;

            // Mettre à jour les données et le rendu de la section active
            Synchora.currentView = targetId;
            switch (targetId) {
                case 'dashboard':
                    updateDashboard();
                    break;
                case 'tasks':
                    renderTaskList();
                    break;
                case 'calendar':
                    // Quand on clique sur Calendrier, on initialise la date courante à aujourd'hui
                    currentCalendarDate = new Date();
                    currentCalendarViewType = 'month'; // ou 'week', selon la préférence par default
                    renderCalendar();
                    break;
                case 'projects':
                    renderProjectList();
                    break;
                case 'reports':
                    updateReports(); // MIS À JOUR: Appeler updateReports pour afficher le graphique des projets
                    break;
                case 'settings':
                    loadSettings();
                    break;
            }
        });
    });

    // Activer la section Dashboard par défaut au chargement
    document.querySelector('.nav-item[href="#dashboard"]').click();


    // 6.3 Gestion de la barre latérale (collapsed/expanded)
    elements.toggleSidebarBtn.addEventListener('click', () => {
        elements.sidebar.classList.toggle('collapsed');
    });


    // 6.4 Gestion de l'ouverture/fermeture des modales
    elements.closeModalBtn.addEventListener('click', () => toggleModal(elements.genericModal, false));
    elements.genericModal.addEventListener('click', (event) => {
        if (event.target === elements.genericModal) { // Fermer si clic en dehors du contenu
            toggleModal(elements.genericModal, false);
        }
    });

    // Boutons d'ajout (via la sidebar et le bouton flottant)
    elements.addNewBtn.addEventListener('click', () => openTaskFormModal());
    elements.addTaskFloatingBtn.addEventListener('click', () => openTaskFormModal());


    // 6.5 Filtres et recherche de tâches
    elements.taskFilterCategory.addEventListener('change', renderTaskList);
    elements.taskFilterStatus.addEventListener('change', renderTaskList);
    elements.taskSearchInput.addEventListener('input', renderTaskList);


    // 6.6 Vue du calendrier (changement jour/semaine/mois)
    elements.calendarViewButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            currentCalendarViewType = e.target.dataset.view; // Met à jour le type de vue
            renderCalendar(); // Re-rend le calendrier avec la nouvelle vue
        });
    });

    elements.prevViewBtn.addEventListener('click', () => {
        if (currentCalendarViewType === 'month') {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        } else if (currentCalendarViewType === 'week') {
            currentCalendarDate.setDate(currentCalendarDate.getDate() - 7);
        } else if (currentCalendarViewType === 'day') {
            currentCalendarDate.setDate(currentCalendarDate.getDate() - 1);
        }
        renderCalendar();
    });

    elements.nextViewBtn.addEventListener('click', () => {
        if (currentCalendarViewType === 'month') {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        } else if (currentCalendarViewType === 'week') {
            currentCalendarDate.setDate(currentCalendarDate.getDate() + 7);
        } else if (currentCalendarViewType === 'day') {
            currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
        }
        renderCalendar();
    });

    // 6.7 Recherche de projets
    elements.projectSearch.addEventListener('input', renderProjectList);
    elements.addProjectBtn.addEventListener('click', () => openProjectFormModal());


    // 6.8 Paramètres
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.themeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            // Applique le thème temporairement pour prévisualisation avant sauvegarde
            Synchora.settings.theme = radio.value;
            Synchora.applyTheme();
        });
    });

    // 6.9 Menu déroulant du profil utilisateur
    elements.userProfile.addEventListener('click', () => {
        elements.userProfile.classList.toggle('active');
    });
    // Fermer le dropdown si clic en dehors
    document.addEventListener('click', (e) => {
        if (!elements.userProfile.contains(e.target) && elements.userProfile.classList.contains('active')) {
            elements.userProfile.classList.remove('active');
        }
    });


    // TODO: Ajouter des exemples de données pour le développement (à supprimer en prod)
    // MISE À JOUR: Exemple de données ajusté pour la progression des projets
    if (Synchora.tasks.length === 0) {
        Synchora.tasks.push(
            { id: generateUniqueId(), title: "Préparer présentation Synchora", description: "Finaliser les diapositives pour la démo client.", dueDate: "2025-06-15", dueTime: "10:00", priority: "high", category: "work", projectId: null, completed: false, createdAt: "2025-06-08T10:00:00Z" },
            { id: generateUniqueId(), title: "Faire les courses", description: "Lait, pain, légumes, fruits.", dueDate: "2025-06-12", dueTime: null, priority: "medium", category: "personal", projectId: null, completed: false, createdAt: "2025-06-09T14:30:00Z" },
            { id: generateUniqueId(), title: "Appeler le support technique", description: "Problème de connexion internet.", dueDate: "2025-06-11", dueTime: "14:00", priority: "urgent", category: "personal", projectId: null, completed: false, createdAt: "2025-06-10T09:00:00Z" },
            { id: generateUniqueId(), title: "Réviser pour l'examen de JavaScript", description: "Se concentrer sur les promesses et l'async/await.", dueDate: "2025-06-20", dueTime: null, priority: "high", category: "study", projectId: null, completed: false, createdAt: "2025-06-07T18:00:00Z" },
            { id: generateUniqueId(), title: "Planifier les vacances d'été", description: "Chercher des destinations et des hébergements.", dueDate: "2025-07-01", dueTime: null, priority: "low", category: "personal", projectId: null, completed: true, completedDate: "2025-06-10T16:00:00Z", createdAt: "2025-06-05T11:00:00Z" }
        );
    }
    if (Synchora.projects.length === 0) {
        // Ajout de projets initiaux avec des valeurs de progression (à des fins de démonstration)
        Synchora.projects.push(
            { id: generateUniqueId(), name: "Lancement Synchora V1", description: "Préparer le déploiement initial de l'application.", createdAt: "2025-05-01T09:00:00Z", progress: 60, lastActivity: new Date('2025-06-12').toISOString() },
            { id: generateUniqueId(), name: "Rénovation Cuisine", description: "Coordonner les travaux de peinture et d'installation.", createdAt: "2025-04-10T10:00:00Z", progress: 30, lastActivity: new Date('2025-06-01').toISOString() },
            { id: generateUniqueId(), name: "Cours de Marketing Digital", description: "Suivre les modules et pratiquer les exercices.", createdAt: "2025-06-01T10:00:00Z", progress: 10, lastActivity: new Date('2025-06-05').toISOString() }
        );
        // Associer quelques tâches aux projets (ajusté pour utiliser les IDs générés)
        Synchora.tasks[0].projectId = Synchora.projects[0].id; // "Préparer présentation Synchora" lié à "Lancement Synchora V1"
        // Exemple: Marquer une tâche associée pour montrer la progression
        const renovationCuisineProject = Synchora.projects.find(p => p.name === "Rénovation Cuisine");
        if (renovationCuisineProject) {
            Synchora.tasks.push({
                id: generateUniqueId(), title: "Acheter peinture", description: "Couleur neutre pour le salon.", dueDate: "2025-06-14", dueTime: null, priority: "medium", category: "personal", projectId: renovationCuisineProject.id, completed: false, createdAt: "2025-06-11T12:00:00Z"
            });
            Synchora.tasks.push({
                id: generateUniqueId(), title: "Contacter plombier", description: "Fuite sous l'évier.", dueDate: "2025-06-10", dueTime: null, priority: "urgent", category: "personal", projectId: renovationCuisineProject.id, completed: true, completedDate: "2025-06-10T15:00:00Z", createdAt: "2025-06-09T09:00:00Z"
            });
        }
    }

    // Sauvegarder les données d'exemple
    Synchora.saveData();

    // MISE À JOUR: S'assurer que la progression des projets est calculée après le chargement des données initiales
    // et que le graphique est mis à jour.
    Synchora.projects.forEach(p => updateProjectProgress(p.id));
});