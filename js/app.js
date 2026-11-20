

async function registerRoute() {

  // Obtener elementos del formulario
  const fullName = document.getElementById('register-full-name').value.trim();
  const email = document.getElementById('register-email').value.trim().toLowerCase();
  const password = document.getElementById('register-password').value;
  const phone = document.getElementById('register-phone').value.trim();
  const municipality = document.getElementById('register-municipality').value.trim();
  const department = document.getElementById('register-department').value.trim();

  const message = document.getElementById('register-message');
  const button = document.getElementById('btn-register-type');

  // Determinar el tipo de usuario
  const role = document.getElementById('chip-prod').classList.contains('active')
    ? 'producer'
    : 'consumer';

  // Validar campos obligatorios
  if (!fullName || !email || !password || !municipality || !department) {
    message.textContent = 'Por favor completa todos los campos obligatorios.';
    return;
  }

  // Validar correo
  if (!document.getElementById('register-email').validity.valid) {
    message.textContent = 'Ingresa un correo electrónico válido.';
    return;
  }

  // Validar contraseña
  if (password.length < 8) {
    message.textContent = 'La contraseña debe tener mínimo 8 caracteres.';
    return;
  }

  // Verificar conexión con Supabase
  if (!window.agrolinkSupabase) {
    message.textContent = 'No se pudo conectar con el servidor. Intenta nuevamente.';
    return;
  }

  // Evitar envíos repetidos
  button.disabled = true;
  button.textContent = 'CREANDO CUENTA...';
  message.textContent = 'Estamos registrando tus datos...';

  try {

    // Crear usuario en Supabase Auth
    const { data, error } = await window.agrolinkSupabase.auth.signUp({
      email: email,
      password: password,

      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          role: role,
          municipality: municipality,
          department: department
        }
      }
    });

    if (error) {
      throw error;
    }

    // Confirmar creación de cuenta
    if (!data.user) {
      throw new Error('No se recibió confirmación de creación de usuario.');
    }

    // Limpiar contraseña
    document.getElementById('register-password').value = '';

    // Mostrar resultado
    if (data.session) {
      message.textContent =
        '¡Cuenta creada correctamente! Ya puedes ingresar a AGROLINK.';
    } else {
      message.textContent =
        '¡Registro exitoso! Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.';
    }

  } catch (error) {

    console.error('Error en el registro:', error);

    if (/already registered|already exists/i.test(error.message)) {
      message.textContent = 'Este correo electrónico ya está registrado.';
    } else if (/password/i.test(error.message)) {
      message.textContent = 'Revisa la contraseña. No cumple los requisitos.';
    } else {
      message.textContent =
        'No fue posible crear la cuenta. Detalle: ' + error.message;
    }

  } finally {

    button.disabled = false;
    button.textContent = 'CREAR CUENTA';

  }
}


async function loginRoute() {

  // Obtener datos del formulario
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  const message = document.getElementById('login-message');
  const button = document.getElementById('btn-login');

  // Validar campos
  if (!email || !password) {
    message.textContent = 'Ingresa tu correo electrónico y contraseña.';
    return;
  }

  // Validar formato del correo
  if (!document.getElementById('login-email').validity.valid) {
    message.textContent = 'Ingresa un correo electrónico válido.';
    return;
  }

  // Verificar conexión
  if (!window.agrolinkSupabase) {
    message.textContent = 'No hay conexión con Supabase.';
    return;
  }

  // Deshabilitar botón durante el proceso
  button.disabled = true;
  button.textContent = 'INGRESANDO...';
  message.textContent = 'Verificando tus credenciales...';

  try {

    // 1. Autenticar usuario con Supabase
    const { data, error } =
      await window.agrolinkSupabase.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      throw error;
    }

    // 2. Consultar perfil del usuario
    const { data: profile, error: profileError } =
      await window.agrolinkSupabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', data.user.id)
        .single();

    if (profileError || !profile) {
      await window.agrolinkSupabase.auth.signOut();

      throw new Error(
        'No encontramos un perfil válido para esta cuenta.'
      );
    }

    // 3. Identificar el tipo de usuario
    if (profile.role === 'producer') {

      message.textContent = 'Bienvenido a AGROLINK, productor.';

      // 4. Ir al panel del productor
      go('s-producer-home');

    } else if (profile.role === 'consumer') {

      message.textContent = 'Bienvenido a AGROLINK.';

      // 4. Ir al catálogo del consumidor
      go('s-home');

    } else {

      await window.agrolinkSupabase.auth.signOut();

      throw new Error('El tipo de usuario no es válido.');

    }

    // Limpiar contraseña
    document.getElementById('login-password').value = '';

  } catch (error) {

    console.error('Error en el inicio de sesión:', error);

    const errorMessage = (error.message || '').toLowerCase();

    if (errorMessage.includes('email not confirmed')) {
      message.textContent =
        'Debes confirmar tu correo electrónico antes de ingresar.';

    } else if (
      errorMessage.includes('invalid login credentials')
    ) {
      message.textContent =
        'Correo electrónico o contraseña incorrectos.';

    } else {
      message.textContent =
        'No fue posible iniciar sesión: ' + error.message;
    }

  } finally {

    button.disabled = false;
    button.textContent = 'INICIAR SESIÓN';

  }
}




// ==========================================
// AGROLINK - CERRAR SESION
// ==========================================

async function logoutRoute() {

  const button = document.querySelector(
    '.screen.active [data-logout-button]'
  );

  const originalText = button
    ? button.textContent
    : '↪ Salir';

  try {

    if (button) {
      button.disabled = true;
      button.textContent = 'SALIENDO...';
    }

    const db = window.agrolinkSupabase;

    if (!db) {
      throw new Error('No hay conexión con Supabase.');
    }

    const { error } = await db.auth.signOut();

    if (error) {
      throw error;
    }

    go('s-splash');

  } catch (error) {

    console.error('Error al cerrar sesión:', error);

    alert('No fue posible cerrar la sesión. Intenta nuevamente.');

  } finally {

    if (button && button.isConnected) {
      button.disabled = false;
      button.textContent = originalText;
    }

  }
}




// AGROLINK - RECUPERAR SESION DEL USUARIO


async function restoreSession() {

  try {

    // Consultar la sesión almacenada
    const { data, error } =
      await window.agrolinkSupabase.auth.getSession();

    if (error) {
      throw error;
    }

    // Si no existe sesión, mantener pantalla inicial
    if (!data.session) {
      return;
    }

    // Consultar el perfil del usuario
    const { data: profile, error: profileError } =
      await window.agrolinkSupabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

    if (profileError || !profile) {
      console.error('No se pudo recuperar el perfil:', profileError);
      await window.agrolinkSupabase.auth.signOut();
      return;
    }

    // Redirigir según el rol
    if (profile.role === 'producer') {

      go('s-producer-home');

    } else if (profile.role === 'consumer') {

      go('s-home');

    } else {

      await window.agrolinkSupabase.auth.signOut();

    }

  } catch (error) {

    console.error('Error al recuperar la sesión:', error);

  }

}

