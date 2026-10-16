const listaTareas = document.getElementById("lista-tareas");
const estadoTareas = document.getElementById("estado-tareas");
const formulario = document.getElementById("form-tarea");
const inputTitulo = document.getElementById("titulo");
const estadoConexion = document.getElementById("estado-conexion");


// ==============================
// ESTADO DE CONEXIÓN
// ==============================

function actualizarEstadoConexion() {
    if (navigator.onLine) {
        estadoConexion.textContent = "🟢 En línea";
    } else {
        estadoConexion.textContent = "🔴 Sin conexión";
    }
}

window.addEventListener("offline", actualizarEstadoConexion);

actualizarEstadoConexion();


// ==============================
// CARGAR TAREAS
// ==============================

async function cargarTareas() {
    try {
        const respuesta = await fetch(
            "https://jsonplaceholder.typicode.com/todos?_limit=10"
        );

        if (!respuesta.ok) {
            throw new Error("No se pudieron obtener las tareas");
        }

        const tareas = await respuesta.json();

        // Guardar copia de la API en IndexedDB
        await guardarTareas(tareas);

        // Leer todo desde IndexedDB
        const todasLasTareas = await obtenerTareasLocales();

        mostrarTareas(todasLasTareas);

        console.log(
            "Tareas obtenidas de Internet y guardadas localmente."
        );

    } catch (error) {

        console.warn(
            "Sin acceso a la API. Buscando tareas locales..."
        );

        try {
            const tareasLocales = await obtenerTareasLocales();

            if (tareasLocales.length > 0) {

                mostrarTareas(tareasLocales);

                console.log(
                    "Tareas cargadas desde IndexedDB."
                );

            } else {

                estadoTareas.textContent =
                    "No existen tareas almacenadas localmente.";
            }

        } catch (errorLocal) {

            estadoTareas.textContent =
                "No se pudieron cargar las tareas.";

            console.error(errorLocal);
        }
    }
}


// ==============================
// MOSTRAR TAREAS
// ==============================

function mostrarTareas(tareas) {

    listaTareas.innerHTML = "";
    estadoTareas.textContent = tareas.length
        ? `${tareas.length} tareas guardadas.`
        : "No existen tareas almacenadas localmente.";

    tareas.forEach(tarea => {

        const elemento = document.createElement("li");

        elemento.textContent =
            `${tarea.completed ? "✅" : "⬜"} ${tarea.title}`;

        // Mostrar estado de sincronización
        if (tarea.sincronizada === false) {

            const estado = document.createElement("span");

            estado.textContent =
                " 🟠 Pendiente de sincronización";

            estado.classList.add("pendiente");

            elemento.appendChild(estado);
        }

        listaTareas.appendChild(elemento);
    });
}


// ==============================
// CREAR NUEVA TAREA
// ==============================

formulario.addEventListener(
    "submit",
    async function (evento) {

        evento.preventDefault();

        const titulo = inputTitulo.value.trim();

        if (titulo === "") {
            return;
        }

        const nuevaTarea = {
            id: Date.now(),
            userId: 1,
            title: titulo,
            completed: false,
            sincronizada: false
        };

        // Guardar primero localmente
        await guardarTarea(nuevaTarea);

        const tareas =
            await obtenerTareasLocales();

        mostrarTareas(tareas);

        inputTitulo.value = "";

        console.log(
            "Nueva tarea guardada localmente:",
            nuevaTarea
        );

        // Si hay Internet, intentar sincronizar inmediatamente
        if (navigator.onLine) {
            await sincronizarTareasPendientes();
        }
    }
);


// ==============================
// SINCRONIZACIÓN
// ==============================

async function sincronizarTareasPendientes() {

    if (!navigator.onLine) {
        console.log(
            "Sin conexión. La sincronización queda pendiente."
        );

        return;
    }

    const tareas =
        await obtenerTareasLocales();

    const pendientes = tareas.filter(
        tarea => tarea.sincronizada === false
    );

    console.log(
        "Tareas pendientes encontradas:",
        pendientes.length
    );

    for (const tarea of pendientes) {

        try {

            const respuesta = await fetch(
                "https://jsonplaceholder.typicode.com/todos",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        userId: tarea.userId,
                        title: tarea.title,
                        completed: tarea.completed
                    })
                }
            );

            if (!respuesta.ok) {
                throw new Error(
                    "Error al sincronizar la tarea"
                );
            }

            const resultado =
                await respuesta.json();

            console.log(
                "Tarea enviada a la API:",
                resultado
            );

            // Marcar tarea como sincronizada
            tarea.sincronizada = true;

            await guardarTarea(tarea);

        } catch (error) {

            console.error(
                "No se pudo sincronizar:",
                tarea.title,
                error
            );
        }
    }

    // Actualizar interfaz
    const tareasActualizadas =
        await obtenerTareasLocales();

    mostrarTareas(tareasActualizadas);
}


// ==============================
// CUANDO REGRESA INTERNET
// ==============================

window.addEventListener(
    "online",
    async function () {

        actualizarEstadoConexion();

        console.log(
            "Conexión recuperada. Iniciando sincronización..."
        );

        await sincronizarTareasPendientes();
    }
);


// ==============================
// SERVICE WORKER
// ==============================

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        function () {

            navigator.serviceWorker
                .register("./sw.js")

                .then(function () {

                    console.log(
                        "Service Worker registrado correctamente."
                    );

                })

                .catch(function (error) {

                    console.error(
                        "Error al registrar el Service Worker:",
                        error
                    );
                });
        }
    );
}


// ==============================
// INICIAR APLICACIÓN
// ==============================

async function iniciarAplicacion() {

    await cargarTareas();

    if (navigator.onLine) {

        console.log(
            "Hay conexión. Revisando tareas pendientes..."
        );

        await sincronizarTareasPendientes();
    }
}

iniciarAplicacion();