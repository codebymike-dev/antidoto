// Con señal débil una petición puede quedarse colgada sin fallar nunca. Esto la convierte
// en un fallo a los `ms` para poder avisar y reintentar. La petición original no se cancela:
// quien reintente debe poder repetirla sin efectos dobles (las respuestas del jugador ya
// son idempotentes: la primera que llega al servidor es la que vale).

export class TimeoutError extends Error {
  constructor() {
    super("La petición tardó demasiado");
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