// Ejecutar al cargar AGROLINK
restoreSession();



// AGROLINK - PUBLICAR PRODUCTO


async function publishProduct() {

  const db = window.agrolinkSupabase;

  const name = document.getElementById('product-name').value.trim();
  const category = document.getElementById('product-category').value;
  const description = document.getElementById('product-description').value.trim();
  const priceValue = document.getElementById('product-price').value;
  const unit = document.getElementById('product-unit').value;
  const stockValue = document.getElementById('product-stock').value;

  const availableChecked =
    document.getElementById('product-available').checked;

  const message = document.getElementById('product-message');
  const button = document.getElementById('btn-publish-product');

  const price = Number(priceValue);
  const stock = Number(stockValue);

  // Validar información
  if (!name || !category || !priceValue || !unit || stockValue === '') {
    message.textContent = 'Completa todos los campos obligatorios.';
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    message.textContent = 'Ingresa un precio mayor que cero.';
    return;
  }

  if (!Number.isInteger(stock) || stock < 0) {
    message.textContent = 'La cantidad debe ser un número entero no negativo.';
    return;
  }

  if (!db) {
    message.textContent = 'No hay conexión con Supabase.';
    return;
  }

  button.disabled = true;
  button.textContent = 'PUBLICANDO...';
  message.textContent = 'Guardando producto...';

  try {

    // Obtener usuario autenticado
    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión para publicar productos.');
    }

    const user = userData.user;

    // Verificar que sea productor
    const { data: profile, error: profileError } =
      await db
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || profile?.role !== 'producer') {
      throw new Error('Solo los productores pueden publicar productos.');
    }

    // Registrar producto en PostgreSQL
    const { error } = await db
      .from('products')
      .insert({
        producer_id: user.id,
        name: name,
        category: category,
        description: description,
        price: price,
        unit: unit,
        stock_quantity: stock,
        available: availableChecked && stock > 0,
        status: 'published'
      });

    if (error) {
      throw error;
    }

    message.textContent =
      '¡Producto publicado correctamente en AGROLINK!';

    // Limpiar formulario
    document.getElementById('product-name').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-unit').value = '';
    document.getElementById('product-stock').value = '';
    document.getElementById('product-available').checked = true;

  } catch (error) {

    console.error('Error al publicar producto:', error);

    message.textContent =
      'No fue posible publicar el producto: ' + error.message;

  } finally {

    button.disabled = false;
    button.textContent = 'PUBLICAR PRODUCTO';

  }
}


// AGROLINK - CONSULTAR MIS PRODUCTOS

function escapeProductHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}


async function loadMyProducts() {

  const db = window.agrolinkSupabase;

  const list = document.getElementById('my-products-list');
  const count = document.getElementById('my-products-count');
  const message = document.getElementById('my-products-message');

  if (!db || !list || !count || !message) return;

  message.textContent = 'Consultando productos...';
  list.innerHTML = '';

  try {

    // Obtener usuario autenticado
    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión para consultar tus productos.');
    }

    const user = userData.user;

    // Consultar exclusivamente los productos del productor
    const { data: products, error } = await db
      .from('products')
      .select(`
        id,
        name,
        category,
        price,
        unit,
        stock_quantity,
        available,
        status
      `)
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    count.textContent = products.length;

    if (products.length === 0) {

      message.textContent = 'Todavía no tienes productos registrados.';

      return;
    }

    message.textContent = 'Productos consultados correctamente.';

    // Construir tarjetas dinámicas
    list.innerHTML = products.map(product => {

      const price = Number(product.price).toLocaleString('es-CO');

      let state;
      let stateColor;

      if (product.status !== 'published') {
        state = 'Borrador';
        stateColor = '#fff3cd';
      } else if (product.stock_quantity <= 0) {
        state = 'Agotado';
        stateColor = '#f8d7da';
      } else if (product.available) {
        state = 'Disponible';
        stateColor = '#d4edda';
      } else {
        state = 'Pausado';
        stateColor = '#fff3cd';
      }

      const actionLabel =
        product.stock_quantity <= 0
          ? 'Sin existencias'
          : product.status !== 'published'
            ? '▶ Publicar'
            : product.available
              ? '⏸ Pausar'
              : '▶ Activar';

      const disabled = product.stock_quantity <= 0
        ? 'disabled'
        : '';

      return `
        <div class="wire-card">

          <div class="row-between mb-8">

            <div class="row">

              <div class="wire-img"
                style="width:48px;height:48px;flex-shrink:0;">
                📦
              </div>

              <div style="margin-left:10px;">

                <div class="text-bold">
                  ${escapeProductHTML(product.name)}
                </div>

                <div class="text-sm">
                  ${escapeProductHTML(product.category)}
                </div>

                <div class="text-sm">
                  $${price}/${escapeProductHTML(product.unit)}
                </div>

                <div class="text-sm">
                  Stock: ${product.stock_quantity}
                  ${escapeProductHTML(product.unit)}
                </div>

              </div>

            </div>

            <span class="wire-tag"
              style="background:${stateColor};">
              ${state}
            </span>

          </div>

          <div class="row" style="gap:8px;">

            
<div class="row" style="gap:8px;">

  <button
    class="wire-btn wire-btn-outline wire-btn-sm"
    data-product-action="edit"
    data-product-id="${escapeProductHTML(product.id)}">
    ✏️ Editar
  </button>

  <button
    class="wire-btn wire-btn-outline wire-btn-sm"
    data-product-action="toggle"
    data-product-id="${escapeProductHTML(product.id)}"
    data-available="${product.available}"
    data-stock="${product.stock_quantity}"
    data-status="${escapeProductHTML(product.status)}"
    ${disabled}>
    ${actionLabel}
  </button>

  <button
    class="wire-btn wire-btn-outline wire-btn-sm"
    data-product-action="delete"
    data-product-id="${escapeProductHTML(product.id)}"
    style="color:#c00;border-color:#c00;">
    🗑 Eliminar
  </button>

</div>


        </div>
      `;

    }).join('');

  } catch (error) {

    console.error('Error consultando productos:', error);

    message.textContent =
      'No fue posible consultar los productos: ' + error.message;

  }

  // Acciones de cada producto
  list.onclick = async function(event) {

    const button = event.target.closest('[data-product-action]');

    if (!button) return;

    const action = button.dataset.productAction;
    const productId = button.dataset.productId;

    if (action === 'toggle') {

      await toggleProduct(productId, button);

    }

    if (action === 'edit') {

  await openEditProduct(productId);

}

    if (action === 'delete') {

      await deleteProduct(productId, button);

    }

  };

}


