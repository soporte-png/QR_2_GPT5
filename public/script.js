(() => {
  'use strict';

  const API_BASE = '';
  const PAGE_SIZE = 10;

  const elements = {};

  const state = {
    token: localStorage.getItem('authToken'),
    user: (() => {
      try {
        const stored = localStorage.getItem('authUser');
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.error('No se pudo leer el usuario almacenado:', error);
        return null;
      }
    })(),
    runtimeConfig: {
      gln_base: '0000000024602',
      company_name: 'NARANJO AZCARATE Y ASOCIADOS SAS',
      base_document: '0000000000',
      collection_account: '256940842',
      pdf_logo: '',
      app_logo: '',
      login_logo: '',
    },
    publicConfig: {
      company_name: '',
      app_logo: '',
      login_logo: '',
    },
    historial: [],
    paginaActual: 1,
    ultimoCodigo: null,
  };

  document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    attachEventHandlers();
    initializeView();
  });

  function cacheElements() {
    const ids = [
      'login-section',
      'main-section',
      'reportes-section',
      'config-section',
      'help-section',
      'form-section',
      'barcode-section',
      'login-username',
      'login-password',
      'login-button',
      'login-error',
      'login-username-error',
      'login-password-error',
      'logout-button',
      'logout-button-barcode',
      'logout-from-report',
      'logout-from-config',
      'help-logout',
      'generate-coupon',
      'download-pdf',
      'report-button',
      'report-button-barcode',
      'config-button',
      'config-button-barcode',
      'config-from-report',
      'help-button',
      'help-button-barcode',
      'help-from-report',
      'help-back',
      'help-config',
      'back-to-form',
      'back-to-main',
      'nombre',
      'cedula',
      'valor',
      'fecha',
      'nombre-error',
      'cedula-error',
      'valor-error',
      'fecha-error',
      'formatted-valor',
      'barcode-svg',
      'human-readable',
      'payload-text',
      'historial-list',
      'resumen-list',
      'pagination-controls',
      'pagination-info',
      'busqueda-nombre',
      'busqueda-cedula',
      'busqueda-usuario',
      'filtro-valor-min',
      'filtro-valor-max',
      'fecha-inicio',
      'fecha-fin',
      'hora-inicio',
      'hora-fin',
      'apply-filters',
      'clear-filters',
      'download-csv',
      'config-gln',
      'config-empresa',
      'config-documento',
      'config-cuenta-recaudo',
      'config-numero-acuerdo',
      'config-numero-obligacion',
      'save-general-config',
      'logo-empresa',
      'logo-preview',
      'save-logo-pdf',
      'config-logo-app',
      'app-logo-preview',
      'save-logo-app',
      'config-logo-login',
      'login-logo-preview',
      'save-logo-login',
      'password-actual',
      'password-nueva',
      'password-confirmar',
      'change-password',
      'app-logo',
      'login-logo',
    ];

    ids.forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function attachEventHandlers() {
    if (elements['login-button']) {
      elements['login-button'].addEventListener('click', login);
    }

    ['login-password', 'login-username'].forEach((id) => {
      const input = elements[id];
      if (input) {
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            login();
          }
        });
      }
    });

    const logoutButtons = [
      'logout-button',
      'logout-button-barcode',
      'logout-from-report',
      'logout-from-config',
      'help-logout',
    ];
    logoutButtons.forEach((id) => {
      if (elements[id]) {
        elements[id].addEventListener('click', logout);
      }
    });

    if (elements['generate-coupon']) {
      elements['generate-coupon'].addEventListener('click', generarCodigoBarras);
    }

    if (elements['download-pdf']) {
      elements['download-pdf'].addEventListener('click', generarPDF);
    }

    if (elements['report-button']) {
      elements['report-button'].addEventListener('click', mostrarReportes);
    }

    if (elements['report-button-barcode']) {
      elements['report-button-barcode'].addEventListener('click', mostrarReportes);
    }

    if (elements['config-button']) {
      elements['config-button'].addEventListener('click', mostrarConfig);
    }

    if (elements['config-button-barcode']) {
      elements['config-button-barcode'].addEventListener('click', mostrarConfig);
    }

    if (elements['config-from-report']) {
      elements['config-from-report'].addEventListener('click', mostrarConfig);
    }

    if (elements['help-button']) {
      elements['help-button'].addEventListener('click', mostrarAyuda);
    }

    if (elements['help-button-barcode']) {
      elements['help-button-barcode'].addEventListener('click', mostrarAyuda);
    }

    if (elements['help-from-report']) {
      elements['help-from-report'].addEventListener('click', mostrarAyuda);
    }

    if (elements['help-config']) {
      elements['help-config'].addEventListener('click', mostrarConfig);
    }

    if (elements['help-back']) {
      elements['help-back'].addEventListener('click', mostrarFormulario);
    }

    if (elements['back-to-form']) {
      elements['back-to-form'].addEventListener('click', volverAlFormulario);
    }

    if (elements['back-to-main']) {
      elements['back-to-main'].addEventListener('click', mostrarFormulario);
    }

    if (elements['apply-filters']) {
      elements['apply-filters'].addEventListener('click', aplicarFiltrosAvanzados);
    }

    if (elements['clear-filters']) {
      elements['clear-filters'].addEventListener('click', limpiarFiltros);
    }

    if (elements['download-csv']) {
      elements['download-csv'].addEventListener('click', descargarCSV);
    }

    if (elements['save-general-config']) {
      elements['save-general-config'].addEventListener('click', guardarConfiguracionGeneral);
    }

    if (elements['save-logo-pdf']) {
      elements['save-logo-pdf'].addEventListener('click', () => guardarLogo('pdf_logo', 'logo-empresa', 'logo-preview'));
    }

    if (elements['save-logo-app']) {
      elements['save-logo-app'].addEventListener('click', () => guardarLogo('app_logo', 'config-logo-app', 'app-logo-preview'));
    }

    if (elements['save-logo-login']) {
      elements['save-logo-login'].addEventListener('click', () => guardarLogo('login_logo', 'config-logo-login', 'login-logo-preview'));
    }

    if (elements['change-password']) {
      elements['change-password'].addEventListener('click', cambiarPassword);
    }

    if (elements['valor']) {
      elements['valor'].addEventListener('input', formatCurrencyPreview);
    }

    if (elements['cedula']) {
      elements['cedula'].addEventListener('input', limitarCedula);
    }
  }

  function initializeView() {
    showSection('login-section');
    updateLogoImages();
    loadPublicConfig();

    if (state.token && state.user) {
      refreshRuntimeConfig()
        .then(() => {
          mostrarFormulario();
          updateUIForRole();
        })
        .catch(() => {
          logout();
        });
    }
  }

  function showSection(sectionId) {
    ['login-section', 'main-section', 'reportes-section', 'config-section', 'help-section'].forEach((id) => {
      if (!elements[id]) return;
      elements[id].style.display = id === sectionId ? 'flex' : 'none';
    });

    if (sectionId === 'main-section') {
      if (elements['form-section']) {
        elements['form-section'].style.display = 'flex';
      }
      if (elements['barcode-section']) {
        elements['barcode-section'].style.display = 'none';
      }
    }
  }

  async function loadPublicConfig() {
    try {
      const response = await fetch(`${API_BASE}/api/config/public`);
      if (!response.ok) {
        throw new Error('Respuesta no válida');
      }
      const data = await response.json();
      state.publicConfig = data;
      updateLogoImages();
    } catch (error) {
      console.warn('No se pudo cargar la configuración pública:', error);
    }
  }

  function updateLogoImages() {
    const loginLogo = elements['login-logo'];
    const appLogo = elements['app-logo'];

    const loginSrc = state.runtimeConfig.login_logo || state.publicConfig.login_logo || '';
    const appSrc = state.runtimeConfig.app_logo || state.publicConfig.app_logo || '';

    if (loginLogo) {
      loginLogo.src = loginSrc || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    }

    if (appLogo) {
      appLogo.src = appSrc || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    }

    if (elements['app-logo-preview']) {
      elements['app-logo-preview'].src = state.runtimeConfig.app_logo || state.publicConfig.app_logo || '';
    }

    if (elements['login-logo-preview']) {
      elements['login-logo-preview'].src = state.runtimeConfig.login_logo || state.publicConfig.login_logo || '';
    }

    if (elements['logo-preview']) {
      elements['logo-preview'].src = state.runtimeConfig.pdf_logo || '';
    }
  }

  async function login() {
    const username = elements['login-username'].value.trim();
    const password = elements['login-password'].value;

    let isValid = true;
    if (!username) {
      elements['login-username-error'].style.display = 'block';
      isValid = false;
    } else {
      elements['login-username-error'].style.display = 'none';
    }

    if (!password) {
      elements['login-password-error'].style.display = 'block';
      isValid = false;
    } else {
      elements['login-password-error'].style.display = 'none';
    }

    if (!isValid) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Credenciales inválidas');
      }

      const data = await response.json();
      state.token = data.token;
      state.user = data.user;

      localStorage.setItem('authToken', state.token);
      localStorage.setItem('authUser', JSON.stringify(state.user));

      elements['login-error'].style.display = 'none';
      elements['login-username'].value = '';
      elements['login-password'].value = '';

      await refreshRuntimeConfig();
      updateUIForRole();
      mostrarFormulario();
      await cargarHistorial();
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      elements['login-error'].style.display = 'block';
      logout();
      showSection('login-section');
    }
  }

  function updateUIForRole() {
    const isAdmin = state.user && state.user.role === 'admin';
    const configButtons = ['config-button', 'config-button-barcode', 'config-from-report', 'help-config'];
    configButtons.forEach((id) => {
      if (elements[id]) {
        elements[id].style.display = isAdmin ? 'inline-flex' : 'none';
      }
    });

    if (!isAdmin && elements['config-section']) {
      elements['config-section'].style.display = 'none';
    }
  }

  async function refreshRuntimeConfig() {
    if (!state.token) {
      return;
    }

    try {
      const data = await apiFetch('/api/config/runtime');
      state.runtimeConfig = {
        ...state.runtimeConfig,
        ...data,
      };
      updateLogoImages();
    } catch (error) {
      console.error('No se pudo actualizar la configuración:', error);
      throw error;
    }
  }

  async function apiFetch(path, options = {}) {
    if (!state.token) {
      throw new Error('No hay token disponible.');
    }

    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE}${path}`, config);

    if (response.status === 401 || response.status === 403) {
      logout();
      throw new Error('Sesión expirada o sin permisos.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error en la solicitud');
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  function logout() {
    state.token = null;
    state.user = null;
    state.historial = [];
    state.paginaActual = 1;
    state.ultimoCodigo = null;
    state.runtimeConfig.app_logo = '';
    state.runtimeConfig.login_logo = '';
    state.runtimeConfig.pdf_logo = '';

    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');

    if (elements['login-username']) {
      elements['login-username'].value = '';
    }

    if (elements['login-password']) {
      elements['login-password'].value = '';
    }

    showSection('login-section');
    updateUIForRole();
    updateLogoImages();
  }

  function formatCurrencyPreview(event) {
    const { value } = event.target;
    if (!value || Number.isNaN(Number(value))) {
      elements['formatted-valor'].textContent = '';
      return;
    }

    const numero = parseInt(value, 10);
    elements['formatted-valor'].textContent = `Valor ingresado: $${numero.toLocaleString('es-CO')}`;
  }

  function limitarCedula(event) {
    if (event.target.value.length > 10) {
      event.target.value = event.target.value.slice(0, 10);
    }
  }

  function validarFormularioCupon() {
    const nombre = elements['nombre'].value.trim();
    const cedula = elements['cedula'].value.trim();
    const valor = elements['valor'].value.trim();
    const fecha = elements['fecha'].value;

    let isValid = true;

    if (!nombre) {
      elements['nombre-error'].style.display = 'block';
      isValid = false;
    } else {
      elements['nombre-error'].style.display = 'none';
    }

    if (!cedula || Number(cedula) <= 0 || cedula.length > 10) {
      elements['cedula-error'].style.display = 'block';
      isValid = false;
    } else {
      elements['cedula-error'].style.display = 'none';
    }

    if (!valor || Number(valor) <= 0) {
      elements['valor-error'].style.display = 'block';
      isValid = false;
    } else {
      elements['valor-error'].style.display = 'none';
    }

    if (!fecha) {
      elements['fecha-error'].style.display = 'block';
      isValid = false;
    } else {
      const fechaSeleccionada = new Date(fecha);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaSeleccionada < hoy) {
        elements['fecha-error'].style.display = 'block';
        isValid = false;
      } else {
        elements['fecha-error'].style.display = 'none';
      }
    }

    return isValid;
  }

  async function generarCodigoBarras() {
    if (!validarFormularioCupon()) {
      return;
    }

    const payload = {
      debtor_name: elements['nombre'].value.trim(),
      debtor_id: elements['cedula'].value.trim(),
      value: Number(elements['valor'].value),
      due_date: elements['fecha'].value,
    };

    try {
      const data = await apiFetch('/api/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      state.ultimoCodigo = {
        ...data,
      };

      renderBarcode(data.barcode);
      mostrarDatosCupon(payload, data);
      mostrarSeccionCodigoBarras();
      await cargarHistorial();
    } catch (error) {
      console.error('Error al generar el cupón:', error);
      alert('No se pudo generar el cupón. Verifique los datos e intente nuevamente.');
    }
  }

  function renderBarcode(barcode) {
    const svgContainer = elements['barcode-svg'];
    const humanReadableDiv = elements['human-readable'];
    const payloadSpan = elements['payload-text'];

    if (!svgContainer || !humanReadableDiv || !payloadSpan) {
      return;
    }

    svgContainer.innerHTML = '';
    humanReadableDiv.textContent = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100px');
    svg.setAttribute('viewBox', '0 0 600 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.backgroundColor = 'white';
    svgContainer.appendChild(svg);

    try {
      // eslint-disable-next-line no-undef
      JsBarcode(svg, barcode.payload, {
        format: 'CODE128',
        displayValue: false,
        fontSize: 12,
        height: 80,
        width: 2,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
      });
      humanReadableDiv.textContent = barcode.human_readable;
      payloadSpan.textContent = barcode.payload;
    } catch (error) {
      console.error('Error al dibujar el código de barras:', error);
      svgContainer.innerHTML = '<div style="color: red; padding: 10px;">Error al generar el código de barras.</div>';
    }
  }

  function mostrarDatosCupon(requestPayload, serverData) {
    const barcode = serverData.barcode;
    const config = serverData.config;

    state.runtimeConfig = {
      ...state.runtimeConfig,
      ...config,
    };

    updateLogoImages();

    state.ultimoCodigo = {
      ...state.ultimoCodigo,
      request: requestPayload,
      barcode,
      config,
      coupon: serverData.coupon,
    };
  }

  function mostrarSeccionCodigoBarras() {
    if (elements['form-section']) {
      elements['form-section'].style.display = 'none';
    }

    if (elements['barcode-section']) {
      elements['barcode-section'].style.display = 'flex';
    }
  }

  async function cargarHistorial(filtros = {}) {
    if (!state.token) {
      return;
    }

    const query = new URLSearchParams(filtros);
    const queryString = query.toString();

    try {
      const endpoint = queryString ? `/api/coupons?${queryString}` : '/api/coupons';
      const data = await apiFetch(endpoint);
      state.historial = data.coupons || [];
      state.paginaActual = 1;
      mostrarPaginaActual();
      cargarResumen();
    } catch (error) {
      console.error('Error al cargar el historial:', error);
      alert('No se pudo cargar el historial de cupones.');
    }
  }

  function mostrarPaginaActual() {
    const lista = elements['historial-list'];
    const info = elements['pagination-info'];

    if (!lista || !info) {
      return;
    }

    lista.innerHTML = '';
    const inicio = (state.paginaActual - 1) * PAGE_SIZE;
    const fin = Math.min(inicio + PAGE_SIZE, state.historial.length);

    if (!state.historial.length) {
      lista.innerHTML = '<li>No hay registros de cupones generados con los filtros aplicados</li>';
      info.textContent = 'Mostrando 0 de 0 registros';
      if (elements['pagination-controls']) {
        elements['pagination-controls'].innerHTML = '';
      }
      return;
    }

    for (let i = inicio; i < fin; i += 1) {
      const codigo = state.historial[i];
      const fechaGeneracion = new Date(codigo.created_at);
      const fechaFormateada = Number.isNaN(fechaGeneracion.getTime())
        ? codigo.created_at
        : fechaGeneracion.toLocaleString();
      const li = document.createElement('li');
      const valorFormateado = Number(codigo.value).toLocaleString('es-CO');
      li.innerHTML = `
        <strong>Nombre:</strong> ${codigo.debtor_name} -
        <strong>Cédula:</strong> ${codigo.debtor_id} -
        <strong>Valor:</strong> $${valorFormateado} -
        <strong>Fecha:</strong> ${codigo.due_date} -
        <strong>Fecha Generación:</strong> ${fechaFormateada} -
        <strong>Usuario:</strong> ${codigo.created_by_username || ''} -
        <strong>No. Obligación:</strong> ${codigo.obligation_number || ''}
      `;
      lista.appendChild(li);
    }

    info.textContent = `Mostrando ${inicio + 1} - ${fin} de ${state.historial.length} registros`;
    mostrarControlesPaginacion();
  }

  function mostrarControlesPaginacion() {
    const controles = elements['pagination-controls'];
    if (!controles) {
      return;
    }

    controles.innerHTML = '';

    if (!state.historial.length) {
      return;
    }

    const totalPaginas = Math.ceil(state.historial.length / PAGE_SIZE);

    const crearBoton = (texto, disabled, onClick) => {
      const btn = document.createElement('button');
      btn.textContent = texto;
      btn.disabled = disabled;
      btn.addEventListener('click', onClick);
      return btn;
    };

    controles.appendChild(
      crearBoton('< Anterior', state.paginaActual === 1, () => {
        if (state.paginaActual > 1) {
          state.paginaActual -= 1;
          mostrarPaginaActual();
        }
      })
    );

    const rango = 3;
    const inicio = Math.max(1, state.paginaActual - rango);
    const fin = Math.min(totalPaginas, state.paginaActual + rango);

    for (let i = inicio; i <= fin; i += 1) {
      const btn = crearBoton(String(i), i === state.paginaActual, () => {
        state.paginaActual = i;
        mostrarPaginaActual();
      });
      controles.appendChild(btn);
    }

    controles.appendChild(
      crearBoton('Siguiente >', state.paginaActual === totalPaginas, () => {
        if (state.paginaActual < totalPaginas) {
          state.paginaActual += 1;
          mostrarPaginaActual();
        }
      })
    );
  }

  function cargarResumen() {
    const lista = elements['resumen-list'];
    if (!lista) {
      return;
    }

    lista.innerHTML = '';

    if (!state.historial.length) {
      lista.innerHTML = '<li>No hay datos para calcular resumen con los filtros aplicados</li>';
      return;
    }

    const totalCupones = state.historial.length;
    const totalValor = state.historial.reduce((acc, cup) => acc + Number(cup.value || 0), 0);
    const usuarios = [...new Set(state.historial.map((cup) => cup.created_by_username || ''))].filter(Boolean);

    const totalLi = document.createElement('li');
    totalLi.innerHTML = `<i class="fas fa-barcode"></i> Total de cupones generados: <strong>${totalCupones}</strong>`;

    const valorLi = document.createElement('li');
    valorLi.innerHTML = `<i class="fas fa-dollar-sign"></i> Valor total de obligaciones: <strong>$${totalValor.toLocaleString('es-CO')}</strong>`;

    const usuariosLi = document.createElement('li');
    usuariosLi.innerHTML = `<i class="fas fa-users"></i> Usuarios que generaron cupones: <strong>${usuarios.join(', ')}</strong>`;

    lista.append(totalLi, valorLi, usuariosLi);
  }

  async function aplicarFiltrosAvanzados() {
    const filtros = {};

    const nombre = elements['busqueda-nombre'].value.trim();
    const cedula = elements['busqueda-cedula'].value.trim();
    const usuario = elements['busqueda-usuario'].value.trim();
    const valorMin = elements['filtro-valor-min'].value.trim();
    const valorMax = elements['filtro-valor-max'].value.trim();
    const fechaInicio = elements['fecha-inicio'].value;
    const fechaFin = elements['fecha-fin'].value;
    const horaInicio = elements['hora-inicio'].value || '00:00';
    const horaFin = elements['hora-fin'].value || '23:59';

    if (nombre) filtros.debtor_name = nombre;
    if (cedula) filtros.debtor_id = cedula;
    if (usuario) filtros.created_by_username = usuario;
    if (valorMin) filtros.value_min = valorMin;
    if (valorMax) filtros.value_max = valorMax;
    if (fechaInicio) filtros.created_from = `${fechaInicio}T${horaInicio}`;
    if (fechaFin) filtros.created_to = `${fechaFin}T${horaFin}`;

    await cargarHistorial(filtros);
  }

  async function limpiarFiltros() {
    ['busqueda-nombre', 'busqueda-cedula', 'busqueda-usuario', 'filtro-valor-min', 'filtro-valor-max', 'fecha-inicio', 'fecha-fin'].forEach((id) => {
      if (elements[id]) {
        elements[id].value = '';
      }
    });

    if (elements['hora-inicio']) {
      elements['hora-inicio'].value = '00:00';
    }

    if (elements['hora-fin']) {
      elements['hora-fin'].value = '23:59';
    }

    await cargarHistorial();
  }

  function descargarCSV() {
    if (!state.historial.length) {
      alert('No hay datos para descargar con los filtros aplicados');
      return;
    }

    let csvContent = 'Nombre,Cédula,Valor,Fecha,Obligación,Usuario,Fecha_Generación\n';

    state.historial.forEach((codigo) => {
      const fechaGeneracion = new Date(codigo.created_at);
      const fechaIso = Number.isNaN(fechaGeneracion.getTime())
        ? codigo.created_at
        : fechaGeneracion.toISOString().replace('T', ' ').substring(0, 19);

      csvContent += `"${codigo.debtor_name}","${codigo.debtor_id}","${codigo.value}","${codigo.due_date}","${codigo.obligation_number || ''}","${codigo.created_by_username || ''}","${fechaIso}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historial_cupones_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function mostrarReportes() {
    if (!state.token) {
      alert('Debe iniciar sesión para ver los reportes.');
      return;
    }

    showSection('reportes-section');
    cargarHistorial();
  }

  async function mostrarConfig() {
    if (!state.user || state.user.role !== 'admin') {
      alert('Solo los administradores pueden acceder a la configuración.');
      return;
    }

    try {
      const config = await apiFetch('/api/config');
      state.runtimeConfig = {
        ...state.runtimeConfig,
        ...config,
      };

      elements['config-gln'].value = state.runtimeConfig.gln_base || '';
      elements['config-empresa'].value = state.runtimeConfig.company_name || '';
      elements['config-documento'].value = state.runtimeConfig.base_document || '';
      elements['config-cuenta-recaudo'].value = state.runtimeConfig.collection_account || '';
      elements['config-numero-acuerdo'].value = state.runtimeConfig.agreement_sequence || '';
      elements['config-numero-obligacion'].value = state.runtimeConfig.obligation_sequence || '';

      updateLogoImages();
      showSection('config-section');
    } catch (error) {
      console.error('No se pudo cargar la configuración:', error);
      alert('No se pudo cargar la configuración.');
    }
  }

  function mostrarAyuda() {
    showSection('help-section');
  }

  function mostrarFormulario() {
    showSection('main-section');
    if (elements['form-section']) {
      elements['form-section'].style.display = 'flex';
    }
    if (elements['barcode-section']) {
      elements['barcode-section'].style.display = 'none';
    }
    resetFormulario();
  }

  function volverAlFormulario() {
    mostrarFormulario();
  }

  function resetFormulario() {
    ['nombre', 'cedula', 'valor', 'fecha'].forEach((id) => {
      if (elements[id]) {
        elements[id].value = '';
      }
    });

    if (elements['formatted-valor']) {
      elements['formatted-valor'].textContent = '';
    }

    ['nombre-error', 'cedula-error', 'valor-error', 'fecha-error'].forEach((id) => {
      if (elements[id]) {
        elements[id].style.display = 'none';
      }
    });
  }

  async function guardarConfiguracionGeneral() {
    if (!state.user || state.user.role !== 'admin') {
      alert('Solo los administradores pueden actualizar la configuración.');
      return;
    }

    const gln = elements['config-gln'].value.trim();
    const empresa = elements['config-empresa'].value.trim();
    const documento = elements['config-documento'].value.trim();
    const cuenta = elements['config-cuenta-recaudo'].value.trim();
    const acuerdo = elements['config-numero-acuerdo'].value.trim();
    const obligacion = elements['config-numero-obligacion'].value.trim();

    if (gln.length !== 13) {
      alert('El GLN debe tener 13 dígitos.');
      return;
    }

    if (documento.length !== 10) {
      alert('El documento base debe tener 10 dígitos.');
      return;
    }

    if (!cuenta) {
      alert('La cuenta de recaudo es requerida.');
      return;
    }

    try {
      const data = await apiFetch('/api/config', {
        method: 'POST',
        body: JSON.stringify({
          gln_base: gln,
          company_name: empresa,
          base_document: documento,
          collection_account: cuenta,
          agreement_sequence: acuerdo,
          obligation_sequence: obligacion,
        }),
      });

      state.runtimeConfig = {
        ...state.runtimeConfig,
        ...data.config,
      };

      updateLogoImages();
      alert('Configuración actualizada exitosamente.');
    } catch (error) {
      console.error('No se pudo guardar la configuración:', error);
      alert('No se pudo guardar la configuración.');
    }
  }

  async function guardarLogo(key, inputId, previewId) {
    if (!state.user || state.user.role !== 'admin') {
      alert('Solo los administradores pueden actualizar los logos.');
      return;
    }

    const input = elements[inputId];
    if (!input || !input.files || !input.files.length) {
      alert('Seleccione un archivo de imagen.');
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64 = event.target.result;
      try {
        const data = await apiFetch('/api/config', {
          method: 'POST',
          body: JSON.stringify({ [key]: base64 }),
        });

        state.runtimeConfig = {
          ...state.runtimeConfig,
          ...data.config,
        };

        if (elements[previewId]) {
          elements[previewId].src = base64;
        }

        updateLogoImages();
        alert('Logo actualizado correctamente.');
      } catch (error) {
        console.error('No se pudo guardar el logo:', error);
        alert('No se pudo guardar el logo.');
      }
    };

    reader.onerror = () => {
      alert('No se pudo leer el archivo de imagen.');
    };

    reader.readAsDataURL(file);
  }

  async function cambiarPassword() {
    const actual = elements['password-actual'].value;
    const nueva = elements['password-nueva'].value;
    const confirmar = elements['password-confirmar'].value;

    if (!actual || !nueva || !confirmar) {
      alert('Complete todos los campos para cambiar la contraseña.');
      return;
    }

    if (nueva !== confirmar) {
      alert('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    try {
      await apiFetch('/api/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: actual, newPassword: nueva }),
      });

      alert('Contraseña actualizada exitosamente.');
      elements['password-actual'].value = '';
      elements['password-nueva'].value = '';
      elements['password-confirmar'].value = '';
    } catch (error) {
      console.error('No se pudo cambiar la contraseña:', error);
      alert('No se pudo cambiar la contraseña. Verifique la información proporcionada.');
    }
  }

  function generarPDF() {
    if (!state.ultimoCodigo) {
      alert('Genere un cupón antes de descargar el PDF.');
      return;
    }

    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      alert('La librería jsPDF no está disponible.');
      return;
    }

    const { request, barcode, config, coupon } = state.ultimoCodigo;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let yPos = 20;
    const contentWidth = pageWidth - 2 * margin;

    if (config.pdf_logo) {
      try {
        doc.addImage(config.pdf_logo, 'PNG', margin, yPos, 40, 20);
        yPos += 25;
      } catch (error) {
        console.warn('No se pudo agregar el logo al PDF:', error);
      }
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(config.company_name || state.runtimeConfig.company_name || '', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text('RECUPERACIÓN CARTERA CASTIGADA', margin, yPos);
    yPos += 10;

    const drawTable = (y, headers, values) => {
      const headerHeight = 10;
      const rowHeight = 15;
      const padding = 1;
      const columnWidths = [
        contentWidth * 0.18,
        contentWidth * 0.32,
        contentWidth * 0.15,
        contentWidth * 0.15,
        contentWidth * 0.1,
        contentWidth * 0.1,
      ];

      doc.rect(margin, y, contentWidth, headerHeight + rowHeight);

      let xCursor = margin;
      columnWidths.forEach((width) => {
        xCursor += width;
        doc.line(xCursor, y, xCursor, y + headerHeight + rowHeight);
      });

      doc.line(margin, y + headerHeight, margin + contentWidth, y + headerHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      let xText = margin;
      headers.forEach((header, index) => {
        const textLines = doc.splitTextToSize(header, columnWidths[index] - padding * 2);
        doc.text(textLines, xText + padding, y + headerHeight / 2 + 3);
        xText += columnWidths[index];
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      xText = margin;
      values.forEach((value, index) => {
        const textLines = doc.splitTextToSize(String(value), columnWidths[index] - padding * 2);
        doc.text(textLines, xText + padding, y + headerHeight + rowHeight / 2 + 3);
        xText += columnWidths[index];
      });

      return y + headerHeight + rowHeight;
    };

    const valorPesos = Number(request.value).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    });

    yPos = drawTable(
      yPos,
      ['Identificación', 'Nombre del Deudor', 'No. de Acuerdo', 'No. de Negociación', 'Fecha de Impresión', 'Cuenta de Recaudo'],
      [
        barcode.debtor_id,
        request.debtor_name,
        coupon.agreement_number || '',
        coupon.agreement_number || '',
        new Date().toLocaleString(),
        config.collection_account || state.runtimeConfig.collection_account || '',
      ]
    );

    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Detalle del Pago', margin + 5, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Valor de la Obligación: ${valorPesos}`, margin + 5, yPos);
    yPos += 5;
    doc.text('Valor Honorarios: $0', margin + 5, yPos);
    yPos += 5;
    doc.text(`Fecha del Acuerdo: ${request.due_date}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`Valor Total: ${valorPesos}`, margin + 5, yPos);
    yPos += 10;

    const addBarcodeToPdf = (y) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 50;
      // eslint-disable-next-line no-undef
      JsBarcode(canvas, barcode.payload, {
        format: 'CODE128',
        displayValue: false,
        fontSize: 12,
        height: 40,
        width: 1.5,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000',
      });
      const img = canvas.toDataURL('image/png');
      doc.addImage(img, 'PNG', margin, y, 180, 20);
      doc.setFontSize(9);
      doc.text(barcode.human_readable, margin + 5, y + 25);
      return y + 35;
    };

    yPos = addBarcodeToPdf(yPos);
    doc.line(margin, yPos, margin + contentWidth, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'italic');
    doc.text('Desprendible para el cliente', margin + contentWidth / 2 - 30, yPos);
    yPos += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RECUPERACIÓN CARTERA CASTIGADA', margin, yPos);
    yPos += 10;

    yPos = drawTable(
      yPos,
      ['Identificación', 'Nombre del Deudor', 'No. de Acuerdo', 'Fecha de Acuerdo', 'Valor a Pagar', 'Cuenta de Recaudo'],
      [
        barcode.debtor_id,
        request.debtor_name,
        coupon.agreement_number || '',
        request.due_date,
        valorPesos,
        config.collection_account || state.runtimeConfig.collection_account || '',
      ]
    );

    yPos += 10;
    yPos = addBarcodeToPdf(yPos);
    doc.line(margin, yPos, margin + contentWidth, yPos);
    yPos += 10;
    doc.text('Desprendible para el banco', margin + contentWidth / 2 - 30, yPos);
    yPos += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RECUPERACIÓN CARTERA CASTIGADA', margin, yPos);
    yPos += 10;

    yPos = drawTable(
      yPos,
      ['Identificación', 'Nombre del Deudor', 'No. de Acuerdo', 'Fecha de Acuerdo', 'Valor a Pagar', 'Cuenta de Honorarios'],
      [barcode.debtor_id, request.debtor_name, coupon.agreement_number || '', request.due_date, '$0', '039925961']
    );

    yPos += 10;
    yPos = addBarcodeToPdf(yPos);
    doc.line(margin, yPos, margin + contentWidth, yPos);
    yPos += 10;
    doc.text('Desprendible para el banco', margin + contentWidth / 2 - 30, yPos);

    const nombreArchivo = `cupon_pago_${sanitizeFilename(request.debtor_name)}_${barcode.debtor_id}_${request.value}_${request.due_date}.pdf`;
    doc.save(nombreArchivo);
  }

  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_');
  }
})();
