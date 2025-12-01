/**
 * Genera un identificador aleatorio combinando un valor random y la fecha actual.
 * Ejemplo de salida: "k9x81q4lnb174030982d9"
 */
const generarId = (): string => {
  const random = Math.random().toString(32).substring(2);
  const fecha = Date.now().toString(32);
  return random + fecha;
};

export default generarId;