// AGROLINK - PAUSAR O ACTIVAR PRODUCTO

async function toggleProduct(productId, button) {

  const db = window.agrolinkSupabase;

  const currentAvailable = button.dataset.available === 'true';
  const stock = Number(button.dataset.stock);
  const currentStatus = button.dataset.status;

  const nextAvailable = currentStatus === 'draft'
    ? true
    : !currentAvailable;

  if (nextAvailable && stock <= 0) {
    alert('No puedes activar un producto sin existencias.');
    return;
  }

  try {

    button.disabled = true;

    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('No hay un usuario autenticado.');
    }

    const { data, error } = await db
      .from('products')
      .update({
        available: nextAvailable,
        status: currentStatus === 'draft'
          ? 'published'
          : currentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .eq('producer_id', userData.user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error('No se encontró el producto autorizado para modificar.');
    }

    await loadMyProducts();

  } catch (error) {

    console.error('Error actualizando producto:', error);

    alert('No fue posible actualizar el producto: ' + error.message);

    button.disabled = false;

  }

}



// AGROLINK - ELIMINAR PRODUCTO


async function deleteProduct(productId, button) {

  const confirmed = confirm(
    '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.'
  );

  if (!confirmed) return;

  const db = window.agrolinkSupabase;

  try {

    button.disabled = true;

    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('No hay un usuario autenticado.');
    }

    const { data, error } = await db
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('producer_id', userData.user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error('No se encontró el producto autorizado para eliminar.');
    }

    await loadMyProducts();

  } catch (error) {

    console.error('Error eliminando producto:', error);

    alert('No fue posible eliminar el producto: ' + error.message);

    button.disabled = false;

  }

}


// AGROLINK - CARGAR PRODUCTO PARA EDICION

async function openEditProduct(productId) {

  const db = window.agrolinkSupabase;

  const message = document.getElementById('edit-product-message');
  const button = document.getElementById('btn-save-product');

  go('s-edit-product');

  message.textContent = 'Consultando información del producto...';
  button.disabled = true;

  try {

    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión.');
    }

    const { data: product, error } = await db
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('producer_id', userData.user.id)
      .single();

    if (error) throw error;

    // Guardar el identificador del producto seleccionado
    window.agrolinkEditingProductId = product.id;

    // Cargar datos actuales
    document.getElementById('edit-product-title').textContent =
      'Editar: ' + product.name;

    document.getElementById('edit-product-name').value =
      product.name;

    document.getElementById('edit-product-category').value =
      product.category;

    document.getElementById('edit-product-price').value =
      product.price;

    document.getElementById('edit-product-unit').value =
      product.unit;

    document.getElementById('edit-product-stock').value =
      product.stock_quantity;

    document.getElementById('edit-product-description').value =
      product.description || '';

    document.getElementById('edit-product-available').checked =
      product.available;

    message.textContent =
      'Información del producto cargada correctamente.';

  } catch (error) {

    console.error('Error cargando producto:', error);

    message.textContent =
      'No fue posible cargar el producto: ' + error.message;

  } finally {

    button.disabled = false;

  }

}


// AGROLINK - ACTUALIZAR PRODUCTO

async function updateProduct() {

  const db = window.agrolinkSupabase;

  const message = document.getElementById('edit-product-message');
  const button = document.getElementById('btn-save-product');

  const productId = window.agrolinkEditingProductId;

  const name =
    document.getElementById('edit-product-name').value.trim();

  const category =
    document.getElementById('edit-product-category').value;

  const description =
    document.getElementById('edit-product-description').value.trim();

  const priceValue =
    document.getElementById('edit-product-price').value;

  const unit =
    document.getElementById('edit-product-unit').value;

  const stockValue =
    document.getElementById('edit-product-stock').value;

  const available =
    document.getElementById('edit-product-available').checked;

  const price = Number(priceValue);
  const stock = Number(stockValue);

  // Validaciones
  if (!productId) {
    message.textContent = 'No se ha seleccionado ningún producto.';
    return;
  }

  if (!name || !category || !priceValue || !unit || stockValue === '') {
    message.textContent = 'Completa todos los campos obligatorios.';
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    message.textContent = 'El precio debe ser mayor que cero.';
    return;
  }

  if (!Number.isInteger(stock) || stock < 0) {
    message.textContent = 'El stock debe ser un entero no negativo.';
    return;
  }

  if (available && stock === 0) {
    message.textContent =
      'Para marcar el producto como disponible, registra existencias mayores que cero.';
    return;
  }

  button.disabled = true;
  button.textContent = 'GUARDANDO...';

  try {

    // Verificar usuario autenticado
    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión.');
    }

    const user = userData.user;

    // Verificar rol
    const { data: profile, error: profileError } =
      await db
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || profile.role !== 'producer') {
      throw new Error('Solo los productores pueden editar productos.');
    }

    // Actualizar producto propio
    const { data, error } = await db
      .from('products')
      .update({
        name: name,
        category: category,
        description: description,
        price: price,
        unit: unit,
        stock_quantity: stock,
        available: available,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .eq('producer_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error('No se pudo actualizar el producto autorizado.');
    }

    alert('¡Producto actualizado correctamente!');

    // Regresar a Mis Productos
    go('s-my-products');

  } catch (error) {

    console.error('Error actualizando producto:', error);

    message.textContent =
      'No fue posible guardar los cambios: ' + error.message;

  } finally {

    button.disabled = false;
    button.textContent = '💾 GUARDAR CAMBIOS';

  }

}


// AGROLINK - CATALOGO DE PRODUCTOS

window.agrolinkCatalogProducts = [];
window.agrolinkCatalogCategory = 'Todos';


// CONSULTAR PRODUCTOS PUBLICADOS


// AGROLINK - CATALOGO DE PRODUCTOS

