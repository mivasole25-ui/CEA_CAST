// ===============================
// IMPORTACIÃ“N DE LIBRERÃAS
// ===============================

// Importa el mÃ³dulo HTTP de k6
// Se usa para enviar solicitudes GET, POST, PUT, DELETE, etc.
import http from "k6/http";

// Importa funciones auxiliares:
// check -> valida condiciones
// sleep -> pausa entre solicitudes
import { check, sleep } from "k6";


// ===============================
// CONFIGURACIÃ“N DE LA PRUEBA
// ===============================

export const options = {

  // stages permite definir etapas de carga
  // Cada etapa tiene:
  // duration -> cuÃ¡nto dura
  // target -> cantidad de usuarios virtuales (VUs)

  stages: [

    // Primera etapa:
    // Durante 1 minuto aumentarÃ¡ hasta 10 usuarios
    { duration: "1m", target: 10 },

    // Segunda etapa:
    // Aumenta hasta 30 usuarios
    { duration: "1m", target: 30 },

    // Tercera etapa:
    // Aumenta hasta 50 usuarios
    { duration: "1m", target: 50 },

    // Cuarta etapa:
    // Aumenta hasta 100 usuarios simultÃ¡neos
    { duration: "1m", target: 100 },

    // Quinta etapa:
    // Reduce usuarios gradualmente hasta 0
    { duration: "1m", target: 0 },
  ],
};


// ===============================
// FUNCIÃ“N PRINCIPAL DE LA PRUEBA
// ===============================

// Esta funciÃ³n la ejecuta cada usuario virtual
export default function () {

  // EnvÃ­a una solicitud GET al servidor local
  // En este caso prueba el endpoint principal "/"
  const res = http.get("http://localhost:3000/");


  // ===============================
  // VALIDACIONES
  // ===============================

  // check verifica condiciones de la respuesta
  // Si alguna falla, aparecerÃ¡ en estadÃ­sticas

  check(res, {

    // Valida que el cÃ³digo HTTP sea 200
    "respuesta 200": (r) => r.status === 200,

    // Valida que la respuesta tarde menos de 2 segundos
    "menos de 2 segundos": (r) => r.timings.duration < 2000,
  });


  // ===============================
  // PAUSA ENTRE PETICIONES
  // ===============================

  // Hace que el usuario espere 1 segundo
  // antes de enviar otra solicitud
  // Esto simula comportamiento humano real
  sleep(1);
}