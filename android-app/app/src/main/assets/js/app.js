/**
 * Corrientes Débiles - App Controller
 * Minimalist Dark & Orange Equipment Inventory & Maintenance Management
 */

class AppController {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.currentUser = JSON.parse(localStorage.getItem('auth_user') || 'null');
        this.equipos = [];
        this.adminUsers = [];
        this.viewMode = 'grid'; // 'grid' | 'table'
        this.qrScanner = new QRScannerManager();
        this.searchTimeout = null;

        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupRutInput();
        this.updateStorageModeUI();

        // Register Service Worker for offline PWA functionality
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }

        if (this.token && this.currentUser) {
            const isValid = await this.verifySession();
            if (isValid) {
                this.showDashboard();
            } else {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        // Verificación de actualizaciones en GitHub al iniciar
        this.setupUpdateListeners();
        setTimeout(() => {
            this.checkForUpdates(false);
        }, 4000);
    }

    /* ==========================================================================
       AUTHENTICATION & SESSION
       ========================================================================== */
    setupRutInput() {
        const rutInput = document.getElementById('login-rut');
        const validationMsg = document.getElementById('rut-validation-msg');

        RutUtils.attachToInput(rutInput, (isValid, formatted) => {
            if (formatted.length >= 8) {
                if (isValid) {
                    validationMsg.textContent = '✓ RUT Válido';
                    validationMsg.style.color = 'var(--status-operativo)';
                } else {
                    validationMsg.textContent = '✗ RUT Inválido';
                    validationMsg.style.color = 'var(--status-critico)';
                }
            } else {
                validationMsg.textContent = 'Sin validar';
                validationMsg.style.color = 'var(--text-muted)';
            }
        });
    }

    async verifySession() {
        if (!window.appStorage || window.appStorage.getMode() === 'local') {
            return Boolean(this.token && this.currentUser);
        }

        try {
            const cloudUrl = window.appStorage.getCloudUrl();
            const res = await fetch(`${cloudUrl}/api/me`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const rutInput = document.getElementById('login-rut');
        const passwordInput = document.getElementById('login-password');
        const submitBtn = document.getElementById('login-submit-btn');

        const rut = rutInput.value.trim();
        const password = passwordInput.value;

        if (!RutUtils.validate(rut)) {
            this.showToast('El RUT ingresado no es válido según algoritmo Módulo 11.', 'error');
            rutInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Validando acceso...';

        const isDesktopLocalhost = typeof window !== 'undefined' && 
                                   window.location && 
                                   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const isCloudMode = window.appStorage && window.appStorage.getMode() === 'cloud';

        // Intento 1: Si estamos en Modo Nube explícito o en localhost del navegador de escritorio
        if (isCloudMode || isDesktopLocalhost) {
            try {
                const cloudUrl = isCloudMode ? window.appStorage.getCloudUrl() : '';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const res = await fetch(`${cloudUrl}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rut, password }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                const data = await res.json();

                if (res.ok && data.success) {
                    this.token = data.token;
                    this.currentUser = data.user;
                    localStorage.setItem('auth_token', this.token);
                    localStorage.setItem('auth_user', JSON.stringify(this.currentUser));

                    this.showToast(data.message || `Bienvenido/a, ${data.user.nombre}`, 'success');
                    this.showDashboard();
                    submitBtn.disabled = false;
                    return;
                } else if (res.status === 401) {
                    this.showToast(data.error || 'Credenciales incorrectas.', 'error');
                    submitBtn.disabled = false;
                    return;
                }
            } catch (err) {
                console.warn('Servidor no disponible en /api/login, recurriendo a validación local:', err);
            }
        }

        // Intento 2: Autenticación con base de datos local (Modo Offline / APK)
        if (window.appStorage && window.appStorage.localDb) {
            const user = window.appStorage.localDb.authenticate(rut, password);
            if (user) {
                this.token = 'local_session_' + Date.now();
                this.currentUser = user;
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('auth_user', JSON.stringify(this.currentUser));

                this.showToast(`Bienvenido/a, ${user.nombre}`, 'success');
                this.showDashboard();
                submitBtn.disabled = false;
                return;
            } else {
                this.showToast('Credenciales incorrectas. Verifique RUT y contraseña.', 'error');
            }
        }
        submitBtn.disabled = false;
    }

    async handleLogout() {
        if (window.appStorage && window.appStorage.getMode() === 'cloud') {
            try {
                const cloudUrl = window.appStorage.getCloudUrl();
                await fetch(`${cloudUrl}/api/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
            } catch (e) {
                // ignore network error on logout
            }
        }

        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        this.token = null;
        this.currentUser = null;
        this.showToast('Sesión finalizada exitosamente.', 'info');
        this.showLogin();
    }

    async showLogin() {
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('dashboard-section').style.display = 'none';
        this.renderNavbar(false);
        await this.checkSetupStatus();
    }

    async checkSetupStatus() {
        const banner = document.getElementById('first-run-banner');
        if (!banner) return;

        let needsSetup = false;
        if (!window.appStorage || window.appStorage.getMode() === 'local') {
            needsSetup = !window.appStorage.localDb.hasUsers();
        } else {
            try {
                const cloudUrl = window.appStorage.getCloudUrl();
                const res = await fetch(`${cloudUrl}/api/setup/status`);
                if (res.ok) {
                    const data = await res.json();
                    needsSetup = !data.initialized;
                }
            } catch (e) {
                needsSetup = false;
            }
        }

        banner.style.display = needsSetup ? 'block' : 'none';
    }

    openSetupModal() {
        const rutInput = document.getElementById('setup-admin-rut');
        const validationMsg = document.getElementById('setup-rut-validation-msg');
        if (rutInput && validationMsg) {
            RutUtils.attachToInput(rutInput, (isValid, formatted) => {
                if (formatted.length >= 8) {
                    if (isValid) {
                        validationMsg.textContent = '✓ RUT Válido';
                        validationMsg.style.color = 'var(--status-operativo)';
                    } else {
                        validationMsg.textContent = '✗ RUT Inválido';
                        validationMsg.style.color = 'var(--status-critico)';
                    }
                } else {
                    validationMsg.textContent = 'Sin validar';
                    validationMsg.style.color = 'var(--text-muted)';
                }
            });
        }
        this.openModal('setup-admin-modal');
    }

    async handleSetupAdmin(e) {
        e.preventDefault();
        const rut = document.getElementById('setup-admin-rut').value.trim();
        const nombre = document.getElementById('setup-admin-nombre').value.trim();
        const password = document.getElementById('setup-admin-password').value;
        const confirmPass = document.getElementById('setup-admin-password-confirm').value;
        const submitBtn = document.getElementById('setup-admin-submit-btn');

        if (!RutUtils.validate(rut)) {
            this.showToast('El RUT ingresado no es válido.', 'error');
            return;
        }

        if (password.length < 4) {
            this.showToast('La contraseña debe tener al menos 4 caracteres.', 'error');
            return;
        }

        if (password !== confirmPass) {
            this.showToast('Las contraseñas ingresadas no coinciden.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Configurando...';

        try {
            if (!window.appStorage || window.appStorage.getMode() === 'local') {
                const adminUser = window.appStorage.localDb.registerFirstAdmin({ rut, nombre, password });
                this.token = 'local_session_' + Date.now();
                this.currentUser = adminUser;
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
                this.closeModal('setup-admin-modal');
                this.showToast(`¡Bienvenido Administrador ${adminUser.nombre}!`, 'success');
                this.showDashboard();
            } else {
                const cloudUrl = window.appStorage.getCloudUrl();
                const res = await fetch(`${cloudUrl}/api/setup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rut, nombre, password })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Error al configurar administrador');
                }
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
                this.closeModal('setup-admin-modal');
                this.showToast(data.message, 'success');
                this.showDashboard();
            }
        } catch (err) {
            this.showToast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Administrador e Ingresar';
        }
    }

    showDashboard() {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        this.renderNavbar(true);
        this.loadDashboardData();
    }

    renderNavbar(isAuth) {
        const navActions = document.getElementById('nav-actions');
        if (!isAuth) {
            navActions.innerHTML = '';
            return;
        }

        const initial = this.currentUser?.nombre ? this.currentUser.nombre.charAt(0).toUpperCase() : 'U';
        const isAdmin = this.currentUser?.rol === 'admin';
        const firstName = (this.currentUser?.nombre || 'Usuario').split(' ')[0];
        const roleName = isAdmin ? 'Administrador' : 'Técnico';
        const isLocal = !window.appStorage || window.appStorage.getMode() === 'local';
        const currentVer = (window.APP_VERSION || '1.0.11').replace(/^[vV]/, '');
        const apkFilename = `CDmantencion_v${currentVer}.apk`;

        navActions.innerHTML = `
            <button type="button" class="btn-storage-mode" id="nav-storage-mode-btn" onclick="app.openCloudModal()" title="Configuración de Almacenamiento Local / Nube">
                <span class="mode-dot ${isLocal ? '' : 'cloud'}"></span>
                <span>${isLocal ? 'Local' : 'Nube'}</span>
            </button>

            <!-- Menú Desplegable Esquina Superior Derecha -->
            <div class="nav-dropdown-wrapper" id="nav-dropdown-wrapper">
                <button type="button" class="nav-dropdown-trigger" id="nav-dropdown-trigger" aria-haspopup="true" aria-expanded="false" onclick="app.toggleNavMenu(event)" title="Opciones y cuenta de usuario">
                    <div class="user-avatar">${initial}</div>
                    <div class="nav-trigger-info">
                        <span class="nav-trigger-name">${firstName}</span>
                        <span class="nav-trigger-role">${isAdmin ? 'Admin' : 'Técnico'}</span>
                    </div>
                    <svg class="nav-chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>

                <div class="nav-dropdown-menu" id="nav-dropdown-menu" role="menu">
                    <!-- Cabecera de Usuario -->
                    <div class="dropdown-user-header">
                        <div class="dropdown-user-avatar">${initial}</div>
                        <div class="dropdown-user-meta">
                            <div class="dropdown-user-name">${this.escapeHtml(this.currentUser?.nombre || 'Usuario')}</div>
                            <div class="dropdown-user-rut">${this.escapeHtml(this.currentUser?.rut || '')}</div>
                            <span class="dropdown-user-badge ${isAdmin ? 'badge-admin' : 'badge-tech'}">${roleName}</span>
                        </div>
                    </div>

                    <div class="dropdown-divider"></div>

                    <!-- Escanear QR -->
                    <button type="button" class="dropdown-item" id="scan-qr-nav-btn" onclick="app.closeNavMenu(); app.openQrScanner();" role="menuitem">
                        <div class="dropdown-item-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        </div>
                        <div class="dropdown-item-content">
                            <span class="dropdown-item-title">Escanear Código QR</span>
                            <span class="dropdown-item-subtitle">Cámara o archivo para ficha</span>
                        </div>
                    </button>

                    <!-- Descargar APK -->
                    <a href="/CDmantencion.apk" download="${apkFilename}" class="dropdown-item" id="apk-download-nav-btn" onclick="app.closeNavMenu();" role="menuitem">
                        <div class="dropdown-item-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                <line x1="12" y1="18" x2="12.01" y2="18"></line>
                            </svg>
                        </div>
                        <div class="dropdown-item-content">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                                <span class="dropdown-item-title">Descargar APK</span>
                                <span class="dropdown-badge-pill">v${currentVer}</span>
                            </div>
                            <span class="dropdown-item-subtitle">${apkFilename}</span>
                        </div>
                    </a>

                    <!-- Buscar Actualización GitHub -->
                    <button type="button" class="dropdown-item" id="apk-update-nav-btn" onclick="app.closeNavMenu(); app.checkForUpdates(true);" role="menuitem">
                        <div class="dropdown-item-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </div>
                        <div class="dropdown-item-content">
                            <span class="dropdown-item-title">Buscar Actualizaciones</span>
                            <span class="dropdown-item-subtitle">Verificar última versión en GitHub</span>
                        </div>
                    </button>

                    ${isAdmin ? `
                    <div class="dropdown-divider"></div>

                    <!-- Administración de Usuarios -->
                    <button type="button" class="dropdown-item" id="admin-panel-nav-btn" onclick="app.closeNavMenu(); app.openAdminModal();" role="menuitem">
                        <div class="dropdown-item-icon" style="color: var(--orange-primary);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <div class="dropdown-item-content">
                            <span class="dropdown-item-title">Administración</span>
                            <span class="dropdown-item-subtitle">Gestión de usuarios y accesos</span>
                        </div>
                    </button>
                    ` : ''}

                    <!-- Sincronización & Nube -->
                    <button type="button" class="dropdown-item" id="cloud-settings-nav-btn" onclick="app.closeNavMenu(); app.openCloudModal();" role="menuitem">
                        <div class="dropdown-item-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                            </svg>
                        </div>
                        <div class="dropdown-item-content">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                                <span class="dropdown-item-title">Base de Datos & Nube</span>
                                <span class="dropdown-badge-mode ${isLocal ? 'mode-local' : 'mode-cloud'}">${isLocal ? 'Local' : 'Nube'}</span>
                            </div>
                            <span class="dropdown-item-subtitle">Sincronización y respaldos</span>
                        </div>
                    </button>

                    <div class="dropdown-divider"></div>

                    <!-- Cerrar Sesión -->
                    <button type="button" class="dropdown-item dropdown-item-danger" id="logout-nav-btn" onclick="app.closeNavMenu(); app.handleLogout();" role="menuitem">
                        <div class="dropdown-item-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </div>
                        <div class="dropdown-item-content">
                            <span class="dropdown-item-title">Cerrar Sesión</span>
                            <span class="dropdown-item-subtitle">Salir del sistema</span>
                        </div>
                    </button>
                </div>
            </div>
        `;
    }

    toggleNavMenu(event) {
        if (event) {
            event.stopPropagation();
        }
        const wrapper = document.getElementById('nav-dropdown-wrapper');
        const trigger = document.getElementById('nav-dropdown-trigger');
        if (!wrapper) return;
        const isOpen = wrapper.classList.toggle('active');
        if (trigger) {
            trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    }

    closeNavMenu() {
        const wrapper = document.getElementById('nav-dropdown-wrapper');
        const trigger = document.getElementById('nav-dropdown-trigger');
        if (wrapper && wrapper.classList.contains('active')) {
            wrapper.classList.remove('active');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
        }
    }

    /* ==========================================================================
       DATA FETCHING & DASHBOARD
       ========================================================================== */
    async loadDashboardData() {
        await Promise.all([
            this.loadStats(),
            this.loadEquipos()
        ]);
    }

    async loadStats() {
        let loaded = false;

        const isDesktopLocalhost = typeof window !== 'undefined' && 
                                   window.location && 
                                   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const isCloudMode = window.appStorage && window.appStorage.getMode() === 'cloud';

        // Consultar API solo en Modo Nube o en servidor localhost de escritorio
        if (isCloudMode || isDesktopLocalhost) {
            try {
                const cloudUrl = isCloudMode ? window.appStorage.getCloudUrl() : '';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2500);

                const res = await fetch(`${cloudUrl}/api/stats`, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.stats) {
                        const s = data.stats;
                        const totalEl = document.getElementById('stat-total-equipos');
                        const operEl = document.getElementById('stat-operativos');
                        const mantEl = document.getElementById('stat-en-mantencion');
                        const fdsEl = document.getElementById('stat-fuera-servicio');
                        if (totalEl) totalEl.textContent = s.total_equipos;
                        if (operEl) operEl.textContent = s.operativos;
                        if (mantEl) mantEl.textContent = s.en_mantencion;
                        if (fdsEl) fdsEl.textContent = s.otros_estados !== undefined ? s.otros_estados : (s.criticos || 0);
                        loaded = true;
                    }
                }
            } catch (e) {
                console.warn('No se pudo cargar estadísticas del servidor:', e);
            }
        }

        // Modo Local o sin conexión: usar base de datos local instantáneamente
        if (!loaded && window.appStorage && window.appStorage.localDb) {
            const s = window.appStorage.localDb.getStats();
            const totalEl = document.getElementById('stat-total-equipos');
            const operEl = document.getElementById('stat-operativos');
            const mantEl = document.getElementById('stat-en-mantencion');
            const fdsEl = document.getElementById('stat-fuera-servicio');
            if (totalEl) totalEl.textContent = s.total_equipos;
            if (operEl) operEl.textContent = s.operativos;
            if (mantEl) mantEl.textContent = s.en_mantencion;
            if (fdsEl) fdsEl.textContent = s.otros_estados !== undefined ? s.otros_estados : (s.criticos || 0);
        }
    }

    async loadEquipos() {
        const searchInput = document.getElementById('search-input');
        const search = (searchInput ? searchInput.value : '').trim();
        let loaded = false;

        const isDesktopLocalhost = typeof window !== 'undefined' && 
                                   window.location && 
                                   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const isCloudMode = window.appStorage && window.appStorage.getMode() === 'cloud';

        // Consultar API solo en Modo Nube o en servidor localhost de escritorio
        if (isCloudMode || isDesktopLocalhost) {
            try {
                const cloudUrl = isCloudMode ? window.appStorage.getCloudUrl() : '';
                const params = new URLSearchParams();
                if (search) params.append('search', search);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2500);

                const res = await fetch(`${cloudUrl}/api/equipos?${params.toString()}`, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.equipos)) {
                        this.equipos = data.equipos;
                        // Sincronizar en almacenamiento local para acceso offline
                        if (window.appStorage && window.appStorage.localDb) {
                            window.appStorage.localDb.saveEquipos(data.equipos);
                        }
                        this.renderEquipos();
                        this.updateQuickDemoSelect();
                        loaded = true;
                    }
                }
            } catch (e) {
                console.warn('Conexión con servidor no disponible, usando base de datos local:', e);
            }
        }

        // Modo Local (APK en celular) o sin conexión: carga instantánea de 54 equipos UPS reales
        if (!loaded && window.appStorage && window.appStorage.localDb) {
            this.equipos = window.appStorage.localDb.getEquipos(search);
            this.renderEquipos();
            this.updateQuickDemoSelect();
        }
    }

    updateQuickDemoSelect() {
        const select = document.getElementById('quick-qr-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- Seleccionar Equipo de Demostración --</option>';
        this.equipos.forEach(eq => {
            const opt = document.createElement('option');
            opt.value = eq.codigo_qr;
            opt.textContent = `${eq.codigo_qr} | ${eq.nombre} (${eq.marca})`;
            select.appendChild(opt);
        });
    }

    /* ==========================================================================
       RENDERING
       ========================================================================== */
    renderEquipos() {
        const container = document.getElementById('equipos-container');
        if (!this.equipos || this.equipos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3 style="color: #fff; margin-bottom: 0.5rem;">No se encontraron equipamientos</h3>
                    <p style="color: var(--text-secondary); font-size: 0.85rem; max-width: 400px; margin: 0 auto 1.25rem;">
                        No hay equipos que coincidan con los filtros de búsqueda aplicados.
                    </p>
                    <button class="btn btn-secondary btn-sm" onclick="app.resetFilters()">
                        Restablecer Filtros
                    </button>
                </div>
            `;
            return;
        }

        if (this.viewMode === 'grid') {
            this.renderGridView(container);
        } else {
            this.renderTableView(container);
        }
    }

    renderGridView(container) {
        let html = '<div class="equipos-grid">';

        this.equipos.forEach(eq => {
            const statusClass = eq.estado === 'Operativo' ? 'operativo' : (eq.estado === 'En Mantención' ? 'mantencion' : 'critico');
            
            // Build last maintenance section
            let lastMaintHtml = '';
            if (eq.ultima_mantencion_fecha) {
                lastMaintHtml = `
                    <div class="last-maintenance-box">
                        <div class="last-m-header">
                            <span class="last-m-tag">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Última Mantención
                            </span>
                            <span class="last-m-date">${eq.ultima_mantencion_fecha}</span>
                        </div>
                        <div class="last-m-tech">
                            Técnico: <strong>${eq.ultima_mantencion_tecnico || 'No asignado'}</strong>
                        </div>
                        <div class="last-m-obs" title="${this.escapeHtml(eq.ultima_mantencion_obs || '')}">
                            "${this.escapeHtml(eq.ultima_mantencion_obs || 'Sin observaciones.')}"
                        </div>
                    </div>
                `;
            } else {
                lastMaintHtml = `
                    <div class="last-maintenance-box" style="border-style: dashed; opacity: 0.7;">
                        <div style="font-size: 0.76rem; color: var(--text-muted); text-align: center; padding: 0.2rem 0;">
                            Sin mantenciones técnicas registradas aún
                        </div>
                    </div>
                `;
            }

            html += `
                <div class="equipo-card" data-id="${eq.id}">
                    <div>
                        <div class="equipo-header">
                            <span class="equipo-qr-badge">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                                ${eq.codigo_qr}
                            </span>
                            <span class="status-badge ${statusClass}">${eq.estado}</span>
                        </div>

                        <h3 class="equipo-title">${this.escapeHtml(eq.nombre)}</h3>
                        <div class="equipo-meta">
                            <span class="brand">${this.escapeHtml(eq.marca)}</span>
                            <span class="divider">/</span>
                            <span>${this.escapeHtml(eq.modelo)}</span>
                        </div>

                        <div class="equipo-location">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            ${this.escapeHtml(eq.ubicacion || 'General')}
                        </div>

                        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.75rem; align-items: center;">
                            ${eq.capacidad && eq.capacidad !== 'S/I' ? `
                                <span style="font-size: 0.72rem; font-family: var(--font-mono); font-weight: 700; color: var(--orange-primary); background: rgba(255, 107, 0, 0.12); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(255, 107, 0, 0.3);">
                                    ${this.escapeHtml(eq.capacidad)}
                                </span>
                            ` : ''}
                            ${eq.numero_serie && eq.numero_serie !== 'S/I' && !eq.numero_serie.includes('No instalada') ? `
                                <span style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-muted); background: var(--bg-surface-2); padding: 2px 7px; border-radius: 4px; border: 1px solid var(--border-subtle);" title="Número de Serie">
                                    S/N: ${this.escapeHtml(eq.numero_serie)}
                                </span>
                            ` : ''}
                            ${eq.baterias_cambiadas === 'Sí' ? `
                                <span style="font-size: 0.7rem; color: var(--status-operativo); background: rgba(34, 197, 94, 0.12); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(34, 197, 94, 0.3);">
                                    ✓ Baterías OK
                                </span>
                            ` : ''}
                        </div>

                        <div style="margin-bottom: 0.85rem;">
                            <div class="equipo-hours-badge" title="Horas de trabajo dedicadas a este equipo">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                Horas de trabajo: <strong>${eq.horas_trabajo || 0} hrs</strong>
                            </div>
                        </div>

                        <div class="equipo-specs-box">
                            <div class="specs-title">Características / Especificaciones</div>
                            <div class="specs-content" title="${this.escapeHtml(eq.caracteristicas || '')}">
                                ${this.escapeHtml(eq.caracteristicas || 'No especificadas')}
                            </div>
                        </div>

                        ${lastMaintHtml}
                    </div>

                    <div class="equipo-footer">
                        <div class="install-date-info">
                            Instalación: <strong>${eq.fecha_instalacion}</strong>
                        </div>

                        <div class="card-actions">
                            <button class="btn btn-secondary btn-sm" title="Ver Código QR" onclick="app.showQrModal(${eq.id})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                                QR
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="app.openDetailModal(${eq.id})">
                                Detalle & Mantenciones
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderTableView(container) {
        let html = `
            <div class="equipos-table-wrapper">
                <table class="equipos-table">
                    <thead>
                        <tr>
                            <th>Código QR</th>
                            <th>Equipo / Recinto</th>
                            <th>Marca y Modelo</th>
                            <th>Instalación</th>
                            <th>Horas de Trabajo</th>
                            <th>Última Mantención</th>
                            <th>Técnico</th>
                            <th>Estado</th>
                            <th style="text-align: right;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.equipos.forEach(eq => {
            const statusClass = eq.estado === 'Operativo' ? 'operativo' : (eq.estado === 'En Mantención' ? 'mantencion' : 'critico');
            html += `
                <tr>
                    <td>
                        <span class="equipo-qr-badge">${eq.codigo_qr}</span>
                    </td>
                    <td>
                        <span class="td-main-title">${this.escapeHtml(eq.nombre)}</span>
                        <span class="td-sub-info">${this.escapeHtml(eq.ubicacion || 'General')}</span>
                        <div style="display: flex; gap: 0.35rem; align-items: center; margin-top: 2px;">
                            ${eq.numero_serie && eq.numero_serie !== 'S/I' && !eq.numero_serie.includes('No instalada') ? `
                                <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">S/N: ${this.escapeHtml(eq.numero_serie)}</span>
                            ` : ''}
                            ${eq.baterias_cambiadas === 'Sí' ? `
                                <span style="font-size: 0.68rem; color: var(--status-operativo); font-weight: 600;">✓ Bat. OK</span>
                            ` : ''}
                        </div>
                    </td>
                    <td>
                        <strong style="color: var(--orange-primary);">${this.escapeHtml(eq.marca)}</strong>
                        <div style="font-size: 0.76rem; color: var(--text-muted);">${this.escapeHtml(eq.modelo)}</div>
                    </td>
                    <td style="font-family: var(--font-mono); font-size: 0.8rem;">
                        ${eq.fecha_instalacion}
                    </td>
                    <td>
                        <span class="equipo-hours-badge">
                            <strong>${eq.horas_trabajo || 0} hrs</strong>
                        </span>
                    </td>
                    <td>
                        ${eq.ultima_mantencion_fecha ? `
                            <div class="table-highlight-box">
                                <strong style="font-family: var(--font-mono); color: #fff;">${eq.ultima_mantencion_fecha}</strong>
                                <div style="font-size: 0.72rem; color: var(--text-muted); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${this.escapeHtml(eq.ultima_mantencion_obs || '')}
                                </div>
                            </div>
                        ` : '<span style="color: var(--text-muted); font-size: 0.75rem;">Sin registros</span>'}
                    </td>
                    <td style="font-size: 0.82rem; font-weight: 500;">
                        ${this.escapeHtml(eq.ultima_mantencion_tecnico || '-')}
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${eq.estado}</span>
                    </td>
                    <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 0.35rem;">
                            <button class="btn btn-secondary btn-sm" title="Ver QR" onclick="app.showQrModal(${eq.id})">
                                QR
                            </button>
                            <button class="btn btn-outline-orange btn-sm" onclick="app.openDetailModal(${eq.id})">
                                Ver
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    resetFilters() {
        document.getElementById('search-input').value = '';
        const est = document.getElementById('filter-estado');
        if (est) est.value = 'Todos';
        const mar = document.getElementById('filter-marca');
        if (mar) mar.value = 'Todas';
        const srt = document.getElementById('filter-sort');
        if (srt) srt.value = 'recientes';
        this.loadEquipos();
    }

    /* ==========================================================================
       MODALS: QR VIEWER & QR SCANNER
       ========================================================================== */
    showQrModal(equipoId) {
        let localEq = (window.appStorage && window.appStorage.localDb) ? window.appStorage.localDb.getEquipoById(equipoId) : null;
        let listEq = this.equipos ? this.equipos.find(e => e.id === equipoId) : null;
        const equipo = { ...(listEq || {}), ...(localEq || {}) };

        if (!equipo || !equipo.id) return;

        // 1. Código QR identificador (ej. EQ-UPS-054)
        const codeEl = document.getElementById('qr-modal-code');
        if (codeEl) codeEl.textContent = equipo.codigo_qr || `EQ-ID-${equipo.id}`;

        // 2. Nombre del equipo (ej. Punto UPS - Recinto AS3016)
        const titleEl = document.getElementById('qr-modal-title');
        if (titleEl) titleEl.textContent = equipo.nombre || 'Equipo';

        // 3. Generar Código QR Nítido y de Alta Resolución
        const container = document.getElementById('qr-code-canvas-container');
        if (container) {
            container.innerHTML = '';
            new QRCode(container, {
                text: equipo.codigo_qr || `EQ-${equipo.id}`,
                width: 175,
                height: 175,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        this.openModal('qr-view-modal');
    }

    printQrCard() {
        const code = document.getElementById('qr-modal-code')?.textContent || '';
        const title = document.getElementById('qr-modal-title')?.textContent || '';
        const canvas = document.querySelector('#qr-code-canvas-container canvas');
        const img = document.querySelector('#qr-code-canvas-container img');

        let qrSrc = '';
        if (canvas) {
            try { qrSrc = canvas.toDataURL('image/png'); } catch (e) {}
        }
        if (!qrSrc && img && img.src) {
            qrSrc = img.src;
        }

        // Crear iframe aislado para imprimir única y exclusivamente la etiqueta
        // garantizando 1 sola página en cualquier navegador, impresora o dispositivo
        const iframe = document.createElement('iframe');
        iframe.id = 'print-qr-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="utf-8">
                <title>Etiqueta ${code}</title>
                <style>
                    @page {
                        size: auto;
                        margin: 10mm;
                    }
                    *, *::before, *::after {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }
                    html, body {
                        width: 100%;
                        height: 100%;
                        background: #ffffff !important;
                        color: #0f172a !important;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        padding-top: 20mm;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .qr-sticker {
                        background: #ffffff;
                        color: #0f172a;
                        padding: 1.15rem 1.15rem 1rem;
                        border-radius: 8px;
                        width: 260px;
                        max-width: 260px;
                        border: 1px solid #cbd5e1;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        box-sizing: border-box;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .qr-canvas-holder {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background: #ffffff;
                        padding: 0.35rem;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                        margin-bottom: 0.55rem;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .qr-canvas-holder img {
                        display: block;
                        width: 175px !important;
                        height: 175px !important;
                    }
                    .sticker-code {
                        font-family: monospace, Courier, monospace;
                        font-weight: 800;
                        font-size: 0.98rem;
                        background: #000000 !important;
                        color: #ffffff !important;
                        padding: 0.25rem 0.9rem;
                        border-radius: 4px;
                        letter-spacing: 0.06em;
                        display: inline-block;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .sticker-divider {
                        width: 100%;
                        border-top: 1.5px dashed #cbd5e1 !important;
                        margin: 0.7rem 0 0.55rem;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .sticker-title {
                        font-weight: 700;
                        font-size: 0.88rem;
                        color: #0f172a !important;
                        line-height: 1.35;
                        text-align: center;
                        word-break: break-word;
                    }
                </style>
            </head>
            <body>
                <div class="qr-sticker">
                    <div class="qr-canvas-holder">
                        <img src="${qrSrc}" alt="${code}">
                    </div>
                    <div class="sticker-code">${code}</div>
                    <div class="sticker-divider"></div>
                    <div class="sticker-title">${title}</div>
                </div>
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.warn('Fallback a window.print():', err);
                window.print();
            } finally {
                setTimeout(() => {
                    try { document.body.removeChild(iframe); } catch (e) {}
                }, 2000);
            }
        }, 200);
    }

    openQrScanner() {
        this.openModal('qr-scanner-modal');
        const video = document.getElementById('scanner-video');
        const statusMsg = document.getElementById('camera-status-msg');

        statusMsg.textContent = 'Iniciando cámara de escaneo...';
        this.qrScanner.startCamera(video, (detectedCode) => {
            this.handleQrDetected(detectedCode);
        }).then(res => {
            if (res.success) {
                statusMsg.textContent = 'Cámara activa. Alinee el código QR con el visor.';
            } else {
                statusMsg.textContent = res.error || 'Cámara no disponible.';
            }
        });
    }

    closeQrScanner() {
        this.qrScanner.stopCamera();
        this.closeModal('qr-scanner-modal');
    }

    async handleQrDetected(code) {
        this.closeQrScanner();
        this.showToast(`Código detectado: ${code}`, 'success');
        let found = false;

        const isDesktopLocalhost = typeof window !== 'undefined' && 
                                   window.location && 
                                   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const isCloudMode = window.appStorage && window.appStorage.getMode() === 'cloud';

        // Consultar API solo en Modo Nube o en servidor localhost de escritorio
        if (isCloudMode || isDesktopLocalhost) {
            try {
                const cloudUrl = isCloudMode ? window.appStorage.getCloudUrl() : '';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2500);

                const res = await fetch(`${cloudUrl}/api/equipos/qr/${encodeURIComponent(code)}`, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.equipo) {
                        this.renderDetailModal(data.equipo);
                        this.openModal('equipo-detail-modal');
                        found = true;
                        return;
                    }
                }
            } catch (e) {
                console.warn('Error buscando QR en el servidor, usando base de datos local:', e);
            }
        }

        // Modo Local o fallback: buscar en base de datos local
        if (!found && window.appStorage && window.appStorage.localDb) {
            const eq = window.appStorage.localDb.getEquipoByCode(code);
            if (eq) {
                this.renderDetailModal(eq);
                this.openModal('equipo-detail-modal');
                return;
            }
        }

        this.showToast(`No se encontró equipo registrado con código o N° de Serie '${code}'`, 'error');
    }

    handleManualQrSearch() {
        const input = document.getElementById('manual-qr-input');
        const val = input.value.trim();
        if (val) {
            this.handleQrDetected(val);
        }
    }

    /* ==========================================================================
       MODALS: DETALLE DE EQUIPO E HISTORIAL DE MANTENCIONES
       ========================================================================== */
    async openDetailModal(equipoId) {
        let loaded = false;

        // Intentar consultar detalle en el servidor si hay conexión
        if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
            try {
                const cloudUrl = (window.appStorage && window.appStorage.getMode() === 'cloud') 
                    ? window.appStorage.getCloudUrl() 
                    : '';
                const res = await fetch(`${cloudUrl}/api/equipos/${equipoId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.equipo) {
                        this.renderDetailModal(data.equipo);
                        this.openModal('equipo-detail-modal');
                        loaded = true;
                        return;
                    }
                }
            } catch (e) {
                console.warn('Error al cargar detalle en el servidor, usando base local:', e);
            }
        }

        // Si no se pudo obtener del servidor, buscar en base local
        if (!loaded && window.appStorage && window.appStorage.localDb) {
            const eq = window.appStorage.localDb.getEquipoById(equipoId);
            if (eq) {
                this.renderDetailModal(eq);
                this.openModal('equipo-detail-modal');
                return;
            }
        }

        this.showToast('Equipo no encontrado en el sistema', 'error');
    }

    renderDetailModal(eq) {
        document.getElementById('detail-nombre').textContent = eq.nombre;
        document.getElementById('detail-qr-tag').textContent = eq.codigo_qr;

        const body = document.getElementById('detail-modal-body');
        const statusClass = eq.estado === 'Operativo' ? 'operativo' : (eq.estado === 'En Mantención' ? 'mantencion' : 'critico');

        let mantencionesHtml = '';
        if (eq.mantenciones && eq.mantenciones.length > 0) {
            mantencionesHtml = '<div class="timeline">';
            eq.mantenciones.forEach(m => {
                mantencionesHtml += `
                    <div class="timeline-item">
                        <div class="timeline-card">
                            <div class="timeline-header">
                                <span class="timeline-tech">👷 ${this.escapeHtml(m.nombre_tecnico)}</span>
                                <span class="timeline-date">${m.fecha_mantencion}</span>
                            </div>
                            <div class="timeline-meta">
                                <strong>Tipo de mantención:</strong> ${this.escapeHtml(m.tipo_mantencion || 'Preventiva')}
                            </div>
                            <div class="timeline-obs">
                                "${this.escapeHtml(m.observaciones)}"
                            </div>
                        </div>
                    </div>
                `;
            });
            mantencionesHtml += '</div>';
        } else {
            mantencionesHtml = `
                <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: var(--bg-surface-2); border-radius: var(--radius-sm); margin-top: 1rem;">
                    Sin mantenciones registradas en el historial para este equipamiento.
                </div>
            `;
        }

        body.innerHTML = `
            <!-- Top Details Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                <div style="background: var(--bg-surface-2); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Marca & Modelo</div>
                    <div style="font-weight: 700; color: #fff;">${this.escapeHtml(eq.marca)}</div>
                    <div style="font-size: 0.8rem; color: var(--orange-primary); font-family: var(--font-mono);">${this.escapeHtml(eq.modelo)}</div>
                </div>

                <div style="background: var(--bg-surface-2); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Horas de Trabajo</div>
                    <div style="font-weight: 700; color: var(--orange-primary); font-size: 1.15rem; font-family: var(--font-mono); margin-top: 0.2rem;">${eq.horas_trabajo || 0} hrs</div>
                    <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.2rem;">
                        Instalado: ${eq.fecha_instalacion}
                    </div>
                </div>

                <div style="background: var(--bg-surface-2); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Estado Actual</div>
                    <div style="margin-top: 0.25rem;">
                        <span class="status-badge ${statusClass}">${eq.estado}</span>
                    </div>
                    <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.35rem;">
                        Recinto: <strong>${this.escapeHtml(eq.ubicacion || 'General')}</strong>
                    </div>
                </div>
            </div>

            <!-- UPS Detailed Levantamiento Box -->
            <div style="background: var(--bg-surface-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.85rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--orange-primary); font-weight: 700; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                    <span>Datos de Levantamiento UPS (Inventario Oficial)</span>
                    <span style="font-family: var(--font-mono); font-size: 0.75rem; color: #fff;">${this.escapeHtml(eq.codigo_qr)}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 0.65rem; font-size: 0.8rem;">
                    <div><span style="color: var(--text-muted);">Piso:</span> <strong style="color: #fff;">${this.escapeHtml(eq.piso || '-')}</strong></div>
                    <div><span style="color: var(--text-muted);">Sector:</span> <strong style="color: #fff;">${this.escapeHtml(eq.sector || '-')}</strong></div>
                    <div><span style="color: var(--text-muted);">Recinto:</span> <strong style="color: #fff;">${this.escapeHtml(eq.recinto || '-')}</strong></div>
                    <div><span style="color: var(--text-muted);">Capacidad:</span> <strong style="color: var(--orange-primary); font-family: var(--font-mono);">${this.escapeHtml(eq.capacidad || '-')}</strong></div>
                    <div><span style="color: var(--text-muted);">N° de Serie:</span> <strong style="color: #fff; font-family: var(--font-mono);">${this.escapeHtml(eq.numero_serie || 'S/I')}</strong></div>
                    <div><span style="color: var(--text-muted);">Baterías Cambiadas:</span> <strong style="color: ${eq.baterias_cambiadas === 'Sí' ? 'var(--status-operativo)' : '#fff'};">${this.escapeHtml(eq.baterias_cambiadas || '-')}</strong></div>
                </div>
                ${eq.observaciones && eq.observaciones !== '-' ? `
                    <div style="margin-top: 0.55rem; padding-top: 0.55rem; border-top: 1px dashed var(--border-subtle); font-size: 0.78rem;">
                        <span style="color: var(--text-muted); font-weight: 600;">Observaciones de Registro:</span> <span style="color: var(--text-secondary);">${this.escapeHtml(eq.observaciones)}</span>
                    </div>
                ` : ''}
            </div>

            <!-- Technical Specifications Box -->
            <div style="margin-bottom: 1.5rem;">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--orange-primary); font-weight: 700; margin-bottom: 0.45rem;">
                    Características Técnicas & Especificaciones
                </div>
                <div style="background: var(--bg-surface-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1rem; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.6;">
                    ${this.escapeHtml(eq.caracteristicas || 'No se han ingresado especificaciones técnicas para este equipo.')}
                </div>
            </div>

            <!-- Maintenance History Header & Timeline -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 1.25rem;">
                <div>
                    <h4 style="color: #fff; font-size: 1rem; font-weight: 700;">Historial Cronológico de Mantenciones</h4>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                        Intervenciones registradas: <strong>${eq.mantenciones ? eq.mantenciones.length : 0}</strong>
                    </div>
                </div>

                <button class="btn btn-primary btn-sm" onclick="app.openNewMaintenanceModal(${eq.id}, '${this.escapeJs(eq.nombre)}', '${eq.codigo_qr}')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    + Registrar Mantención
                </button>
            </div>

            ${mantencionesHtml}
        `;

        const footer = document.getElementById('detail-modal-footer');
        footer.innerHTML = `
            <button type="button" class="btn btn-danger btn-sm" onclick="app.handleDeleteEquipo(${eq.id})">
                Eliminar Equipo
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="app.openEditEquipoModal(${eq.id})">
                Editar Datos
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="app.showQrModal(${eq.id})">
                Ver QR
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="app.closeModal('equipo-detail-modal')">
                Listo
            </button>
        `;
    }

    /* ==========================================================================
       MODALS: NUEVO / EDITAR EQUIPO
       ========================================================================== */
    openNewEquipoModal() {
        document.getElementById('equipo-form-title').textContent = 'Nuevo Equipamiento';
        document.getElementById('equipo-form').reset();
        document.getElementById('form-equipo-id').value = '';
        document.getElementById('form-horas-trabajo').value = '0.0';
        document.getElementById('first-maintenance-section').style.display = 'block';

        // Pre-fill default date today
        document.getElementById('form-fecha-instalacion').value = new Date().toISOString().split('T')[0];
        if (this.currentUser) {
            document.getElementById('form-primera-tecnico').value = this.currentUser.nombre;
        }

        this.openModal('equipo-form-modal');
    }

    async openEditEquipoModal(equipoId) {
        const eq = this.equipos.find(e => e.id === equipoId);
        if (!eq) return;

        document.getElementById('equipo-form-title').textContent = `Editar: ${eq.codigo_qr}`;
        document.getElementById('form-equipo-id').value = eq.id;
        document.getElementById('form-nombre').value = eq.nombre;
        document.getElementById('form-marca').value = eq.marca;
        document.getElementById('form-modelo').value = eq.modelo;
        document.getElementById('form-fecha-instalacion').value = eq.fecha_instalacion;
        document.getElementById('form-horas-trabajo').value = eq.horas_trabajo || 0;
        document.getElementById('form-estado').value = eq.estado;
        document.getElementById('form-ubicacion').value = eq.ubicacion || '';
        document.getElementById('form-caracteristicas').value = eq.caracteristicas || '';

        // Hide first maintenance section when editing
        document.getElementById('first-maintenance-section').style.display = 'none';

        this.closeModal('equipo-detail-modal');
        this.openModal('equipo-form-modal');
    }

    async handleSaveEquipo(e) {
        e.preventDefault();
        const id = document.getElementById('form-equipo-id').value;
        const isEdit = !!id;

        const data = {
            nombre: document.getElementById('form-nombre').value.trim(),
            marca: document.getElementById('form-marca').value.trim(),
            modelo: document.getElementById('form-modelo').value.trim(),
            fecha_instalacion: document.getElementById('form-fecha-instalacion').value,
            horas_trabajo: parseFloat(document.getElementById('form-horas-trabajo').value) || 0.0,
            estado: document.getElementById('form-estado').value,
            ubicacion: document.getElementById('form-ubicacion').value.trim(),
            caracteristicas: document.getElementById('form-caracteristicas').value.trim()
        };

        if (!isEdit) {
            const firstTech = document.getElementById('form-primera-tecnico').value.trim();
            if (firstTech) {
                data.primera_mantencion_tecnico = firstTech;
                data.primera_mantencion_obs = document.getElementById('form-primera-obs').value.trim();
            }
        }

        if (!window.appStorage || window.appStorage.getMode() === 'local') {
            try {
                let savedEq;
                if (isEdit) {
                    savedEq = window.appStorage.localDb.updateEquipo(id, data);
                } else {
                    savedEq = window.appStorage.localDb.createEquipo(data);
                    if (data.primera_mantencion_tecnico) {
                        window.appStorage.localDb.addMantencion({
                            equipo_id: savedEq.id,
                            fecha_mantencion: data.fecha_instalacion,
                            nombre_tecnico: data.primera_mantencion_tecnico,
                            horas_trabajo: data.horas_trabajo,
                            tipo_mantencion: 'Instalación Inicial',
                            observaciones: data.primera_mantencion_obs || 'Puesta en marcha e instalación inicial.'
                        });
                        savedEq = window.appStorage.localDb.getEquipoById(savedEq.id);
                    }
                }
                this.showToast(isEdit ? 'Equipo actualizado con éxito' : 'Equipo registrado exitosamente', 'success');
                this.closeModal('equipo-form-modal');
                await this.loadDashboardData();
                if (savedEq) {
                    this.renderDetailModal(savedEq);
                    this.openModal('equipo-detail-modal');
                }
            } catch (err) {
                this.showToast('Error al guardar equipo: ' + err.message, 'error');
            }
            return;
        }

        try {
            const cloudUrl = window.appStorage.getCloudUrl();
            const url = isEdit ? `${cloudUrl}/api/equipos/${id}` : `${cloudUrl}/api/equipos`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success) {
                this.showToast(isEdit ? 'Equipo actualizado con éxito' : 'Equipo registrado exitosamente', 'success');
                this.closeModal('equipo-form-modal');
                await this.loadDashboardData();
                if (result.equipo) {
                    this.renderDetailModal(result.equipo);
                    this.openModal('equipo-detail-modal');
                }
            } else {
                this.showToast(result.error || 'Error al guardar equipo', 'error');
            }
        } catch (err) {
            this.showToast('Error de conexión al guardar equipo en la nube', 'error');
        }
    }

    async handleDeleteEquipo(equipoId) {
        if (!confirm('¿Está seguro de que desea eliminar este equipo y todo su historial de mantenciones? Esta acción no se puede deshacer.')) {
            return;
        }

        if (!window.appStorage || window.appStorage.getMode() === 'local') {
            window.appStorage.localDb.deleteEquipo(equipoId);
            this.showToast('Equipo eliminado exitosamente', 'success');
            this.closeModal('equipo-detail-modal');
            await this.loadDashboardData();
            return;
        }

        try {
            const cloudUrl = window.appStorage.getCloudUrl();
            const res = await fetch(`${cloudUrl}/api/equipos/${equipoId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.success) {
                this.showToast('Equipo eliminado exitosamente', 'success');
                this.closeModal('equipo-detail-modal');
                await this.loadDashboardData();
            } else {
                this.showToast(data.error || 'Error al eliminar', 'error');
            }
        } catch (e) {
            this.showToast('Error de red al intentar eliminar el equipo', 'error');
        }
    }

    /* ==========================================================================
       MODALS: REGISTRAR MANTENCIÓN
       ========================================================================== */
    openNewMaintenanceModal(equipoId, nombre, codigo) {
        document.getElementById('mantencion-form').reset();
        document.getElementById('mant-equipo-id').value = equipoId;
        document.getElementById('mant-equipo-nombre').textContent = nombre;
        document.getElementById('mant-equipo-code').textContent = codigo;
        document.getElementById('mant-fecha').value = new Date().toISOString().split('T')[0];

        if (this.currentUser) {
            document.getElementById('mant-tecnico').value = this.currentUser.nombre;
        }

        this.openModal('mantencion-modal');
    }

    async handleSaveMaintenance(e) {
        e.preventDefault();
        const data = {
            equipo_id: parseInt(document.getElementById('mant-equipo-id').value, 10),
            fecha_mantencion: document.getElementById('mant-fecha').value,
            tipo_mantencion: document.getElementById('mant-tipo').value,
            nombre_tecnico: document.getElementById('mant-tecnico').value.trim(),
            actualizar_estado: document.getElementById('mant-estado-update').value,
            observaciones: document.getElementById('mant-obs').value.trim()
        };

        if (!window.appStorage || window.appStorage.getMode() === 'local') {
            try {
                const updated = window.appStorage.localDb.addMantencion(data);
                this.showToast('Mantención técnica registrada exitosamente', 'success');
                this.closeModal('mantencion-modal');
                await this.loadDashboardData();
                this.renderDetailModal(updated);
            } catch (err) {
                this.showToast('Error al registrar mantención: ' + err.message, 'error');
            }
            return;
        }

        try {
            const cloudUrl = window.appStorage.getCloudUrl();
            const res = await fetch(`${cloudUrl}/api/mantenciones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success && result.equipo) {
                this.showToast('Mantención técnica registrada exitosamente', 'success');
                this.closeModal('mantencion-modal');
                await this.loadDashboardData();
                this.renderDetailModal(result.equipo);
            } else {
                this.showToast(result.error || 'Error al registrar mantención', 'error');
            }
        } catch (err) {
            this.showToast('Error de comunicación con el servidor', 'error');
        }
    }

    /* ==========================================================================
       ADMINISTRATION: USER & CREDENTIAL MANAGEMENT
       ========================================================================== */
    async openAdminModal() {
        if (!this.currentUser || this.currentUser.rol !== 'admin') {
            this.showToast('Acceso restringido a administradores.', 'error');
            return;
        }

        this.openModal('admin-users-modal');
        await this.loadAdminUsers();
    }

    async loadAdminUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Cargando usuarios...</td></tr>`;

        if (!window.appStorage || window.appStorage.getMode() === 'local') {
            this.adminUsers = window.appStorage.localDb.getUsers();
            this.renderAdminUsers(this.adminUsers);
            return;
        }

        try {
            const cloudUrl = window.appStorage.getCloudUrl();
            const res = await fetch(`${cloudUrl}/api/usuarios`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.success && data.users) {
                this.adminUsers = data.users;
                this.renderAdminUsers(data.users);
            } else {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--status-critico); padding: 1.5rem;">${data.error || 'Error al cargar usuarios'}</td></tr>`;
            }
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--status-critico); padding: 1.5rem;">Error de conexión con el servidor</td></tr>`;
        }
    }

    renderAdminUsers(users) {
        const tbody = document.getElementById('admin-users-tbody');
        if (!users || users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No hay usuarios registrados</td></tr>`;
            return;
        }

        let html = '';
        users.forEach(u => {
            const isMe = this.currentUser && this.currentUser.id === u.id;
            const isAdminRole = u.rol === 'admin';
            const roleBadge = isAdminRole ? 
                '<span class="status-badge mantencion">Administrador</span>' : 
                '<span class="status-badge operativo">Técnico</span>';

            html += `
                <tr>
                    <td>
                        <span style="font-family: var(--font-mono); font-weight: 600; color: #fff;">${u.rut}</span>
                        ${isMe ? '<span style="font-size: 0.68rem; color: var(--orange-primary); font-weight: 700; margin-left: 5px;">(Tú)</span>' : ''}
                    </td>
                    <td>
                        <strong style="color: #fff;">${this.escapeHtml(u.nombre)}</strong>
                    </td>
                    <td>${roleBadge}</td>
                    <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">
                        ${u.creado_en ? u.creado_en.split('T')[0].split(' ')[0] : '-'}
                    </td>
                    <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 0.4rem;">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="app.openEditUserModal(${u.id})">
                                Editar / Clave
                            </button>
                            ${isMe ? '' : `
                                <button type="button" class="btn btn-danger btn-sm" onclick="app.handleDeleteUser(${u.id}, '${this.escapeJs(u.nombre)}')">
                                    Eliminar
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    openNewUserModal() {
        document.getElementById('user-form').reset();
        document.getElementById('user-form-id').value = '';
        document.getElementById('user-form-title').textContent = 'Nuevo Usuario';
        document.getElementById('user-form-pass-label').textContent = 'Contraseña *';
        document.getElementById('user-form-pass-hint').textContent = 'Mínimo 4 caracteres para inicio de sesión';
        document.getElementById('user-form-password').required = true;

        this.openModal('user-form-modal');
    }

    openEditUserModal(userId) {
        const user = this.adminUsers.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('user-form-id').value = user.id;
        document.getElementById('user-form-rut').value = user.rut;
        document.getElementById('user-form-nombre').value = user.nombre;
        document.getElementById('user-form-rol').value = user.rol;
        document.getElementById('user-form-password').value = '';
        document.getElementById('user-form-password').required = false;

        document.getElementById('user-form-title').textContent = `Editar Usuario: ${user.nombre}`;
        document.getElementById('user-form-pass-label').textContent = 'Nueva Contraseña (Opcional)';
        document.getElementById('user-form-pass-hint').textContent = 'Dejar vacío para conservar la contraseña actual';

        this.openModal('user-form-modal');
    }

    async handleSaveUser(e) {
        e.preventDefault();
        const id = document.getElementById('user-form-id').value;
        const isEdit = !!id;

        const rutInput = document.getElementById('user-form-rut');
        const rut = rutInput.value.trim();
        const nombre = document.getElementById('user-form-nombre').value.trim();
        const rol = document.getElementById('user-form-rol').value;
        const password = document.getElementById('user-form-password').value;

        if (!RutUtils.validate(rut)) {
            this.showToast('El RUT ingresado no es válido.', 'error');
            rutInput.focus();
            return;
        }

        if (!isEdit && (!password || password.length < 3)) {
            this.showToast('La contraseña debe tener al menos 3 caracteres.', 'error');
            return;
        }

        const data = { rut, nombre, rol };
        if (password) data.password = password;

        if (!window.appStorage || window.appStorage.getMode() === 'local') {
            try {
                if (isEdit) {
                    window.appStorage.localDb.updateUser(id, data);
                } else {
                    window.appStorage.localDb.createUser(data);
                }
                this.showToast(isEdit ? 'Usuario actualizado con éxito' : 'Usuario creado exitosamente', 'success');
                this.closeModal('user-form-modal');
                await this.loadAdminUsers();

                if (isEdit && this.currentUser && this.currentUser.id === parseInt(id, 10)) {
                    this.currentUser.nombre = nombre;
                    this.currentUser.rut = RutUtils.format(rut);
                    this.currentUser.rol = rol;
                    localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
                    this.renderNavbar(true);
                }
            } catch (err) {
                this.showToast(err.message || 'Error al procesar usuario', 'error');
            }
            return;
        }

        try {
            const cloudUrl = window.appStorage.getCloudUrl();
            const url = isEdit ? `${cloudUrl}/api/usuarios/${id}` : `${cloudUrl}/api/usuarios`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success) {
                this.showToast(result.message || (isEdit ? 'Usuario actualizado' : 'Usuario creado'), 'success');
                this.closeModal('user-form-modal');
                await this.loadAdminUsers();

                // If editing self, update stored current user
                if (isEdit && this.currentUser && this.currentUser.id === parseInt(id, 10)) {
                    this.currentUser.nombre = nombre;
                    this.currentUser.rut = RutUtils.format(rut);
                    this.currentUser.rol = rol;
                    localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
                    this.renderNavbar(true);
                }
            } else {
                this.showToast(result.error || 'Error al procesar usuario', 'error');
            }
        } catch (err) {
            this.showToast('Error de red al guardar usuario', 'error');
        }
    }

    async handleDeleteUser(userId, userName) {
        if (!confirm(`¿Está seguro de eliminar al usuario "${userName}"? Perderá el acceso al sistema de forma permanente.`)) {
            return;
        }

        if (!window.appStorage || window.appStorage.getMode() === 'local') {
            window.appStorage.localDb.deleteUser(userId);
            this.showToast('Usuario eliminado con éxito', 'success');
            await this.loadAdminUsers();
            return;
        }

        try {
            const cloudUrl = window.appStorage.getCloudUrl();
            const res = await fetch(`${cloudUrl}/api/usuarios/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const result = await res.json();

            if (result.success) {
                this.showToast(result.message || 'Usuario eliminado con éxito', 'success');
                await this.loadAdminUsers();
            } else {
                this.showToast(result.error || 'Error al eliminar usuario', 'error');
            }
        } catch (e) {
            this.showToast('Error de conexión al eliminar usuario', 'error');
        }
    }

    /* ==========================================================================
       STORAGE & CLOUD CONFIGURATION MODAL
       ========================================================================== */
    openCloudModal() {
        const mode = window.appStorage ? window.appStorage.getMode() : 'local';
        this.selectStorageMode(mode);
        const urlInput = document.getElementById('cloud-url-input');
        if (urlInput && window.appStorage) {
            urlInput.value = window.appStorage.getCloudUrl();
        }
        const statusEl = document.getElementById('cloud-test-status');
        if (statusEl) statusEl.style.display = 'none';

        this.openModal('cloud-modal');
    }

    selectStorageMode(mode) {
        this.selectedMode = mode;
        const localCard = document.getElementById('mode-card-local');
        const cloudCard = document.getElementById('mode-card-cloud');
        if (!localCard || !cloudCard) return;

        if (mode === 'local') {
            localCard.classList.add('selected');
            cloudCard.classList.remove('selected');
        } else {
            cloudCard.classList.add('selected');
            localCard.classList.remove('selected');
        }
    }

    async saveCloudSettings() {
        const mode = this.selectedMode || 'local';
        const urlInput = document.getElementById('cloud-url-input');
        const url = urlInput ? urlInput.value.trim() : '';

        if (window.appStorage) {
            window.appStorage.setMode(mode);
            if (url) window.appStorage.setCloudUrl(url);
        }

        this.updateStorageModeUI();
        this.closeModal('cloud-modal');
        this.showToast(`Modo configurado: ${mode === 'local' ? 'Local (Offline en este dispositivo)' : 'Modo Nube (Servidor Remoto)'}`, 'success');

        if (this.currentUser) {
            await this.loadDashboardData();
        } else {
            await this.checkSetupStatus();
        }
    }

    updateStorageModeUI() {
        const mode = window.appStorage ? window.appStorage.getMode() : 'local';
        const isLocal = mode === 'local';

        // Update login screen pill
        const loginDot = document.getElementById('login-mode-dot');
        const loginLabel = document.getElementById('login-mode-label');
        if (loginDot && loginLabel) {
            loginDot.className = `mode-dot ${isLocal ? '' : 'cloud'}`;
            loginLabel.textContent = isLocal ? 'Modo Local (Offline)' : 'Modo Nube (Remoto)';
        }

        // Update navbar button if logged in
        const navBtn = document.getElementById('nav-storage-mode-btn');
        if (navBtn) {
            navBtn.innerHTML = `
                <span class="mode-dot ${isLocal ? '' : 'cloud'}"></span>
                <span>${isLocal ? 'Local' : 'Nube'}</span>
            `;
        }
    }

    async testCloudConnection() {
        const url = document.getElementById('cloud-url-input').value.trim();
        const statusEl = document.getElementById('cloud-test-status');
        if (!statusEl) return;

        statusEl.style.display = 'block';
        statusEl.style.background = 'rgba(255,255,255,0.06)';
        statusEl.style.color = 'var(--text-secondary)';
        statusEl.textContent = 'Comprobando conexión con el servidor...';

        const result = await window.appStorage.testCloudConnection(url);
        if (result.success) {
            statusEl.style.background = 'rgba(16, 185, 129, 0.15)';
            statusEl.style.color = '#10b981';
            statusEl.textContent = '✓ Conexión establecida exitosamente con el servidor.';
        } else {
            statusEl.style.background = 'rgba(239, 68, 68, 0.15)';
            statusEl.style.color = '#ef4444';
            statusEl.textContent = `✗ ${result.message}`;
        }
    }

    async syncPushLocalToCloud() {
        const url = document.getElementById('cloud-url-input').value.trim();
        const statusEl = document.getElementById('cloud-test-status');
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = 'rgba(255,255,255,0.06)';
            statusEl.style.color = 'var(--text-secondary)';
            statusEl.textContent = 'Subiendo y sincronizando base de datos local hacia la nube...';
        }

        try {
            const res = await window.appStorage.pushLocalToCloud(url);
            if (statusEl) {
                statusEl.style.background = 'rgba(16, 185, 129, 0.15)';
                statusEl.style.color = '#10b981';
                statusEl.textContent = '✓ ' + (res.message || 'Datos subidos y sincronizados exitosamente.');
            }
            this.showToast('Datos locales sincronizados a la nube', 'success');
        } catch (e) {
            if (statusEl) {
                statusEl.style.background = 'rgba(239, 68, 68, 0.15)';
                statusEl.style.color = '#ef4444';
                statusEl.textContent = '✗ Error: ' + e.message;
            }
            this.showToast('Error de sincronización con la nube', 'error');
        }
    }

    async syncPullCloudToLocal() {
        const url = document.getElementById('cloud-url-input').value.trim();
        const statusEl = document.getElementById('cloud-test-status');
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = 'rgba(255,255,255,0.06)';
            statusEl.style.color = 'var(--text-secondary)';
            statusEl.textContent = 'Descargando datos desde la nube...';
        }

        try {
            const res = await window.appStorage.pullCloudToLocal(url);
            if (statusEl) {
                statusEl.style.background = 'rgba(16, 185, 129, 0.15)';
                statusEl.style.color = '#10b981';
                statusEl.textContent = '✓ ' + res.message;
            }
            this.showToast('Inventario local actualizado desde la nube', 'success');
            await this.loadDashboardData();
        } catch (e) {
            if (statusEl) {
                statusEl.style.background = 'rgba(239, 68, 68, 0.15)';
                statusEl.style.color = '#ef4444';
                statusEl.textContent = '✗ Error al descargar: ' + e.message;
            }
            this.showToast('Error al descargar de la nube', 'error');
        }
    }

    /* ==========================================================================
       UTILITIES & EVENT LISTENERS
       ========================================================================== */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'toast-error' : (type === 'success' ? 'toast-success' : '')}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}</span>
            <span>${this.escapeHtml(message)}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 250);
        }, 3600);
    }

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    escapeJs(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'");
    }

    bindEvents() {
        // Login submit
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));

        // Search debounce
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.loadEquipos(), 250);
        });

        // Filter dropdowns (if present)
        const fEstado = document.getElementById('filter-estado');
        if (fEstado) fEstado.addEventListener('change', () => this.loadEquipos());
        const fMarca = document.getElementById('filter-marca');
        if (fMarca) fMarca.addEventListener('change', () => this.loadEquipos());
        const fSort = document.getElementById('filter-sort');
        if (fSort) fSort.addEventListener('change', () => this.loadEquipos());

        // View toggles
        document.getElementById('view-grid-btn').addEventListener('click', () => {
            this.viewMode = 'grid';
            document.getElementById('view-grid-btn').classList.add('active');
            document.getElementById('view-table-btn').classList.remove('active');
            this.renderEquipos();
        });

        document.getElementById('view-table-btn').addEventListener('click', () => {
            this.viewMode = 'table';
            document.getElementById('view-table-btn').classList.add('active');
            document.getElementById('view-grid-btn').classList.remove('active');
            this.renderEquipos();
        });

        // New equipo button
        document.getElementById('open-new-equipo-btn').addEventListener('click', () => this.openNewEquipoModal());

        // Forms
        document.getElementById('equipo-form').addEventListener('submit', (e) => this.handleSaveEquipo(e));
        document.getElementById('mantencion-form').addEventListener('submit', (e) => this.handleSaveMaintenance(e));

        const userForm = document.getElementById('user-form');
        if (userForm) userForm.addEventListener('submit', (e) => this.handleSaveUser(e));

        const userRutInput = document.getElementById('user-form-rut');
        if (userRutInput) RutUtils.attachToInput(userRutInput);

        // Scanner file input
        const fileInput = document.getElementById('scanner-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    const code = await this.qrScanner.scanFile(e.target.files[0]);
                    if (code) this.handleQrDetected(code);
                }
            });
        }

        // Close scanner modal cleanup
        document.getElementById('qr-scanner-modal').addEventListener('click', (e) => {
            if (e.target.id === 'qr-scanner-modal') {
                this.closeQrScanner();
            }
        });

        // Close other modals on backdrop click
        ['qr-view-modal', 'equipo-detail-modal', 'equipo-form-modal', 'mantencion-modal', 'admin-users-modal', 'user-form-modal', 'cloud-modal'].forEach(id => {
            const m = document.getElementById(id);
            if (m) {
                m.addEventListener('click', (e) => {
                    if (e.target.id === id) this.closeModal(id);
                });
            }
        });

        // Close nav dropdown menu when clicking outside or pressing Escape
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('nav-dropdown-wrapper');
            if (wrapper && wrapper.classList.contains('active')) {
                if (!wrapper.contains(e.target)) {
                    this.closeNavMenu();
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeNavMenu();
            }
        });
    }

    /* ==========================================================================
       ACTUALIZACIONES AUTOMÁTICAS CON GITHUB (WEB & ANDROID APK)
       ========================================================================== */
    setupUpdateListeners() {
        this.onUpdateDownloadProgress = (percent, message) => {
            this.showToast(message || `Descargando actualización: ${percent}%`, 'info');
        };
        this.onUpdateDownloadError = (errorMsg) => {
            this.showToast(`Error al actualizar: ${errorMsg}`, 'error');
        };
        this.onUpdateAvailable = (info) => {
            console.log('⚡ Nueva actualización encontrada en GitHub:', info);
        };
    }

    async checkForUpdates(isManual = false) {
        // 1. Si estamos ejecutando dentro de la app nativa Android
        if (window.AndroidBridge && typeof window.AndroidBridge.checkAppUpdate === 'function') {
            window.AndroidBridge.checkAppUpdate();
            return;
        }

        // 2. Si estamos en navegador web
        try {
            if (isManual) {
                this.showToast('Comprobando actualizaciones en GitHub...', 'info');
            }
            const res = await fetch('https://api.github.com/repos/Patrox43-debug/Corrientes-Debiles/releases/latest', {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const remoteTag = (data.tag_name || '').trim().replace(/^[vV]/, '');
            const currentVer = (window.APP_VERSION || '1.0.11').replace(/^[vV]/, '');

            if (this.isNewerVersion(remoteTag, currentVer)) {
                let apkUrl = 'https://github.com/Patrox43-debug/Corrientes-Debiles/releases/latest/download/CDmantencion.apk';
                if (data.assets && data.assets.length > 0) {
                    const apkAsset = data.assets.find(a => a.name && a.name.endsWith('.apk'));
                    if (apkAsset) apkUrl = apkAsset.browser_download_url;
                }
                this.showToast(`⚡ Nueva versión v${remoteTag} disponible en GitHub.`, 'success');
                if (confirm(`Hay una nueva versión de CDmantencion (v${remoteTag}) en GitHub.\n\n¿Deseas descargar el APK actualizado ahora?`)) {
                    window.location.href = apkUrl;
                }
            } else if (isManual) {
                this.showToast(`CDmantencion está al día en la versión v${currentVer}.`, 'success');
            }
        } catch (e) {
            console.warn('Error al verificar en GitHub:', e);
            if (isManual) {
                this.showToast('No se pudo conectar con GitHub en este momento.', 'warning');
            }
        }
    }

    isNewerVersion(remote, current) {
        if (!remote || !current) return false;
        const rParts = remote.split('.').map(n => parseInt(n.replace(/\D/g, '') || '0', 10));
        const cParts = current.split('.').map(n => parseInt(n.replace(/\D/g, '') || '0', 10));
        const len = Math.max(rParts.length, cParts.length);
        for (let i = 0; i < len; i++) {
            const r = rParts[i] || 0;
            const c = cParts[i] || 0;
            if (r > c) return true;
            if (r < c) return false;
        }
        return false;
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
});