async function loadCatalog() {

  const db = window.agrolinkSupabase;

  const message = document.getElementById('catalog-message');
  const container = document.getElementById('catalog-products');

  if (!db || !message || !container) return;

  message.textContent = 'Consultando productos disponibles...';
  container.innerHTML = '';

  try {

    // 1. Consultar productos publicados
    const { data: products, error } = await db
      .from('products')
      .select(`
        id,
        producer_id,
        name,
        category,
        description,
        price,
        unit,
        stock_quantity,
        available
      `)
      .eq('status', 'published')
      .eq('available', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. Obtener identificadores de productores
    const producerIds = [
      ...new Set(
        (products || [])
          .map(product => product.producer_id)
          .filter(Boolean)
      )
    ];

    // 3. Consultar la vista pública de productores
    let profiles = [];

    if (producerIds.length > 0) {

      const { data: profileData, error: profileError } = await db
        .from('producer_public_profiles')
        .select('id, full_name, municipality, department')
        .in('id', producerIds);

      if (profileError) throw profileError;

      profiles = profileData || [];

    }

    // 4. Relacionar productos con sus productores
    const profilesById = Object.fromEntries(
      profiles.map(profile => [profile.id, profile])
    );

    window.agrolinkCatalogProducts = (products || []).map(product => ({
      ...product,
      producer: profilesById[product.producer_id] || null
    }));

    // 5. Mostrar catálogo
    filterCatalog();

  } catch (error) {

    console.error('Error cargando catálogo:', error);

    message.textContent =
      'No fue posible consultar el catálogo: ' + error.message;

  }

}


// FILTRAR PRODUCTOS POR NOMBRE Y CATEGORÍA
function filterCatalog() {

  const searchInput = document.getElementById('catalog-search');
  const container = document.getElementById('catalog-products');
  const message = document.getElementById('catalog-message');
  const count = document.getElementById('catalog-count');

  if (!searchInput || !container || !message || !count) return;

  const search = searchInput.value.trim().toLocaleLowerCase('es-CO');

  const category = window.agrolinkCatalogCategory;

  const filtered = window.agrolinkCatalogProducts.filter(product => {

    const producer = product.producer || {};

    const text = [
      product.name,
      product.category,
      product.description,
      producer.full_name,
      producer.municipality,
      producer.department
    ].filter(Boolean).join(' ').toLocaleLowerCase('es-CO');

    const matchesSearch = text.includes(search);

    const matchesCategory =
      category === 'Todos' || product.category === category;

    return matchesSearch && matchesCategory;

  });

  count.textContent = filtered.length;

  if (filtered.length === 0) {

    container.innerHTML = '';

    message.textContent =
      window.agrolinkCatalogProducts.length === 0
        ? 'Todavía no hay productos disponibles en AGROLINK.'
        : 'No se encontraron productos con esos criterios.';

    return;
  }

  message.textContent =
    'Productos consultados correctamente.';

  renderCatalogProducts(filtered);

}


// CAMBIAR CATEGORÍA
function setCatalogCategory(category) {

  window.agrolinkCatalogCategory = category;

  document.querySelectorAll(
    '#s-home .chip[data-category]'
  ).forEach(chip => {

    chip.classList.toggle(
      'active',
      chip.dataset.category === category
    );

  });

  filterCatalog();

}


// MOSTRAR TARJETAS DE PRODUCTOS
function renderCatalogProducts(products) {

  const container = document.getElementById('catalog-products');

  const icons = {
    'Frutas': '🍎',
    'Verduras': '🥬',
    'Tubérculos': '🥔',
    'Lácteos': '🧀',
    'Carnes': '🥩',
    'Granos': '🌾',
    'Pescados': '🐟',
    'Otros': '📦'
  };

  container.innerHTML = products.map(product => {

    const producer = product.producer || {};

    const price = Number(product.price).toLocaleString('es-CO');

    const location = [
      producer.municipality,
      producer.department
    ].filter(Boolean).join(', ');

    const producerName =
      producer.full_name || 'Productor AGROLINK';

    return `

      <div class="product-card" onclick="openProductDetail('${product.id}')">

        <div class="product-card-img">
          ${icons[product.category] || '📦'}
        </div>

        <div class="product-card-body">

          <div class="product-name">
            ${escapeProductHTML(product.name)}
          </div>

          <div class="text-sm">
            ${escapeProductHTML(product.category)}
          </div>

          <div class="product-price">
            $${price}/${escapeProductHTML(product.unit)}
          </div>

          <div class="product-producer">
            🌾 ${escapeProductHTML(producerName)}
          </div>

          <div class="text-sm">
            📍 ${escapeProductHTML(location || 'Ubicación no registrada')}
          </div>

          <div class="text-sm">
            Disponibles: ${product.stock_quantity}
            ${escapeProductHTML(product.unit)}
          </div>

        </div>

      </div>

    `;

  }).join('');

}


// AGROLINK - DETALLE DINAMICO DEL PRODUCTO

// Producto seleccionado
window.agrolinkSelectedProduct = null;

// Cantidad seleccionada
window.agrolinkSelectedQuantity = 1;


// ABRIR DETALLE DEL PRODUCTO
function openProductDetail(productId) {

  const product = window.agrolinkCatalogProducts.find(
    item => item.id === productId
  );

  if (!product) {
    alert('No se encontró el producto seleccionado.');
    return;
  }

  window.agrolinkSelectedProduct = product;
  window.agrolinkSelectedQuantity = 1;

  const producer = product.producer || {};

  const icons = {
    'Frutas': '🍎',
    'Verduras': '🥬',
    'Tubérculos': '🥔',
    'Lácteos': '🧀',
    'Carnes': '🥩',
    'Granos': '🌾',
    'Pescados': '🐟',
    'Otros': '📦'
  };

  const unit = product.unit || 'unidad';

  const location = [
    producer.municipality,
    producer.department
  ].filter(Boolean).join(', ');

  // Mostrar información del producto
  document.getElementById('detail-image').textContent =
    icons[product.category] || '📦';

  document.getElementById('detail-name').textContent =
    product.name;

  document.getElementById('detail-category').textContent =
    product.category;

  document.getElementById('detail-price').textContent =
    '$' + Number(product.price).toLocaleString('es-CO') +
    ' / ' + unit;

  document.getElementById('detail-summary').textContent =
    'Producto disponible en AGROLINK.';

  document.getElementById('detail-description').textContent =
    product.description || 'El productor no ha registrado una descripción.';

  // Mostrar productor
  document.getElementById('detail-producer-name').textContent =
    producer.full_name || 'Productor AGROLINK';

  document.getElementById('detail-producer-location').textContent =
    '📍 ' + (location || 'Ubicación no registrada');

  // Mostrar disponibilidad
  document.getElementById('detail-unit-label').textContent =
    unit;

  actualizarDetalleCantidad();

  // Abrir pantalla
  go('s-product');

}


// ACTUALIZAR CANTIDAD Y SUBTOTAL
function actualizarDetalleCantidad() {

  const product = window.agrolinkSelectedProduct;

  if (!product) return;

  const quantity = window.agrolinkSelectedQuantity;

  const stock = Number(product.stock_quantity);

  const price = Number(product.price);

  const subtotal = price * quantity;

  document.getElementById('detail-quantity').textContent =
    quantity;

  document.getElementById('detail-stock').textContent =
    'Disponible: ' + stock + ' ' + product.unit;

  document.getElementById('detail-subtotal').textContent =
    '$' + subtotal.toLocaleString('es-CO');

}


// AUMENTAR O DISMINUIR CANTIDAD
function changeProductQuantity(change) {

  const product = window.agrolinkSelectedProduct;

  if (!product) return;

  const stock = Number(product.stock_quantity);

  const current = window.agrolinkSelectedQuantity;

  const next = current + change;

  if (next < 1) return;

  if (next > stock) {
    alert('No puedes solicitar más unidades de las disponibles.');
    return;
  }

  window.agrolinkSelectedQuantity = next;

  actualizarDetalleCantidad();

}


// ==========================================
// AGROLINK - CONSULTAR PERFIL PRODUCTOR
// ==========================================


async function loadProducerProfile() {

  const db = window.agrolinkSupabase;

  const message = document.getElementById('profile-message');

  if (!db) {
    message.textContent = 'No hay conexión con Supabase.';
    return;
  }

  message.textContent = 'Consultando perfil...';

  try {

    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión.');
    }

    // Consultar mediante la función segura de Supabase
    const { data: profiles, error } = await db
      .rpc('agrolink_get_my_producer_profile');

    if (error) throw error;

    const profile = profiles?.[0];

    if (!profile) {
      throw new Error('No se encontró el perfil del productor.');
    }

    if (profile.role !== 'producer') {
      throw new Error('Esta pantalla es exclusiva para productores.');
    }

    // Mostrar información personal
    document.getElementById('profile-full-name').textContent =
      profile.full_name || 'No registrado';

    document.getElementById('profile-phone').textContent =
      profile.phone || 'No registrado';

    document.getElementById('profile-municipality').textContent =
      profile.municipality || 'No registrado';

    document.getElementById('profile-department').textContent =
      profile.department || 'No registrado';

    // Cargar autorización actual
    document.getElementById('profile-phone-public').checked =
      profile.phone_public === true;

    message.textContent =
      'Perfil consultado correctamente.';

  } catch (error) {

    console.error('Error consultando perfil:', error);

    message.textContent =
      'No fue posible consultar el perfil: ' + error.message;

  }

}



