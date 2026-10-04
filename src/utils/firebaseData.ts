/** As entidades do Flow são JSON; remove campos opcionais que o Firestore rejeita. */
export const toFirestoreData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