// ==========================================
// AGROLINK - GUARDAR AUTORIZACION TELEFONO
// ==========================================

async function saveProducerContactPreference() {

  const db = window.agrolinkSupabase;

  const checkbox =
    document.getElementById('profile-phone-public');

  const button =
    document.getElementById('btn-save-profile');

  const message =
    document.getElementById('profile-message');

  if (!db || !checkbox || !button || !message) {
    console.error('No se encontraron los elementos del perfil.');
    return;
  }

  const authorized = checkbox.checked;

  button.disabled = true;
  button.textContent = 'GUARDANDO...';

  try {

    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión.');
    }

    // Actualizar mediante función segura de Supabase
    const { data, error } = await db.rpc(
      'agrolink_set_my_phone_public',
      {
        p_authorized: authorized
      }
    );

    if (error) throw error;

    if (data !== authorized) {
      throw new Error(
        'No se pudo confirmar el cambio de autorización.'
      );
    }

    message.textContent = authorized
      ? 'Autorización guardada. Tu teléfono podrá mostrarse a los compradores.'
      : 'Autorización retirada. Tu teléfono permanecerá privado.';

  } catch (error) {

    console.error(
      'Error guardando autorización:',
      error
    );

    message.textContent =
      'No fue posible guardar los cambios: ' + error.message;

    await loadProducerProfile();

  } finally {

    button.disabled = false;
    button.textContent = 'GUARDAR PREFERENCIA';

  }

}


// ==========================================
// AGROLINK - ABRIR CONTACTO DEL PRODUCTOR
// ==========================================

async function openProducerContact() {

  const db = window.agrolinkSupabase;
  const product = window.agrolinkSelectedProduct;

  const loading = document.getElementById('contact-loading');
  const directSection = document.getElementById('contact-direct-section');
  const requestSection = document.getElementById('contact-request-section');
  const feedback = document.getElementById('contact-feedback');

  if (!db) {
    alert('No hay conexión con Supabase.');
    return;
  }

  if (!product || !product.producer_id) {
    alert('No se encontró el producto o su productor.');
    return;
  }

  // Abrir pantalla de contacto
  go('s-contact');

  // Reiniciar visualización
  loading.style.display = 'block';
  directSection.style.display = 'none';
  requestSection.style.display = 'none';
  feedback.textContent = '';

  const producer = product.producer || {};

  // Mostrar información del producto y productor
  document.getElementById('contact-producer-name').textContent =
    producer.full_name || 'Productor AGROLINK';

  document.getElementById('contact-producer-location').textContent =
    'Ubicación: ' +
    [producer.municipality, producer.department]
      .filter(Boolean)
      .join(', ');

  document.getElementById('contact-product-name').textContent =
    'Producto: ' + product.name;

  document.getElementById('contact-request-unit').textContent =
    product.unit || 'unidad';

  const quantityInput =
    document.getElementById('contact-request-quantity');

  const stock = Number(product.stock_quantity);

  quantityInput.min = '0.01';
  quantityInput.max = String(stock);
  quantityInput.step = '0.01';

  quantityInput.value = String(
    Math.min(
      Number(window.agrolinkSelectedQuantity) || 1,
      stock
    )
  );

  document.getElementById('contact-request-message').value = '';

  try {

    // 1. Verificar usuario autenticado
    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión como comprador.');
    }

    // 2. Verificar rol del usuario
    const { data: profile, error: profileError } =
      await db
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single();

    if (profileError) throw profileError;

    if (profile.role !== 'consumer') {
      throw new Error('Esta opción es exclusiva para compradores.');
    }

    // 3. Consultar contacto autorizado del productor
    const { data: contactData, error: contactError } =
      await db.rpc(
        'agrolink_get_producer_contact',
        {
          p_producer_id: product.producer_id
        }
      );

    if (contactError) throw contactError;

    const contact = Array.isArray(contactData)
      ? contactData[0]
      : contactData;

    // 4. Si autorizó mostrar su teléfono
    if (contact && contact.phone && String(contact.phone).trim()) {

      const phone = String(contact.phone).trim();

      const telNumber = phone.replace(/[^\d+]/g, '');

      let whatsappNumber = phone.replace(/\D/g, '');

      if (whatsappNumber.startsWith('00')) {
        whatsappNumber = whatsappNumber.substring(2);
      }

      // Agregar indicativo de Colombia si tiene 10 dígitos
      if (whatsappNumber.length === 10) {
        whatsappNumber = '57' + whatsappNumber;
      }

      document.getElementById('contact-producer-name').textContent =
        contact.full_name || producer.full_name || 'Productor AGROLINK';

      document.getElementById('contact-producer-location').textContent =
        'Ubicación: ' +
        [contact.municipality, contact.department]
          .filter(Boolean)
          .join(', ');

      document.getElementById('contact-phone').textContent = phone;

      document.getElementById('contact-call').href =
        'tel:' + telNumber;

      const whatsappMessage =
        'Hola, estoy interesado en el producto ' +
        product.name + ' publicado en AGROLINK.';

      document.getElementById('contact-whatsapp').href =
        'https://wa.me/' +
        whatsappNumber +
        '?text=' +
        encodeURIComponent(whatsappMessage);

      directSection.style.display = 'block';

      loading.style.display = 'none';

    } else {

      // 5. Si el productor mantiene privado su teléfono
      requestSection.style.display = 'block';

      loading.style.display = 'none';

    }

  } catch (error) {

    console.error('Error consultando contacto:', error);

    loading.textContent =
      'No fue posible consultar el contacto: ' + error.message;

  }

}


// ==========================================
// AGROLINK - ENVIAR SOLICITUD DE INTERES
// ==========================================

async function submitContactRequest() {

  const db = window.agrolinkSupabase;

  const product = window.agrolinkSelectedProduct;

  const button =
    document.getElementById('btn-send-contact-request');

  const feedback =
    document.getElementById('contact-feedback');

  const quantityInput =
    document.getElementById('contact-request-quantity');

  const messageInput =
    document.getElementById('contact-request-message');

  if (!db || !product) {
    feedback.textContent =
      'No se encontró la información del producto.';
    return;
  }

  const quantity = Number(quantityInput.value);

  const stock = Number(product.stock_quantity);

  const message = messageInput.value.trim();

  // Validar cantidad
  if (!Number.isFinite(quantity) || quantity <= 0) {

    feedback.textContent =
      'Ingresa una cantidad válida.';

    return;
  }

  if (quantity > stock) {

    feedback.textContent =
      'La cantidad solicitada supera las existencias disponibles.';

    return;
  }

  if (message.length > 1000) {

    feedback.textContent =
      'El mensaje no puede superar los 1000 caracteres.';

    return;
  }

  button.disabled = true;
  button.textContent = 'ENVIANDO SOLICITUD...';

  feedback.textContent = 'Registrando solicitud...';

  try {

    // 1. Identificar comprador autenticado
    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión.');
    }

    const user = userData.user;

    // 2. Registrar solicitud en Supabase
    const { error } = await db
      .from('contact_requests')
      .insert({

        buyer_id: user.id,

        producer_id: product.producer_id,

        product_id: product.id,

        product_name: product.name,

        quantity: quantity,

        unit: product.unit,

        price_at_request: Number(product.price),

        message: message || null

      });

    if (error) throw error;

    // 3. Confirmar registro
    feedback.textContent =
      '¡Solicitud enviada correctamente! El productor podrá consultarla desde su panel de AGROLINK.';

    messageInput.value = '';

  } catch (error) {

    console.error('Error enviando solicitud:', error);

    feedback.textContent =
      'No fue posible enviar la solicitud: ' + error.message;

  } finally {

    button.disabled = false;

    button.textContent =
      'ENVIAR SOLICITUD DE INTERÉS';

  }

}


// ==========================================
// AGROLINK - CONSULTAR SOLICITUDES RECIBIDAS
// ==========================================

async function loadProducerRequests() {

  const db = window.agrolinkSupabase;

  const message = document.getElementById(
    'producer-requests-message'
  );

  const container = document.getElementById(
    'producer-requests-list'
  );

  if (!db || !message || !container) return;

  message.textContent = 'Consultando solicitudes...';
  container.replaceChildren();

  try {

    // 1. Identificar productor autenticado
    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión.');
    }

    // 2. Verificar que sea productor
    const { data: profile, error: profileError } =
      await db
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single();

    if (profileError) throw profileError;

    if (profile.role !== 'producer') {
      throw new Error(
        'Esta pantalla es exclusiva para productores.'
      );
    }

    // 3. Consultar solicitudes mediante RPC
    const { data: requests, error } =
      await db.rpc(
        'agrolink_get_my_contact_requests'
      );

    if (error) throw error;

    // 4. Verificar si existen solicitudes
    if (!requests || requests.length === 0) {

      message.textContent =
        'Todavía no tienes solicitudes de interés recibidas.';

      return;
    }

    // 5. Crear tarjetas de solicitudes
    requests.forEach(request => {

      const card = document.createElement('div');
      card.className = 'wire-card mb-12';

      // Encabezado
      const header = document.createElement('div');
      header.className = 'row-between mb-8';

      const title = document.createElement('div');
      title.className = 'text-bold';
      title.textContent =
        request.product_name || 'Producto';

      const status = document.createElement('span');
      status.className = 'wire-tag';

      const statusLabels = {
        pending: 'Pendiente',
        accepted: 'Aceptada',
        rejected: 'Rechazada'
      };

      status.textContent =
        statusLabels[request.status] || request.status;

      header.appendChild(title);
      header.appendChild(status);

      card.appendChild(header);

      // Función para agregar información
      function addRequestField(label, value) {

        const field = document.createElement('div');
        field.className = 'text-sm mb-8';

        const strong = document.createElement('strong');
        strong.textContent = label + ': ';

        field.appendChild(strong);
        field.appendChild(
          document.createTextNode(String(value ?? 'No registrado'))
        );

        card.appendChild(field);
      }

      // Datos de la solicitud
      addRequestField(
        'Comprador',
        request.buyer_name
      );

      addRequestField(
        'Cantidad solicitada',
        Number(request.quantity).toLocaleString('es-CO') +
        ' ' + (request.unit || 'unidad')
      );

      const price = Number(request.price_at_request);
      const quantity = Number(request.quantity);

      addRequestField(
        'Precio por unidad',
        '$' + price.toLocaleString('es-CO')
      );

      addRequestField(
        'Valor estimado',
        '$' + (price * quantity).toLocaleString('es-CO')
      );

      // Mensaje del comprador
      const messageLabel = document.createElement('div');
      messageLabel.className = 'wire-label';
      messageLabel.textContent = 'Mensaje del comprador';

      card.appendChild(messageLabel);

      const buyerMessage = document.createElement('p');
      buyerMessage.className = 'text-sm mb-12';
      buyerMessage.style.lineHeight = '1.6';
      buyerMessage.style.whiteSpace = 'pre-wrap';

      buyerMessage.textContent =
        request.message || 'El comprador no dejó un mensaje.';

      card.appendChild(buyerMessage);

      // Fecha de recepción
      const date = new Date(request.created_at);

      addRequestField(
        'Fecha de recepción',
        Number.isNaN(date.getTime())
          ? 'No disponible'
          : date.toLocaleString('es-CO')
      );

      // 6. Botones para gestionar solicitudes pendientes
      if (request.status === 'pending') {

        const acceptButton = document.createElement('button');

        acceptButton.type = 'button';
        acceptButton.className = 'wire-btn';

        acceptButton.textContent = 'ACEPTAR SOLICITUD';

        acceptButton.onclick = () =>
          updateProducerRequestStatus(
            request.request_id,
            'accepted',
            acceptButton
          );

        card.appendChild(acceptButton);

        const rejectButton = document.createElement('button');

        rejectButton.type = 'button';
        rejectButton.className = 'wire-btn wire-btn-outline';

        rejectButton.textContent = 'RECHAZAR SOLICITUD';

        rejectButton.onclick = () =>
          updateProducerRequestStatus(
            request.request_id,
            'rejected',
            rejectButton
          );

        card.appendChild(rejectButton);

      }

      container.appendChild(card);

    });

    message.textContent =
      'Solicitudes consultadas correctamente: ' +
      requests.length + '.';

  } catch (error) {

    console.error(
      'Error consultando solicitudes:',
      error
    );

    message.textContent =
      'No fue posible consultar las solicitudes: ' +
      error.message;

  }

}



// ==========================================
// AGROLINK - ACEPTAR O RECHAZAR SOLICITUD
// CON AUTORIZACION DE CONTACTO
// ==========================================

async function updateProducerRequestStatus(
  requestId,
  newStatus,
  button
) {

  const db = window.agrolinkSupabase;

  const message = document.getElementById(
    'producer-requests-message'
  );

  if (!db) return;

  if (!['accepted', 'rejected'].includes(newStatus)) {
    return;
  }

  // 1. Confirmar operación
  const confirmation = newStatus === 'accepted'
    ? '¿Deseas aceptar esta solicitud?'
    : '¿Deseas rechazar esta solicitud?';

  if (!window.confirm(confirmation)) {
    return;
  }

  // 2. Solicitar autorización telefónica
  let phoneShareAuthorized = false;

  if (newStatus === 'accepted') {

    phoneShareAuthorized = window.confirm(
      '¿Autorizas compartir tu número de teléfono ' +
      'con este comprador?\n\n' +
      'Aceptar: compartir el teléfono.\n' +
      'Cancelar: aceptar la solicitud sin compartirlo.'
    );

  }

  const originalText = button
    ? button.textContent
    : '';

  if (button) {
    button.disabled = true;
    button.textContent = 'PROCESANDO...';
  }

  try {

    // 3. Actualizar estado y autorización mediante RPC
    const { data, error } = await db.rpc(
      'agrolink_update_contact_request_status_with_consent',
      {
        p_request_id: requestId,
        p_new_status: newStatus,
        p_phone_share_authorized: phoneShareAuthorized
      }
    );

    if (error) throw error;

    if (data !== true) {
      throw new Error(
        'No fue posible actualizar la solicitud.'
      );
    }

    // 4. Actualizar listado
    await loadProducerRequests();

    if (message) {

      if (newStatus === 'accepted') {

        message.textContent = phoneShareAuthorized
          ? 'Solicitud aceptada. Autorizaste compartir tu teléfono con este comprador.'
          : 'Solicitud aceptada. Tu teléfono permanecerá privado para este comprador.';

      } else {

        message.textContent =
          'Solicitud rechazada correctamente.';

      }

    }

  } catch (error) {

    console.error(
      'Error gestionando solicitud:',
      error
    );

    if (message) {
      message.textContent =
        'No fue posible gestionar la solicitud: ' +
        error.message;
    }

  } finally {

    if (button && button.isConnected) {
      button.disabled = false;
      button.textContent = originalText;
    }

  }

}




// ==========================================
// AGROLINK - CONSULTAR MIS SOLICITUDES
// CON CONTACTO AUTORIZADO DEL PRODUCTOR
// ==========================================

async function loadMySentContactRequests() {

  const db = window.agrolinkSupabase;

  const message = document.getElementById(
    'consumer-requests-message'
  );

  const container = document.getElementById(
    'consumer-requests-list'
  );

  if (!db || !message || !container) return;

  message.textContent = 'Consultando tus solicitudes...';
  container.replaceChildren();

  try {

    // 1. Identificar comprador autenticado
    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Debes iniciar sesión.');
    }

    // 2. Verificar rol
    const { data: profile, error: profileError } =
      await db
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single();

    if (profileError) throw profileError;

    if (profile.role !== 'consumer') {
      throw new Error(
        'Esta pantalla es exclusiva para compradores.'
      );
    }

    // 3. Consultar solicitudes
    const { data: requests, error } =
      await db.rpc(
        'agrolink_get_my_sent_contact_requests'
      );

    if (error) throw error;

    // 4. Verificar resultados
    if (!requests || requests.length === 0) {

      message.textContent =
        'Todavía no has enviado solicitudes de interés.';

      return;
    }

    // 5. Crear tarjetas
    for (const request of requests) {

      const card = document.createElement('div');
      card.className = 'wire-card mb-12';

      // Encabezado
      const header = document.createElement('div');
      header.className = 'row-between mb-8';

      const title = document.createElement('div');
      title.className = 'text-bold';
      title.textContent =
        request.product_name || 'Producto';

      const status = document.createElement('span');
      status.className = 'wire-tag';

      const statusLabels = {
        pending: 'Pendiente',
        accepted: 'Aceptada',
        rejected: 'Rechazada'
      };

      status.textContent =
        statusLabels[request.status] || request.status;

      header.appendChild(title);
      header.appendChild(status);

      card.appendChild(header);

      // Información de la solicitud
      function addField(label, value) {

        const field = document.createElement('div');
        field.className = 'text-sm mb-8';

        const strong = document.createElement('strong');
        strong.textContent = label + ': ';

        field.appendChild(strong);

        field.appendChild(
          document.createTextNode(
            String(value ?? 'No registrado')
          )
        );

        card.appendChild(field);
      }

      // Productor
      addField(
        'Productor',
        request.producer_name
      );

      const location = [
        request.producer_municipality,
        request.producer_department
      ].filter(Boolean).join(', ');

      addField(
        'Ubicación',
        location || 'No registrada'
      );

      // Cantidad y valores
      const quantity = Number(request.quantity);
      const price = Number(request.price_at_request);

      addField(
        'Cantidad solicitada',
        quantity.toLocaleString('es-CO') +
        ' ' + (request.unit || 'unidad')
      );

      addField(
        'Precio por unidad',
        '$' + price.toLocaleString('es-CO')
      );

      addField(
        'Valor estimado',
        '$' + (quantity * price).toLocaleString('es-CO')
      );

      // Mensaje enviado
      const messageLabel = document.createElement('div');
      messageLabel.className = 'wire-label';
      messageLabel.textContent = 'Mensaje enviado';

      card.appendChild(messageLabel);

      const buyerMessage = document.createElement('p');
      buyerMessage.className = 'text-sm mb-12';
      buyerMessage.style.lineHeight = '1.6';
      buyerMessage.style.whiteSpace = 'pre-wrap';

      buyerMessage.textContent =
        request.message || 'Sin mensaje adicional.';

      card.appendChild(buyerMessage);

      // Fecha de solicitud
      const date = new Date(request.created_at);

      addField(
        'Fecha de solicitud',
        Number.isNaN(date.getTime())
          ? 'No disponible'
          : date.toLocaleString('es-CO')
      );

      // 6. Información según el estado
      const response = document.createElement('div');
      response.className = 'annotation';

      if (request.status === 'accepted') {

        response.textContent =
          'El productor ha aceptado tu solicitud de interés.';

      } else if (request.status === 'rejected') {

        response.textContent =
          'El productor ha rechazado tu solicitud de interés.';

      } else {

        response.textContent =
          'Tu solicitud está pendiente de respuesta del productor.';

      }

      card.appendChild(response);

      // =====================================
      // 7. CONTACTO SI EXISTE AUTORIZACIÓN
      // =====================================

      if (request.status === 'accepted') {

        let contact = null;
        let contactLookupFailed = false;

        try {

          const { data: contactData, error: contactError } =
            await db.rpc(
              'agrolink_get_my_accepted_request_contact',
              {
                p_request_id: request.request_id
              }
            );

          if (contactError) throw contactError;

          contact = Array.isArray(contactData)
            ? contactData[0]
            : contactData;

        } catch (contactError) {

          console.error(
            'Error consultando contacto autorizado:',
            contactError
          );

          contactLookupFailed = true;

        }

        if (contactLookupFailed) {

          const contactMessage =
            document.createElement('div');

          contactMessage.className = 'annotation';

          contactMessage.textContent =
            'No fue posible consultar el contacto. ' +
            'Intenta actualizar tus solicitudes.';

          card.appendChild(contactMessage);

        } else if (
          contact &&
          contact.phone &&
          String(contact.phone).trim()
        ) {

          const phone = String(contact.phone).trim();

          const phoneForCall =
            phone.replace(/[^\d+]/g, '');

          let whatsappNumber =
            phone.replace(/\D/g, '');

          if (whatsappNumber.startsWith('00')) {
            whatsappNumber =
              whatsappNumber.substring(2);
          }

          // Agregar indicativo de Colombia
          if (whatsappNumber.length === 10) {
            whatsappNumber = '57' + whatsappNumber;
          }

          // Crear sección de contacto
          const contactSection =
            document.createElement('div');

          contactSection.className = 'wire-card mb-12';
          contactSection.style.marginTop = '14px';

          const contactTitle =
            document.createElement('div');

          contactTitle.className = 'wire-label';
          contactTitle.textContent =
            'CONTACTO DEL PRODUCTOR';

          contactSection.appendChild(contactTitle);

          const producerName =
            document.createElement('div');

          producerName.className = 'text-bold mb-8';

          producerName.textContent =
            contact.full_name ||
            request.producer_name ||
            'Productor AGROLINK';

          contactSection.appendChild(producerName);

          const phoneLabel =
            document.createElement('div');

          phoneLabel.className = 'text-sm mb-12';

          phoneLabel.textContent =
            'Teléfono: ' + phone;

          contactSection.appendChild(phoneLabel);

          // Botón WhatsApp
          if (whatsappNumber.length >= 10) {

            const whatsappLink =
              document.createElement('a');

            const whatsappMessage =
              'Hola, mi solicitud de ' +
              request.product_name +
              ' en AGROLINK fue aceptada. ' +
              'Quisiera coordinar los detalles.';

            whatsappLink.href =
              'https://wa.me/' +
              whatsappNumber +
              '?text=' +
              encodeURIComponent(whatsappMessage);

            whatsappLink.target = '_blank';
            whatsappLink.rel = 'noopener noreferrer';

            whatsappLink.className = 'wire-btn';

            whatsappLink.style.display = 'block';
            whatsappLink.style.textAlign = 'center';
            whatsappLink.style.textDecoration = 'none';
            whatsappLink.style.marginTop = '10px';

            whatsappLink.textContent =
              'CONTACTAR POR WHATSAPP';

            contactSection.appendChild(whatsappLink);

          }

          // Botón llamada
          if (phoneForCall) {

            const callLink =
              document.createElement('a');

            callLink.href =
              'tel:' + phoneForCall;

            callLink.className =
              'wire-btn wire-btn-outline';

            callLink.style.display = 'block';
            callLink.style.textAlign = 'center';
            callLink.style.textDecoration = 'none';
            callLink.style.marginTop = '10px';

            callLink.textContent =
              'LLAMAR AL PRODUCTOR';

            contactSection.appendChild(callLink);

          }

          card.appendChild(contactSection);

        } else {

          const privateMessage =
            document.createElement('div');

          privateMessage.className = 'annotation';

          privateMessage.textContent =
            'El productor aceptó tu solicitud, ' +
            'pero el contacto telefónico no está ' +
            'disponible para esta solicitud.';

          card.appendChild(privateMessage);

        }

      }

      container.appendChild(card);

    }

    message.textContent =
      'Solicitudes consultadas correctamente: ' +
      requests.length + '.';

  } catch (error) {

    console.error(
      'Error consultando mis solicitudes:',
      error
    );

    message.textContent =
      'No fue posible consultar tus solicitudes: ' +
      error.message;

  }

}



/* ==========================================
   AGROLINK - NAVEGACION GLOBAL
========================================== */

function go(id) {

  const target = document.getElementById(id);

  if (!target) {
    console.error('No existe la pantalla:', id);
    return;
  }

  document.querySelectorAll('.screen')
    .forEach(screen => screen.classList.remove('active'));

  target.classList.add('active');

  window.scrollTo(0, 0);

  if (id === 's-my-products') {
    loadMyProducts();
  }

  if (id === 's-home') {
    loadCatalog();
  }

  if (id === 's-producer-profile') {
    loadProducerProfile();
  }

  if (id === 's-producer-requests') {
    loadProducerRequests();
  }

  if (id === 's-consumer-requests') {
    loadMySentContactRequests();
  }

}

// Hacer accesible la función desde los botones HTML
window.go = go;


/* ==========================================
   AGROLINK - SELECCIONAR TIPO DE USUARIO
========================================== */

window.selectChip = function(activeId, otherId) {

  const activeChip = document.getElementById(activeId);
  const otherChip = document.getElementById(otherId);

  if (!activeChip || !otherChip) {
    console.error('No se encontraron los botones de selección.');
    return;
  }

  activeChip.classList.add('active');
  otherChip.classList.remove('active');

};
